from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

REPOSITORY = Path(__file__).parents[2]
MODULE = REPOSITORY / "scripts" / "runtime_binding_file.mjs"


def invoke_loader(home: Path, profile: dict[str, str]) -> subprocess.CompletedProcess[str]:
    script = f"""
import {{ loadRuntimeBinding }} from {json.dumps(MODULE.as_uri())};
const profile = {json.dumps(profile)};
try {{
  const binding = loadRuntimeBinding(profile, {{ home: {json.dumps(str(home))}, platform: 'darwin' }});
  console.log(JSON.stringify(binding));
}} catch (error) {{
  console.error(error.message);
  process.exit(1);
}}
"""
    return subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        capture_output=True,
        text=True,
        check=False,
    )


def create_binding(home: Path) -> tuple[dict[str, str], Path]:
    root = home / "mirror"
    mirror_home = home / ".mirror-home"
    (root / "src" / "memory").mkdir(parents=True)
    (root / "pyproject.toml").write_text('[project]\nversion = "0.31.14"\n')
    mirror_home.mkdir()
    database = mirror_home / "memory.db"
    database.write_bytes(b"")
    profile = {"channel": "user", "identifier": "ai.mirrormind.desktop"}
    binding = {
        "schemaVersion": "1.0.0",
        "channel": "user",
        "mirrorRoot": str(root.resolve()),
        "mirrorHome": str(mirror_home.resolve()),
        "mirrorUser": "example",
        "dbPath": str(database.resolve()),
    }
    target = home / "Library" / "Application Support" / profile["identifier"] / "runtime-binding.v1.json"
    target.parent.mkdir(parents=True)
    target.write_text(json.dumps(binding))
    return profile, target


def test_launcher_accepts_one_canonical_channel_binding() -> None:
    with tempfile.TemporaryDirectory() as directory:
        home = Path(directory).resolve()
        profile, _ = create_binding(home)
        result = invoke_loader(home, profile)
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["mirrorUser"] == "example"


def test_launcher_rejects_database_escape_and_binding_symlink() -> None:
    with tempfile.TemporaryDirectory() as directory:
        home = Path(directory).resolve()
        profile, target = create_binding(home)
        binding = json.loads(target.read_text())
        escaped = home / "escaped.db"
        escaped.write_bytes(b"")
        binding["dbPath"] = str(escaped)
        target.write_text(json.dumps(binding))
        result = invoke_loader(home, profile)
        assert result.returncode == 1
        assert "directly beneath" in result.stderr

        real_target = target.with_name("binding.real.json")
        target.replace(real_target)
        target.symlink_to(real_target)
        result = invoke_loader(home, profile)
        assert result.returncode == 1
        assert "safe canonical file" in result.stderr
