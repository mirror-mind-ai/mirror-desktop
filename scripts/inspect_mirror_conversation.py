#!/usr/bin/env python3
"""Read one bounded native Mirror conversation tail for Nautilus reconciliation."""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

DEFAULT_DB = Path.home() / ".mirror-minds" / "alisson-vale" / "memory.db"
MAX_TAIL_MESSAGES = 20
MAX_MESSAGE_CHARS = 20_000
MAX_TOTAL_CHARS = 100_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--journey-id", required=True)
    parser.add_argument("--conversation-id", required=True)
    parser.add_argument("--base-message-id", required=True)
    parser.add_argument("--base-message-count", required=True, type=int)
    parser.add_argument("--limit", type=int, default=MAX_TAIL_MESSAGES)
    return parser.parse_args()


def safe_metadata(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def allowlisted_correlation(raw: str | None, role: str) -> dict[str, Any] | None:
    value = safe_metadata(raw).get("nautilus")
    if not isinstance(value, dict) or value.get("phase") != role:
        return None
    harness_key = "harnessUserMessageId" if role == "user" else "harnessAssistantMessageId"
    required = {
        "turnId": value.get("turnId"),
        "phase": role,
        "generation": value.get("generation"),
        "piSessionId": value.get("piSessionId"),
        "harnessMessageId": value.get(harness_key),
    }
    if (
        not all(isinstance(required[key], str) and required[key] for key in ["turnId", "piSessionId", "harnessMessageId"])
        or not isinstance(required["generation"], int)
    ):
        return None
    return required


def inspect_conversation(
    conn: sqlite3.Connection,
    *,
    journey_id: str,
    conversation_id: str,
    base_message_id: str,
    base_message_count: int,
    limit: int = MAX_TAIL_MESSAGES,
) -> dict[str, Any]:
    conversation = conn.execute(
        "select id, journey from conversations where id = ?", (conversation_id,)
    ).fetchone()
    if conversation is None or conversation[1] != journey_id:
        return conflict(journey_id, conversation_id, base_message_id, base_message_count, "mirror_conversation_mismatch")
    if base_message_count < 1 or limit < 1 or limit > MAX_TAIL_MESSAGES:
        return conflict(journey_id, conversation_id, base_message_id, base_message_count, "invalid_observation_boundary")

    count = conn.execute("select count(*) from messages where conversation_id = ?", (conversation_id,)).fetchone()[0]
    if count < base_message_count:
        return conflict(journey_id, conversation_id, base_message_id, base_message_count, "checkpoint_regression")
    cursor = conn.execute(
        """
        select id from messages where conversation_id = ?
        order by created_at asc, id asc limit 1 offset ?
        """,
        (conversation_id, base_message_count - 1),
    ).fetchone()
    if cursor is None or cursor[0] != base_message_id:
        return conflict(journey_id, conversation_id, base_message_id, base_message_count, "mirror_cursor_mismatch")

    last = conn.execute(
        """
        select id, created_at from messages where conversation_id = ?
        order by created_at desc, id desc limit 1
        """,
        (conversation_id,),
    ).fetchone()
    fingerprint = {
        "conversationId": conversation_id,
        "messageCount": count,
        "lastMessageId": last[0],
        "updatedAt": last[1],
    }
    base = {
        "journeyId": journey_id,
        "conversationId": conversation_id,
        "baseMessageId": base_message_id,
        "baseMessageCount": base_message_count,
        "fingerprint": fingerprint,
    }
    if count == base_message_count:
        return {"status": "unchanged", **base}
    if count - base_message_count > limit:
        return {"status": "conflicted", "reasonCode": "tail_overflow", **base}

    rows = conn.execute(
        """
        select id, role, content, created_at, metadata from messages
        where conversation_id = ? order by created_at asc, id asc limit ? offset ?
        """,
        (conversation_id, limit, base_message_count),
    ).fetchall()
    total_chars = 0
    messages = []
    for message_id, role, content, created_at, metadata in rows:
        content = content or ""
        remaining = max(0, MAX_TOTAL_CHARS - total_chars)
        allowed = min(MAX_MESSAGE_CHARS, remaining)
        projected = content[:allowed]
        truncated = len(projected) != len(content)
        total_chars += len(projected)
        item: dict[str, Any] = {
            "id": message_id,
            "role": role,
            "content": projected,
            "createdAt": created_at,
        }
        if truncated:
            item["boundaryTruncated"] = True
        correlation = allowlisted_correlation(metadata, role)
        if correlation:
            item["correlation"] = correlation
        messages.append(item)
    return {"status": "advanced", "messages": messages, **base}


def conflict(journey_id: str, conversation_id: str, base_message_id: str, base_message_count: int, reason: str) -> dict[str, Any]:
    return {
        "status": "conflicted",
        "journeyId": journey_id,
        "conversationId": conversation_id,
        "baseMessageId": base_message_id,
        "baseMessageCount": base_message_count,
        "fingerprint": {"conversationId": conversation_id, "messageCount": 0, "lastMessageId": ""},
        "reasonCode": reason,
    }


def main() -> int:
    args = parse_args()
    uri = f"file:{args.db.resolve()}?mode=ro"
    with sqlite3.connect(uri, uri=True) as conn:
        result = inspect_conversation(
            conn,
            journey_id=args.journey_id,
            conversation_id=args.conversation_id,
            base_message_id=args.base_message_id,
            base_message_count=args.base_message_count,
            limit=args.limit,
        )
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
