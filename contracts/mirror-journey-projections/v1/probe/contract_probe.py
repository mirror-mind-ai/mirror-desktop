#!/usr/bin/env python3
"""Black-box consumer probe for Mirror Journey Projection Contract v1."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CONTRACT_ID = "mirror.journey-projections"
CONTRACT_VERSION = "1.0"
RESULT_EXIT_CODES = {
    "passed": 0,
    "contract_unavailable": 10,
    "nonconformant": 11,
    "unsafe": 12,
    "probe_error": 13,
}


@dataclass(frozen=True)
class ProbeConfig:
    mirror_command: list[str]
    mirror_home: Path
    journey_fixture: Path
    contract_root: Path
    mirror_root: Path | None = None
    production_home: Path | None = None
    allow_production_return: bool = False


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    payload: dict[str, Any] | None
    stdout: str
    stderr: str


class ProbeFailure(Exception):
    def __init__(self, result: str, diagnostic: str):
        super().__init__(diagnostic)
        self.result = result
        self.diagnostic = diagnostic


def _machine_result(result: str, diagnostic: str, checks: list[str] | None = None) -> dict[str, Any]:
    return {
        "contractId": CONTRACT_ID,
        "contractVersion": CONTRACT_VERSION,
        "result": result,
        "gate": "open" if result == "passed" else "blocked",
        "diagnostic": diagnostic,
        "checks": checks or [],
    }


def _parse_last_json(text: str) -> dict[str, Any] | None:
    for line in reversed([line.strip() for line in text.splitlines() if line.strip()]):
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    return None


def _run(config: ProbeConfig, args: list[str]) -> CommandResult:
    env = os.environ.copy()
    env["MIRROR_HOME"] = str(config.mirror_home)
    env["MEMORY_ENV"] = "test"
    completed = subprocess.run(
        [*config.mirror_command, *args],
        cwd=str(config.mirror_root) if config.mirror_root else None,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    payload = _parse_last_json(completed.stdout) or _parse_last_json(completed.stderr)
    return CommandResult(
        returncode=completed.returncode,
        payload=payload,
        stdout=completed.stdout,
        stderr=completed.stderr,
    )


def _jp(config: ProbeConfig, operation: str, *args: str) -> CommandResult:
    return _run(
        config,
        [
            "journey-projection",
            operation,
            *args,
            "--mirror-home",
            str(config.mirror_home),
            "--format",
            "json",
        ],
    )


def _require_success(result: CommandResult, operation: str) -> dict[str, Any]:
    if result.returncode != 0 or result.payload is None:
        detail = result.stderr.strip() or result.stdout.strip() or f"exit {result.returncode}"
        raise ProbeFailure("nonconformant", f"{operation} failed: {detail[:300]}")
    return result.payload


def _canonical(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _assert_operational_shape(document: dict[str, Any], expected: dict[str, Any]) -> None:
    if _canonical(document) != _canonical(expected):
        content = document.get("content") if isinstance(document, dict) else None
        if not isinstance(content, dict) or "roadmap" not in content:
            raise ProbeFailure("nonconformant", "Operational projection is missing required roadmap content")
        raise ProbeFailure("nonconformant", "Operational projection differs from the normative fixture")


def _copy_probe_fixtures(config: ProbeConfig) -> Path:
    source_root = config.journey_fixture.resolve().parent
    target_root = config.mirror_home / ".journey-projection-probe" / "fixtures"
    if target_root.exists():
        shutil.rmtree(target_root)
    shutil.copytree(source_root, target_root, symlinks=True)
    return target_root / config.journey_fixture.name


def _inspect(config: ProbeConfig, namespace: str, projection: str) -> dict[str, Any]:
    return _require_success(
        _jp(
            config,
            "inspect",
            "--journey",
            "projection-probe-journey",
            "--namespace",
            namespace,
            "--projection",
            projection,
        ),
        f"inspect {namespace}:{projection}",
    )


def _publish(
    config: ProbeConfig,
    projection: str,
    document: Path,
    *,
    target_namespace: str = "projection-probe",
) -> CommandResult:
    return _jp(
        config,
        "probe-publish",
        "--journey",
        "projection-probe-journey",
        "--actor-namespace",
        "projection-probe",
        "--target-namespace",
        target_namespace,
        "--projection",
        projection,
        "--document",
        str(document),
        "--schema",
        str(config.contract_root / "schemas" / "extension-projection.schema.json"),
    )


def run_probe(config: ProbeConfig) -> dict[str, Any]:
    checks: list[str] = []
    try:
        home = config.mirror_home.expanduser().resolve()
        production = config.production_home.expanduser().resolve() if config.production_home else None
        if production is not None and home == production:
            raise ProbeFailure("probe_error", "probe always refuses the production Mirror home; production-return mode tests only the installed binary with isolated data")
        home.mkdir(parents=True, exist_ok=True)

        capabilities = _jp(config, "capabilities")
        if capabilities.returncode != 0 or capabilities.payload is None:
            combined = f"{capabilities.stdout}\n{capabilities.stderr}".lower()
            if "unknown command" in combined or "journey-projection" in combined:
                return _machine_result("contract_unavailable", "installed Mirror does not expose the v1 capability")
            raise ProbeFailure("probe_error", "capability discovery failed without an unavailable-contract diagnostic")

        cap = capabilities.payload
        if cap.get("contractId") != CONTRACT_ID:
            raise ProbeFailure("nonconformant", "capability discovery returned the wrong contract identifier")
        if cap.get("contractVersion") != CONTRACT_VERSION:
            raise ProbeFailure("nonconformant", "capability discovery returned an incompatible contract version")
        required = {"capabilities", "probe-prepare", "rebuild-operational", "inspect", "probe-publish"}
        if not required.issubset(set(cap.get("operations", []))):
            raise ProbeFailure("nonconformant", "capability discovery omits required probe operations")
        checks.append("capability_discovery")

        fixture = _copy_probe_fixtures(config)
        _require_success(
            _jp(
                config,
                "probe-prepare",
                "--fixture-root",
                str(fixture),
                "--active-state",
                str(fixture / "ariad-active-work.json"),
            ),
            "probe preparation",
        )
        checks.append("isolated_fixture_prepared")

        expected_operational = json.loads(
            (config.contract_root / "fixtures" / "expected" / "operational.json").read_text(encoding="utf-8")
        )
        rebuilt = _require_success(
            _jp(config, "rebuild-operational", "--journey", "projection-probe-journey"),
            "Operational rebuild",
        )
        document = rebuilt.get("document")
        if not isinstance(document, dict):
            raise ProbeFailure("nonconformant", "Operational rebuild did not return a document")
        _assert_operational_shape(document, expected_operational)
        checks.append("operational_fixture")

        baseline = _inspect(config, "ariad", "operational")
        baseline_manifest = baseline.get("manifest")
        if not isinstance(baseline_manifest, dict):
            raise ProbeFailure("nonconformant", "Operational inspection omitted the manifest")
        checks.append("operational_inspection")

        candidates = config.contract_root / "fixtures" / "candidates"
        valid = candidates / "valid-extension-projection.json"
        invalid = candidates / "invalid-extension-projection.json"
        publish_valid = _publish(config, "tactical", valid)
        if publish_valid.returncode != 0:
            after_failure = _inspect(config, "projection-probe", "tactical")
            if _canonical(after_failure.get("manifest")) != _canonical(baseline_manifest):
                raise ProbeFailure("nonconformant", "publication failure did not preserve the last valid manifest")
            raise ProbeFailure("nonconformant", "valid extension publication failed")

        extension_state = _inspect(config, "projection-probe", "tactical")
        expected_extension = json.loads(valid.read_text(encoding="utf-8"))
        if _canonical(extension_state.get("document")) != _canonical(expected_extension):
            raise ProbeFailure("nonconformant", "published extension projection differs from its candidate")
        valid_manifest = extension_state.get("manifest")
        checks.append("extension_publication")

        invalid_result = _publish(config, "tactical", invalid)
        if invalid_result.returncode == 0:
            raise ProbeFailure("unsafe", "schema-invalid extension projection was accepted")
        after_invalid = _inspect(config, "projection-probe", "tactical")
        if _canonical(after_invalid.get("document")) != _canonical(expected_extension):
            raise ProbeFailure("nonconformant", "invalid publication did not preserve the last valid projection")
        if _canonical(after_invalid.get("manifest")) != _canonical(valid_manifest):
            raise ProbeFailure("nonconformant", "invalid publication did not preserve the last valid manifest")
        checks.append("last_valid_preservation")

        unsafe_cases = ["../escape", "/tmp/escape", "linked/escape"]
        for unsafe_projection in unsafe_cases:
            attempted = _publish(config, unsafe_projection, valid)
            if attempted.returncode == 0:
                raise ProbeFailure("unsafe", f"unsafe projection identifier was accepted: {unsafe_projection}")
        foreign = _publish(config, "tactical", valid, target_namespace="foreign")
        if foreign.returncode == 0:
            raise ProbeFailure("unsafe", "foreign extension namespace was accepted")
        checks.append("path_and_namespace_safety")

        final_state = _inspect(config, "projection-probe", "tactical")
        if _canonical(final_state.get("document")) != _canonical(expected_extension):
            raise ProbeFailure("nonconformant", "rejected security attempts changed the last valid projection")
        if _canonical(final_state.get("manifest")) != _canonical(valid_manifest):
            raise ProbeFailure("nonconformant", "rejected security attempts changed the last valid manifest")
        checks.append("atomic_consistency")

        return _machine_result("passed", "installed Mirror conforms to the v1 consumer probe", checks)
    except ProbeFailure as exc:
        return _machine_result(exc.result, exc.diagnostic, checks)
    except (OSError, ValueError, json.JSONDecodeError, subprocess.SubprocessError) as exc:
        return _machine_result("probe_error", f"probe execution failed: {type(exc).__name__}: {exc}", checks)


def _command_from_args(value: str | None) -> list[str]:
    if value is None:
        return ["uv", "run", "python", "-m", "memory"]
    parsed = json.loads(value)
    if not isinstance(parsed, list) or not parsed or not all(isinstance(item, str) and item for item in parsed):
        raise ValueError("--mirror-command-json must be a non-empty JSON string array")
    return parsed


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mirror-command-json", help="JSON array command prefix; defaults to uv run python -m memory")
    parser.add_argument("--mirror-root", type=Path, help="Working directory for the Mirror command")
    parser.add_argument("--mirror-home", required=True, type=Path, help="Isolated Mirror home used by the probe")
    parser.add_argument("--journey-fixture", required=True, type=Path, help="Synthetic Journey fixture root")
    parser.add_argument("--contract-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--production-home", type=Path, default=Path(os.environ["MIRROR_HOME"]) if os.environ.get("MIRROR_HOME") else None)
    parser.add_argument("--production-return", action="store_true", help="Label an installed-binary return check; the supplied Mirror home must still be isolated")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        command = _command_from_args(args.mirror_command_json)
    except (ValueError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    result = run_probe(
        ProbeConfig(
            mirror_command=command,
            mirror_home=args.mirror_home,
            journey_fixture=args.journey_fixture,
            contract_root=args.contract_root,
            mirror_root=args.mirror_root,
            production_home=args.production_home,
            allow_production_return=args.production_return,
        )
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return RESULT_EXIT_CODES[result["result"]]


if __name__ == "__main__":
    raise SystemExit(main())
