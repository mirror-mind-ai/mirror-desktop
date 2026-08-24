#!/usr/bin/env python3
"""Export a read-only Mirror bootstrap snapshot for Nautilus Harness.

This script reads Mirror's SQLite database without mutating it and writes a local
JSON snapshot consumed by the Harness during development/bootstrap.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB = Path.home() / ".mirror-minds" / "alisson-vale" / "memory.db"
APP_IDENTIFIER = "com.nautilus.harness"


def default_app_data_dir() -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_IDENTIFIER
    if sys.platform.startswith("win"):
        return Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / APP_IDENTIFIER
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / APP_IDENTIFIER


DEFAULT_APP_DATA_DIR = default_app_data_dir()
DEFAULT_OUTPUT = DEFAULT_APP_DATA_DIR / "journey-registry.json"
CONVERSATIONS_DIR_NAME = "journey-conversations"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--app-data-dir", type=Path, default=DEFAULT_APP_DATA_DIR)
    parser.add_argument("--message-limit", type=int, default=80)
    parser.add_argument("--journey-id", help="Materialize only one Journey conversation without rewriting the registry")
    parser.add_argument("--conversation-id", help="Materialize this exact Mirror conversation id for --journey-id")
    parser.add_argument("--list-conversations", action="store_true", help="Print Mirror conversations for --journey-id as JSON")
    parser.add_argument("--generate-conversation-title", action="store_true", help="Ask Mirror to generate and save a title for the selected conversation")
    return parser.parse_args()


def first_line_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.MULTILINE)
    return match.group(1).strip() if match else None


def section_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
    return match.group(1).strip() if match else None


def parse_journey_content(content: str) -> dict[str, str | None]:
    title = first_line_match(r"^#\s+(.+)$", content)
    status = first_line_match(r"^\*\*Status:\*\*\s*(.+)$", content)
    stage = first_line_match(r"^\*\*Stage:\*\*\s*(.+)$", content)
    description = section_match(r"^## Description\s+(.+?)(?:\n## |\Z)", content)
    if description:
        description = " ".join(description.split())
    return {"title": title, "status": status, "stage": stage, "description": description}


def safe_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def load_journeys(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        "select key, content, metadata, updated_at from identity where layer = 'journey' order by key"
    ).fetchall()
    items_by_id: dict[str, dict[str, Any]] = {}
    children_by_parent: dict[str, list[str]] = {}

    for key, content, metadata_raw, updated_at in rows:
        metadata = safe_json(metadata_raw)
        parsed = parse_journey_content(content)
        parent_id = metadata.get("parent_journey")
        item = {
            "id": key,
            "name": metadata.get("display_name") or parsed["title"] or key,
            "description": parsed["description"] or "",
            "status": parsed["status"] or "",
            "stage": parsed["stage"] or "",
            "parentId": parent_id,
            "projectPath": metadata.get("project_path"),
            "updatedAt": updated_at,
            "children": [],
        }
        items_by_id[key] = item
        if parent_id:
            children_by_parent.setdefault(parent_id, []).append(key)

    def attach(item_id: str) -> dict[str, Any]:
        item = dict(items_by_id[item_id])
        child_ids = children_by_parent.get(item_id, [])
        item["children"] = [attach(child_id) for child_id in child_ids if child_id in items_by_id]
        if not item["children"]:
            item.pop("children")
        if not item.get("parentId"):
            item.pop("parentId", None)
        if not item.get("description"):
            item.pop("description", None)
        if not item.get("projectPath"):
            item.pop("projectPath", None)
        if not item.get("stage"):
            item.pop("stage", None)
        if not item.get("status"):
            item.pop("status", None)
        return item

    child_ids = {child_id for child_ids in children_by_parent.values() for child_id in child_ids}
    root_ids = [item_id for item_id in items_by_id if item_id not in child_ids]
    return [attach(root_id) for root_id in root_ids]


def sanitize_journey_id(journey_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", journey_id):
        raise ValueError(f"Unsupported Journey id for local file path: {journey_id}")
    return journey_id


def persisted_conversation_payload(conversation: dict[str, Any], saved_at: str) -> dict[str, Any]:
    harness_conversation_id = f"nautilus-{conversation['id']}"
    journey_id = conversation["journeyId"]
    return {
        "schemaVersion": "0.2.0",
        "conversation": {
            "id": harness_conversation_id,
            "journeyId": journey_id,
            "createdAt": conversation["createdAt"],
            "liveIdentity": {
                "schemaVersion": "0.1.0",
                "journeyId": journey_id,
                "harnessConversationId": harness_conversation_id,
                "piSessionId": f"nautilus-{journey_id}",
                "mirrorConversationId": conversation["source"]["conversationId"],
                "generation": 0,
                "origin": "mirror_import",
            },
            "messages": [
                {
                    "id": message["id"],
                    "role": message["role"],
                    "content": message["content"],
                    "createdAt": message["createdAt"],
                }
                for message in conversation["messages"]
            ],
            "importedActivity": conversation.get("importedActivity", {"schemaVersion": "0.1.0", "events": []}),
        },
        "savedAt": saved_at,
    }


def backup_existing_conversation(path: Path, conversations_dir: Path, timestamp: str) -> Path | None:
    if not path.exists():
        return None
    backup_dir = conversations_dir / "backups" / timestamp.replace(":", "-")
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / path.name
    backup_path.write_bytes(path.read_bytes())
    return backup_path


def write_local_conversations(app_data_dir: Path, conversations: dict[str, Any], saved_at: str) -> int:
    conversations_dir = app_data_dir / CONVERSATIONS_DIR_NAME
    conversations_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for journey_id, conversation in conversations.items():
        if not conversation["messages"]:
            continue
        safe_journey_id = sanitize_journey_id(journey_id)
        path = conversations_dir / f"{safe_journey_id}.json"
        backup_existing_conversation(path, conversations_dir, saved_at)
        path.write_text(
            json.dumps(persisted_conversation_payload(conversation, saved_at), ensure_ascii=False, indent=2) + "\n"
        )
        written += 1
    return written


def make_activity_event(
    *,
    event_id: str,
    kind: str,
    timestamp: str,
    title: str,
    source_table: str,
    source_id: str,
    content: str | None = None,
    payload: dict[str, Any] | None = None,
    status: str | None = None,
    severity: str | None = None,
    related_message_id: str | None = None,
    related_conversation_id: str | None = None,
) -> dict[str, Any]:
    event = {
        "id": event_id,
        "kind": kind,
        "timestamp": timestamp,
        "title": title,
        "source": {"system": "mirror", "table": source_table, "id": source_id},
    }
    if content:
        event["content"] = content
    if payload:
        event["payload"] = payload
    if status:
        event["status"] = status
    if severity:
        event["severity"] = severity
    if related_message_id or related_conversation_id:
        event["related"] = {}
        if related_message_id:
            event["related"]["messageId"] = related_message_id
        if related_conversation_id:
            event["related"]["conversationId"] = related_conversation_id
    return event


def extract_ariad_surface_events(message_id: str, content: str, created_at: str, conversation_id: str) -> list[dict[str, Any]]:
    events = []
    pattern = re.compile(r"<<<ARIAD:([^>]+)>>>(.*?)<<<END:\1>>>", re.DOTALL)
    for index, match in enumerate(pattern.finditer(content), start=1):
        surface_type = match.group(1)
        surface_content = match.group(0).strip()
        events.append(
            make_activity_event(
                event_id=f"mirror-{message_id}-ariad-{index}",
                kind="ariad_surface",
                timestamp=created_at,
                title=f"Ariad surface: {surface_type}",
                source_table="messages",
                source_id=message_id,
                content=surface_content,
                payload={"surfaceType": surface_type},
                related_message_id=f"mirror-{message_id}",
                related_conversation_id=conversation_id,
            )
        )
    return events


def load_llm_call_activity(conn: sqlite3.Connection, conversation_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select id, role, model, prompt_tokens, completion_tokens, latency_ms, cost_usd, called_at
        from llm_calls
        where conversation_id = ?
        order by called_at asc, id asc
        """,
        (conversation_id,),
    ).fetchall()
    return [
        make_activity_event(
            event_id=f"mirror-llm-{call_id}",
            kind="metadata",
            timestamp=called_at,
            title=f"LLM call: {role}",
            source_table="llm_calls",
            source_id=call_id,
            status="recorded",
            payload={
                "role": role,
                "model": model,
                "promptTokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "latencyMs": latency_ms,
                "costUsd": cost_usd,
            },
            related_conversation_id=conversation_id,
        )
        for call_id, role, model, prompt_tokens, completion_tokens, latency_ms, cost_usd, called_at in rows
    ]


