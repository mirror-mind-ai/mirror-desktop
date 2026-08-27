#!/usr/bin/env python3
"""Export only the read-only Mirror Journey registry for Nautilus Harness.

Conversational continuity is owned by dedicated Journey threads. This bootstrap
must never materialize Mirror conversations or parity-era transcript state.
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


DEFAULT_OUTPUT = default_app_data_dir() / "journey-registry.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def first_line_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.MULTILINE)
    return match.group(1).strip() if match else None


def section_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
    return match.group(1).strip() if match else None


def parse_journey_content(content: str) -> dict[str, str | None]:
    description = section_match(r"^## Description\s+(.+?)(?:\n## |\Z)", content)
    return {
        "title": first_line_match(r"^#\s+(.+)$", content),
        "status": first_line_match(r"^\*\*Status:\*\*\s*(.+)$", content),
        "stage": first_line_match(r"^\*\*Stage:\*\*\s*(.+)$", content),
        "description": " ".join(description.split()) if description else None,
    }


def safe_json(value: str | None) -> dict[str, Any]:
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def load_journeys(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        "select key, content, metadata, updated_at from identity where layer = 'journey' order by key"
    ).fetchall()
    items: dict[str, dict[str, Any]] = {}
    children: dict[str, list[str]] = {}
    for key, content, metadata_raw, updated_at in rows:
        metadata = safe_json(metadata_raw)
        parsed = parse_journey_content(content)
        parent_id = metadata.get("parent_journey")
        items[key] = {
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
        if parent_id:
            children.setdefault(parent_id, []).append(key)

    def attach(item_id: str) -> dict[str, Any]:
        item = dict(items[item_id])
        child_ids = children.get(item_id, [])
        item["children"] = [attach(child_id) for child_id in child_ids if child_id in items]
        for optional in ("children", "parentId", "description", "projectPath", "stage", "status"):
            if not item.get(optional):
                item.pop(optional, None)
        return item

    nested_ids = {child for values in children.values() for child in values}
    return [attach(item_id) for item_id in items if item_id not in nested_ids]


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    registry = {
        "schemaVersion": "0.1.0",
        "source": "mirror",
        "syncedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "roots": load_journeys(conn),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n")
    print(f"Exported {len(registry['roots'])} root journeys to {args.output}")


if __name__ == "__main__":
    main()
