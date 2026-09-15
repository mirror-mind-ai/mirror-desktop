#!/usr/bin/env python3
"""Bounded Mirror history metadata and manual title operations for Mirror Desktop."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

MAX_CATALOG_LIMIT = 100
MAX_TITLE_CHARS = 160
JOURNEY_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$")
IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{10,255}$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=("catalog", "inspect", "rename"))
    parser.add_argument("--journey-id", required=True)
    parser.add_argument("--conversation-id")
    parser.add_argument("--title")
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--mirror-root", type=Path, required=True)
    parser.add_argument("--mirror-home", type=Path, required=True)
    return parser.parse_args()


def fail(operation: str, journey_id: str, reason: str) -> None:
    print(json.dumps({
        "schemaVersion": "1.0.0",
        "operation": operation,
        "status": "rejected",
        "journeyId": journey_id,
        "reason": reason,
    }, ensure_ascii=False, separators=(",", ":")))
    raise SystemExit(2)


def exact_conversation(mem: object, args: argparse.Namespace) -> object:
    if not isinstance(args.conversation_id, str) or not IDENTIFIER_RE.fullmatch(args.conversation_id):
        fail(args.operation, args.journey_id, "invalid_conversation_id")
    conversation = mem.conversations.find_by_id_prefix(args.conversation_id)
    if conversation is None or conversation.id != args.conversation_id:
        fail(args.operation, args.journey_id, "conversation_unavailable")
    if conversation.journey != args.journey_id:
        fail(args.operation, args.journey_id, "conversation_unavailable")
    return conversation


def main() -> None:
    args = parse_args()
    if not JOURNEY_RE.fullmatch(args.journey_id):
        fail(args.operation, args.journey_id, "invalid_journey_id")
    if args.limit < 1 or args.limit > MAX_CATALOG_LIMIT:
        fail(args.operation, args.journey_id, "limit_exceeded")
    mirror_src = args.mirror_root / "src"
    if not mirror_src.is_dir():
        fail(args.operation, args.journey_id, "runtime_unavailable")
    sys.path.insert(0, str(mirror_src))
    from memory import MemoryClient  # type: ignore
    from memory.cli.common import db_path_from_mirror_home  # type: ignore

    with MemoryClient(db_path=db_path_from_mirror_home(args.mirror_home)) as mem:
        if args.operation == "catalog":
            summaries = mem.conversations.list_recent(
                limit=args.limit,
                journey=args.journey_id,
            )
            entries = [{
                "kind": "mirror_history",
                "conversationId": item.id,
                "title": item.title or "Untitled conversation",
                "updatedAt": item.started_at,
                "messageCount": item.message_count,
                "availability": "available_in_mirror",
                **({"persona": item.persona} if item.persona else {}),
            } for item in summaries]
            result = {
                "schemaVersion": "1.0.0",
                "operation": "catalog",
                "status": "ok",
                "journeyId": args.journey_id,
                "entries": entries,
            }
        elif args.operation == "inspect":
            conversation = exact_conversation(mem, args)
            result = {
                "schemaVersion": "1.0.0",
                "operation": "inspect",
                "status": "ok",
                "journeyId": args.journey_id,
                "conversationId": conversation.id,
            }
        else:
            conversation = exact_conversation(mem, args)
            if not isinstance(args.title, str):
                fail(args.operation, args.journey_id, "invalid_title")
            title = " ".join(args.title.strip().split())
            if not title or len(title) > MAX_TITLE_CHARS:
                fail(args.operation, args.journey_id, "invalid_title")
            updated = mem.conversations.update_title(conversation.id, title)
            if updated.id != conversation.id or updated.journey != args.journey_id:
                fail(args.operation, args.journey_id, "persistence_failure")
            result = {
                "schemaVersion": "1.0.0",
                "operation": "rename",
                "status": "ok",
                "journeyId": args.journey_id,
                "conversationId": updated.id,
                "title": updated.title,
            }
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
