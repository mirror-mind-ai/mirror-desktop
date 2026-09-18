#!/usr/bin/env python3
"""Terminate an isolated DEV app after a new terminal Pi leaf is durable.

The watcher emits entry IDs and timing only. It never emits prompt or assistant bodies.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

MAX_SESSION_BYTES = 256 * 1024 * 1024
MAX_ENTRIES = 1_000_000
TERMINAL_REASONS = {"stop", "length"}


def _regular_file(path: Path) -> None:
    metadata = path.lstat()
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Session must be a regular file: {path}")
    if metadata.st_size > MAX_SESSION_BYTES:
        raise ValueError("Session exceeds the watcher byte bound.")


def inspect_leaf(path: Path) -> dict[str, object]:
    _regular_file(path)
    payload = path.read_bytes()
    if len(payload) > MAX_SESSION_BYTES:
        raise ValueError("Session exceeds the watcher byte bound.")
    entries: list[dict[str, object]] = []
    by_id: dict[str, dict[str, object]] = {}
    lines = payload.splitlines()
    for index, raw in enumerate(lines):
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            if index == len(lines) - 1 and not payload.endswith(b"\n"):
                return {"status": "partial", "sizeBytes": len(payload)}
            raise ValueError("Session JSONL is malformed.") from None
        if value.get("type") == "session" or not isinstance(value.get("id"), str):
            continue
        entry_id = value["id"]
        if entry_id in by_id:
            raise ValueError("Session contains duplicate entry identity.")
        if len(entries) >= MAX_ENTRIES:
            raise ValueError("Session exceeds the watcher entry bound.")
        entry = {
            "id": entry_id,
            "parentId": value.get("parentId"),
            "type": value.get("type"),
            "role": (value.get("message") or {}).get("role"),
            "stopReason": (value.get("message") or {}).get("stopReason"),
        }
        entries.append(entry)
        by_id[entry_id] = entry
    if not entries:
        return {"status": "empty", "sizeBytes": len(payload)}
    branch: list[dict[str, object]] = []
    current = entries[-1]
    seen: set[str] = set()
    while current is not None:
        entry_id = str(current["id"])
        if entry_id in seen:
            raise ValueError("Session ancestry contains a cycle.")
        seen.add(entry_id)
        branch.append(current)
        parent_id = current.get("parentId")
        if parent_id is None:
            current = None
        elif not isinstance(parent_id, str) or parent_id not in by_id:
            raise ValueError("Session ancestry references a missing parent.")
        else:
            current = by_id[parent_id]
    branch.reverse()
    leaf = branch[-1]
    return {
        "status": "ready",
        "sizeBytes": len(payload),
        "activeEntryCount": len(branch),
        "leafEntryId": leaf["id"],
        "leafRole": leaf["role"],
        "leafStopReason": leaf["stopReason"],
    }


def process_command(pid: int) -> str:
    return subprocess.check_output(["ps", "-p", str(pid), "-o", "command="], text=True).strip()


def write_evidence(path: Path, evidence: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() or path.is_symlink():
        raise ValueError(f"Evidence destination already exists: {path}")
    staged = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    with staged.open("x", encoding="utf-8") as handle:
        json.dump(evidence, handle, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    staged.replace(path)


def watch(args: argparse.Namespace) -> dict[str, object]:
    session = Path(args.session_file).expanduser().resolve()
    evidence_path = Path(args.evidence).expanduser().resolve()
    initial = inspect_leaf(session)
    if initial.get("leafEntryId") != args.baseline_leaf:
        raise ValueError("Baseline leaf does not match the exact session before watching.")
    if not args.dry_run:
        command = process_command(args.pid)
        if "mirror-desktop" not in command:
            raise ValueError("Target PID is not a Mirror Desktop process.")
    if args.ready_file:
        write_evidence(Path(args.ready_file).expanduser().resolve(), {
            "schemaVersion": "1.0.0",
            "kind": "rs018_terminal_window_watch_ready",
            "baselineLeafEntryId": args.baseline_leaf,
        })
    deadline = time.monotonic() + args.timeout_seconds
    while time.monotonic() < deadline:
        inspection = inspect_leaf(session)
        leaf_id = inspection.get("leafEntryId")
        terminal = (
            inspection.get("status") == "ready"
            and leaf_id != args.baseline_leaf
            and inspection.get("leafRole") == "assistant"
            and inspection.get("leafStopReason") in TERMINAL_REASONS
        )
        if terminal:
            observed_at = time.time_ns()
            if not args.dry_run:
                os.kill(args.pid, signal.SIGTERM)
            evidence = {
                "schemaVersion": "1.0.0",
                "kind": "rs018_terminal_window_watch",
                "baselineLeafEntryId": args.baseline_leaf,
                "terminalLeafEntryId": leaf_id,
                "terminalStopReason": inspection["leafStopReason"],
                "activeEntryCount": inspection["activeEntryCount"],
                "sessionSizeBytes": inspection["sizeBytes"],
                "observedAtUnixNanos": observed_at,
                "signal": None if args.dry_run else "SIGTERM",
                "dryRun": args.dry_run,
            }
            write_evidence(evidence_path, evidence)
            return evidence
        time.sleep(args.poll_milliseconds / 1000)
    raise TimeoutError("No new terminal assistant leaf appeared before the watcher timeout.")


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--session-file", required=True)
    result.add_argument("--baseline-leaf", required=True)
    result.add_argument("--pid", required=True, type=int)
    result.add_argument("--evidence", required=True)
    result.add_argument("--ready-file")
    result.add_argument("--timeout-seconds", type=int, default=300)
    result.add_argument("--poll-milliseconds", type=int, default=5)
    result.add_argument("--dry-run", action="store_true")
    return result


def main() -> int:
    try:
        evidence = watch(parser().parse_args())
        print(json.dumps(evidence, indent=2))
        return 0
    except Exception as error:  # bounded CLI diagnostic
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
