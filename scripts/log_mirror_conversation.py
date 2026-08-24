#!/usr/bin/env python3
"""Log a Nautilus Harness exchange into Mirror conversation storage.

This is a narrow bridge used by Harness' Mirror-mediated invocation mode. It
mutates only Mirror conversation/message/runtime-session rows for an explicit
Harness run.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

DEFAULT_MIRROR_HOME = Path.home() / ".mirror-minds" / "alisson-vale"
DEFAULT_MIRROR_SRC = Path.home() / "mirror" / "src"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--journey-id", required=True)
    parser.add_argument("--role", choices=("user", "assistant"), required=True)
    parser.add_argument("--content", required=True)
    parser.add_argument("--mirror-home", type=Path, default=DEFAULT_MIRROR_HOME)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if DEFAULT_MIRROR_SRC.exists():
        sys.path.insert(0, str(DEFAULT_MIRROR_SRC))

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
        if conversation.journey != args.journey_id:
            mem.store.update_conversation(conversation.id, journey=args.journey_id)
        if args.role == "user" and not conversation.title:
            mem.conversations.set_provisional_title(conversation.id, args.content.strip().split("\n")[0][:80])
        mem.add_message(conversation.id, role=args.role, content=args.content)
        print(conversation.id)


if __name__ == "__main__":
    main()