def load_attachment_activity(conn: sqlite3.Connection, journey_id: str, conversation_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select id, name, description, content_type, tags, metadata, updated_at
        from attachments
        where journey_id = ?
        order by updated_at asc, id asc
        """,
        (journey_id,),
    ).fetchall()
    return [
        make_activity_event(
            event_id=f"mirror-attachment-{attachment_id}",
            kind="attachment_reference",
            timestamp=updated_at,
            title=f"Attachment: {name}",
            source_table="attachments",
            source_id=attachment_id,
            content=description,
            payload={
                "name": name,
                "contentType": content_type,
                "tags": tags,
                "metadata": safe_json(metadata_raw),
            },
            related_conversation_id=conversation_id,
        )
        for attachment_id, name, description, content_type, tags, metadata_raw, updated_at in rows
    ]


def classify_operation_event(kind: str, message: str) -> tuple[str, str | None]:
    lowered = f"{kind} {message}".lower()
    if "error" in lowered or "failed" in lowered:
        return "error", "error"
    if "command" in lowered:
        return "command", None
    if "tool" in lowered:
        return "tool_call", None
    return "operation_event", None


def load_operation_activity(conn: sqlite3.Connection, conversation_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select e.id, e.kind, e.message, e.details_json, e.created_at, r.operation_id, r.status
        from operation_run_events e
        join operation_runs r on r.id = e.run_id
        where e.details_json like ? or e.details_json like ? or r.parameters_json like ? or r.result_json like ?
        order by e.created_at asc, e.sequence asc
        """,
        (f"%{conversation_id}%", f"%{conversation_id[:8]}%", f"%{conversation_id}%", f"%{conversation_id}%"),
    ).fetchall()
    events = []
    for event_id, kind, message, details_raw, created_at, operation_id, status in rows:
        activity_kind, severity = classify_operation_event(kind, message)
        events.append(
            make_activity_event(
                event_id=f"mirror-operation-{event_id}",
                kind=activity_kind,
                timestamp=created_at,
                title=f"Operation {kind}: {operation_id}",
                source_table="operation_run_events",
                source_id=event_id,
                content=message,
                payload={"operationId": operation_id, "eventKind": kind, "details": safe_json(details_raw)},
                status=status,
                severity=severity,
                related_conversation_id=conversation_id,
            )
        )
    return events


