#!/usr/bin/env python3
"""Nautilus method identity walking skeleton."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROTOCOL_ROOT = ROOT / "agentic-protocol"
sys.path.insert(0, str(PROTOCOL_ROOT / "src"))

from nautilus_protocol.identity import EXPECTED_IDENTITY, validate_identity  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "fixture",
        nargs="?",
        default=str(PROTOCOL_ROOT / "fixtures" / "nautilus.identity.yaml"),
        help="Path to a Nautilus identity fixture.",
    )
    args = parser.parse_args()

    validation = validate_identity(args.fixture)
    print("Nautilus method identity skeleton")
    print("")
    print(f"fixture: {validation.path}")
    print(f"status: {'compatible' if validation.valid else 'incompatible'}")
    print("")
    for key in EXPECTED_IDENTITY:
        print(f"{key}: {validation.identity.get(key, '<missing>')}")

    if validation.errors:
        print("")
        print("errors:")
        for error in validation.errors:
            print(f"- {error}")

    return 0 if validation.valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
