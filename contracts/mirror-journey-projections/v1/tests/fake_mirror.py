#!/usr/bin/env python3
"""Stateful black-box fake for the Journey Projection consumer probe."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

CONTRACT_ID = "mirror.journey-projections"
CONTRACT_VERSION = "1.0"


def _load(path: Path, default: object) -> object:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _save(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _option(args: list[str], name: str) -> str | None:
    try:
        return args[args.index(name) + 1]
    except (ValueError, IndexError):
        return None


def _emit(payload: object, code: int = 0) -> int:
    print(json.dumps(payload, sort_keys=True))
    return code


def main() -> int:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--mode", required=True)
    parser.add_argument("--state-dir", required=True)
    known, args = parser.parse_known_args()
    mode = known.mode
    state = Path(known.state_dir)

    if mode == "subprocess-error":
        print("synthetic command failure", file=sys.stderr)
        return 23

    if "journey-projection" not in args:
        return _emit({"status": "ok"})
    operation = args[args.index("journey-projection") + 1]

    if operation == "capabilities":
        if mode == "unavailable":
            print("Unknown command: journey-projection", file=sys.stderr)
            return 2
        version = "2.0" if mode == "wrong-version" else CONTRACT_VERSION
        return _emit(
            {
                "contractId": CONTRACT_ID,
                "contractVersion": version,
                "extensionApiVersion": "1.1",
                "operations": [
                    "capabilities",
                    "probe-prepare",
                    "rebuild-operational",
                    "inspect",
                    "probe-publish",
                ],
            }
        )

    if operation == "probe-prepare":
        fixture_root = Path(_option(args, "--fixture-root") or "")
        expected = fixture_root.parent / "expected" / "operational.json"
        if not expected.exists():
            return _emit({"error": "fixture_missing"}, 3)
        document = json.loads(expected.read_text(encoding="utf-8"))
        if mode == "malformed-operational":
            document["content"].pop("roadmap", None)
        _save(state / "operational.json", document)
        manifest_path = fixture_root.parent / "expected" / "manifest.json"
        _save(state / "manifest.json", json.loads(manifest_path.read_text(encoding="utf-8")))
        return _emit({"status": "prepared", "journeyId": document["journeyId"]})

    if operation == "rebuild-operational":
        document = _load(state / "operational.json", {})
        return _emit({"status": "published", "document": document})

    if operation == "inspect":
        projection = _option(args, "--projection") or ""
        if projection == "operational":
            document = _load(state / "operational.json", {})
        else:
            document = _load(state / "extension.json", {})
        return _emit(
            {
                "status": "ok",
                "document": document,
                "manifest": _load(state / "manifest.json", {}),
            }
        )

    if operation == "probe-publish":
        projection = _option(args, "--projection") or ""
        document_path = Path(_option(args, "--document") or "")
        actor_namespace = _option(args, "--actor-namespace") or ""
        target_namespace = _option(args, "--target-namespace") or actor_namespace
        if target_namespace != actor_namespace and mode != "unsafe-namespace":
            return _emit({"error": "namespace_violation"}, 4)
        if target_namespace != actor_namespace and mode == "unsafe-namespace":
            return _emit({"status": "published", "unsafeAccepted": True})
        unsafe_name = projection.startswith("/") or ".." in projection or "/" in projection
        if unsafe_name and mode != "unsafe-path":
            return _emit({"error": "unsafe_projection_name"}, 4)
        if unsafe_name and mode == "unsafe-path":
            return _emit({"status": "published", "unsafeAccepted": True})

        candidate = json.loads(document_path.read_text(encoding="utf-8"))
        is_invalid = "content" not in candidate or candidate.get("schemaVersion") != "1"
        if is_invalid:
            return _emit({"error": "schema_validation_failed"}, 5)

        previous_manifest = _load(state / "manifest.json", {})
        if mode == "partial-publication":
            broken = dict(previous_manifest)
            broken["updatedAt"] = "2099-01-01T00:00:00Z"
            _save(state / "manifest.json", broken)
            return _emit({"error": "snapshot_write_failed"}, 6)

        _save(state / "extension.json", candidate)
        manifest = dict(previous_manifest)
        manifest.setdefault("projections", {})["projection-probe:tactical"] = {
            "namespace": "projection-probe",
            "projection": "tactical",
            "snapshotId": candidate["snapshotId"],
            "path": ".mirror/projections/projection-probe/tactical.json",
            "sourceRevision": candidate["sourceRevision"],
        }
        _save(state / "manifest.json", manifest)
        return _emit({"status": "published", "snapshotId": candidate["snapshotId"]})

    return _emit({"error": "unknown_operation", "operation": operation}, 2)


if __name__ == "__main__":
    raise SystemExit(main())