def generate_mirror_conversation_title(db_path: Path, journey_id: str, conversation_id: str) -> dict[str, Any]:
    mirror_src = Path.home() / "mirror" / "src"
    if mirror_src.exists():
        sys.path.insert(0, str(mirror_src))
    from memory import MemoryClient  # type: ignore

    with MemoryClient(db_path=db_path) as mem:
        conversation = mem.conversations.find_by_id_prefix(conversation_id)
        if conversation is None or conversation.journey != journey_id:
            raise ValueError(f"Conversation not found for Journey {journey_id}: {conversation_id}")
        generated_title = mem.conversations.suggest_title(conversation.id)
        updated = mem.conversations.update_title(conversation.id, generated_title)
        return {"id": updated.id, "title": updated.title or generated_title}


def list_mirror_conversations(conn: sqlite3.Connection, journey_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select
          c.id,
          c.title,
          c.started_at,
          coalesce(max(m.created_at), c.ended_at, c.started_at) as last_updated_at,
          count(m.id) as message_count
        from conversations c
        left join messages m on m.conversation_id = c.id
        where c.journey = ?
        group by c.id
        order by last_updated_at desc, c.started_at desc, c.id asc
        """,
        (journey_id,),
    ).fetchall()
    return [
        {
            "id": conversation_id,
            "code": conversation_id[:8],
            "title": title or "Untitled Mirror conversation",
            "startedAt": started_at,
            "lastUpdatedAt": last_updated_at or started_at,
            "messageCount": message_count,
        }
        for conversation_id, title, started_at, last_updated_at, message_count in rows
    ]


def build_conversation_payload(
    conn: sqlite3.Connection,
    *,
    conversation_id: str,
    journey_id: str,
    started_at: str,
    persona: str | None,
    title: str | None,
    message_limit: int,
) -> dict[str, Any]:
    message_rows = conn.execute(
        """
        select id, role, content, created_at, metadata
        from messages
        where conversation_id = ?
        order by created_at asc, id asc
        limit ?
        """,
        (conversation_id, message_limit),
    ).fetchall()
    messages = []
    activity_events = []
    for message_id, role, content, created_at, metadata_raw in message_rows:
        normalized_role = "user" if role == "user" else "assistant"
        prefix = "" if role in {"user", "assistant"} else f"[{role}]\n"
        metadata = safe_json(metadata_raw)
        messages.append(
            {
                "id": f"mirror-{message_id}",
                "role": normalized_role,
                "content": f"{prefix}{content}",
                "createdAt": created_at,
                "imported": {
                    "source": "mirror",
                    "role": role,
                    "metadata": metadata,
                },
            }
        )
        if metadata:
            activity_events.append(
                make_activity_event(
                    event_id=f"mirror-{message_id}-metadata",
                    kind="metadata",
                    timestamp=created_at,
                    title=f"Message metadata: {role}",
                    source_table="messages",
                    source_id=message_id,
                    payload={"role": role, "metadata": metadata},
                    related_message_id=f"mirror-{message_id}",
                    related_conversation_id=conversation_id,
                )
            )
        activity_events.extend(extract_ariad_surface_events(message_id, content, created_at, conversation_id))

    activity_events.extend(load_llm_call_activity(conn, conversation_id))
    activity_events.extend(load_operation_activity(conn, conversation_id))
    activity_events.extend(load_attachment_activity(conn, journey_id, conversation_id))
    activity_events.sort(key=lambda event: (event.get("timestamp") or "", event["id"]))

    return {
        "id": f"mirror-{conversation_id}",
        "journeyId": journey_id,
        "createdAt": started_at,
        "source": {
            "conversationId": conversation_id,
            "persona": persona,
            "title": title,
        },
        "messages": messages,
        "importedActivity": {
            "schemaVersion": "0.1.0",
            "source": "mirror",
            "sourceConversationId": conversation_id,
            "events": activity_events,
        },
    }


def load_selected_conversation(conn: sqlite3.Connection, journey_id: str, conversation_id: str, message_limit: int) -> dict[str, Any]:
    row = conn.execute(
        """
        select id, journey, started_at, persona, title
        from conversations
        where id = ? and journey = ?
        """,
        (conversation_id, journey_id),
    ).fetchone()
    if not row:
        return {}
    selected_id, selected_journey_id, started_at, persona, title = row
    return {
        selected_journey_id: build_conversation_payload(
            conn,
            conversation_id=selected_id,
            journey_id=selected_journey_id,
            started_at=started_at,
            persona=persona,
            title=title,
            message_limit=message_limit,
        )
    }


def load_latest_conversations(conn: sqlite3.Connection, message_limit: int, journey_id: str | None = None) -> dict[str, Any]:
    journey_filter = "and c.journey = ?" if journey_id else ""
    latest_rows = conn.execute(
        """
        select ranked.id, ranked.journey, ranked.started_at, ranked.persona, ranked.title
        from (
          select
            c.id,
            c.journey,
            c.started_at,
            c.persona,
            c.title,
            count(m.id) as message_count,
            row_number() over (
              partition by c.journey
              order by case when count(m.id) > 0 then 0 else 1 end, c.started_at desc
            ) as rank
          from conversations c
          left join messages m on m.conversation_id = c.id
          where c.journey is not null and c.journey != ''
          {journey_filter}
          group by c.id
        ) ranked
        where ranked.rank = 1
        order by ranked.journey
        """.format(journey_filter=journey_filter),
        (journey_id,) if journey_id else (),
    ).fetchall()
    conversations: dict[str, Any] = {}

    for conversation_id, journey_id, started_at, persona, title in latest_rows:
        conversations[journey_id] = build_conversation_payload(
            conn,
            conversation_id=conversation_id,
            journey_id=journey_id,
            started_at=started_at,
            persona=persona,
            title=title,
            message_limit=message_limit,
        )

    return conversations


def main() -> None:
    args = parse_args()
    read_only = not args.generate_conversation_title
    uri = f"file:{args.db}?mode=ro" if read_only else str(args.db)
    conn = sqlite3.connect(uri, uri=read_only)
    synced_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    args.app_data_dir.mkdir(parents=True, exist_ok=True)

    if args.list_conversations:
        if not args.journey_id:
            raise SystemExit("--list-conversations requires --journey-id")
        sanitize_journey_id(args.journey_id)
        payload = {"journeyId": args.journey_id, "conversations": list_mirror_conversations(conn, args.journey_id)}
        print(json.dumps(payload, ensure_ascii=False))
        return

    if args.generate_conversation_title:
        if not args.journey_id or not args.conversation_id:
            raise SystemExit("--generate-conversation-title requires --journey-id and --conversation-id")
        sanitize_journey_id(args.journey_id)
        payload = generate_mirror_conversation_title(args.db, args.journey_id, args.conversation_id)
        print(json.dumps(payload, ensure_ascii=False))
        return

    if args.conversation_id:
        if not args.journey_id:
            raise SystemExit("--conversation-id requires --journey-id")
        sanitize_journey_id(args.journey_id)
        conversations = load_selected_conversation(conn, args.journey_id, args.conversation_id, args.message_limit)
        conversation_count = write_local_conversations(args.app_data_dir, conversations, synced_at)
        if conversation_count == 0:
            raise SystemExit(f"No non-empty Mirror conversation found for Journey {args.journey_id}: {args.conversation_id}")
        print(f"Reloaded Mirror conversation {args.conversation_id} for Journey: {args.journey_id}")
        print(f"Materialized {conversation_count} Journey conversation under {args.app_data_dir / CONVERSATIONS_DIR_NAME}")
        return

    if args.journey_id:
        sanitize_journey_id(args.journey_id)
        conversations = load_latest_conversations(conn, args.message_limit, args.journey_id)
        conversation_count = write_local_conversations(args.app_data_dir, conversations, synced_at)
        if conversation_count == 0:
            raise SystemExit(f"No non-empty Mirror conversation found for Journey: {args.journey_id}")
        print(f"Reloaded Journey conversation from Mirror: {args.journey_id}")
        print(f"Materialized {conversation_count} Journey conversation under {args.app_data_dir / CONVERSATIONS_DIR_NAME}")
        return

    registry = {
        "schemaVersion": "0.1.0",
        "source": "mirror",
        "syncedAt": synced_at,
        "roots": load_journeys(conn),
    }
    payload = {
        "schemaVersion": "0.1.0",
        "registry": registry,
        "conversationsByJourneyId": load_latest_conversations(conn, args.message_limit),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n")
    conversation_count = write_local_conversations(args.app_data_dir, payload["conversationsByJourneyId"], registry["syncedAt"])
    legacy_bootstrap = args.app_data_dir / "mirror-bootstrap.json"
    if legacy_bootstrap.exists():
        legacy_bootstrap.unlink()
    print(f"Exported {len(registry['roots'])} root journeys to {args.output}")
    print(f"Materialized {conversation_count} Journey conversations under {args.app_data_dir / CONVERSATIONS_DIR_NAME}")


if __name__ == "__main__":
    main()
