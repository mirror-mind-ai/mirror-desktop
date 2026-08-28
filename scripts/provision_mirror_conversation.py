#!/usr/bin/env python3
"""Create or recover one model-free Mirror conversation for a Nautilus Pi session."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--journey-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--mirror-root", type=Path, required=True)
    parser.add_argument("--mirror-home", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    mirror_src = args.mirror_root / "src"
    if not mirror_src.is_dir():
        raise SystemExit("Configured Mirror runtime has no src directory.")
    sys.path.insert(0, str(mirror_src))
    from memory import MemoryClient  # type: ignore
    from memory.cli.common import db_path_from_mirror_home  # type: ignore

    with MemoryClient(db_path=db_path_from_mirror_home(args.mirror_home)) as mem:
        conversation = mem.runtime_sessions.get_or_create_conversation(
            args.session_id,
            interface="nautilus_harness",
            journey=args.journey_id,
        )
        mem.store.upsert_runtime_session(
            args.session_id,
            conversation_id=conversation.id,
            interface="nautilus_harness",
            journey=args.journey_id,
            active=True,
            closed_at=None,
        )
        mem.store.update_conversation(
            conversation.id,
            title=args.title,
            journey=args.journey_id,
            interface="nautilus_harness",
        )
        print(json.dumps({"conversationId": conversation.id, "journeyId": args.journey_id}))


if __name__ == "__main__":
    main()
