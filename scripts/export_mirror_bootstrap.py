#!/usr/bin/env python3
"""Publish Mirror's canonical Journey registry into Harness app data.

This adapter owns only channel coordinates and atomic local publication. Mirror's
``journey export-registry`` command remains the sole registry exporter.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Any

MAX_REGISTRY_BYTES = 2 * 1024 * 1024
CANONICAL_SCHEMA_VERSION = "0.2.0"


def default_app_data_dir(identifier: str) -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / identifier
    if sys.platform.startswith("win"):
        return Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / identifier
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / identifier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mirror-root", type=Path, required=True)
    parser.add_argument("--app-identifier", required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--uv-command", default=os.environ.get("NAUTILUS_UV_COMMAND", "uv"))
    args = parser.parse_args()
    if args.output is None:
        args.output = default_app_data_dir(args.app_identifier) / "journey-registry.json"
    return args


def validate_canonical_registry(payload: str) -> dict[str, Any]:
    if len(payload.encode("utf-8")) > MAX_REGISTRY_BYTES:
        raise ValueError("Canonical Journey registry is oversized.")
    try:
        registry = json.loads(payload)
    except json.JSONDecodeError as error:
        raise ValueError("Canonical Journey registry is invalid JSON.") from error
    if not isinstance(registry, dict):
        raise ValueError("Canonical Journey registry is invalid.")
    schema_version = registry.get("schemaVersion")
    source_version = registry.get("sourceVersion")
    if (
        schema_version != "0.2.0"
        or registry.get("source") != "mirror"
        or not isinstance(source_version, str)
        or len(source_version) != 64
        or not isinstance(registry.get("syncedAt"), str)
        or not registry["syncedAt"]
        or not isinstance(registry.get("roots"), list)
    ):
        raise ValueError(
            f"Mirror registry exporter did not return canonical schema {CANONICAL_SCHEMA_VERSION}."
        )
    return registry


def export_canonical_registry(
    mirror_root: Path,
    *,
    uv_command: str = "uv",
    environment: Mapping[str, str] | None = None,
    runner: Callable[..., Any] = subprocess.run,
) -> str:
    command: Sequence[str] = [
        uv_command,
        "run",
        "python",
        "-m",
        "memory",
        "journey",
        "export-registry",
    ]
    result = runner(
        list(command),
        cwd=mirror_root,
        env=dict(environment) if environment is not None else os.environ.copy(),
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip()[-800:]
        raise RuntimeError(
            f"Canonical Mirror Journey registry export failed: {detail}"
            if detail
            else "Canonical Mirror Journey registry export failed."
        )
    validate_canonical_registry(result.stdout)
    return result.stdout


def publish_registry(output: Path, payload: str) -> None:
    validate_canonical_registry(payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.is_symlink() or (output.exists() and not output.is_file()):
        raise ValueError("Journey registry target is not a safe file.")

    staged_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=output.parent,
            prefix="journey-registry.",
            suffix=".tmp",
            delete=False,
        ) as staged:
            staged_path = Path(staged.name)
            staged.write(payload if payload.endswith("\n") else f"{payload}\n")
            staged.flush()
            os.fsync(staged.fileno())
        os.replace(staged_path, output)
        staged_path = None
        try:
            parent_fd = os.open(output.parent, os.O_RDONLY)
            try:
                os.fsync(parent_fd)
            finally:
                os.close(parent_fd)
        except OSError:
            # Some supported platforms do not permit syncing directory handles.
            pass
    finally:
        if staged_path is not None:
            staged_path.unlink(missing_ok=True)

    validate_canonical_registry(output.read_text(encoding="utf-8"))


def main() -> None:
    args = parse_args()
    mirror_root = args.mirror_root.expanduser().resolve()
    if not mirror_root.is_dir():
        raise SystemExit("Configured Mirror root is unavailable.")
    payload = export_canonical_registry(mirror_root, uv_command=args.uv_command)
    publish_registry(args.output, payload)
    roots = validate_canonical_registry(payload)["roots"]
    print(f"Published {len(roots)} canonical root Journeys to {args.output}")


if __name__ == "__main__":
    main()
