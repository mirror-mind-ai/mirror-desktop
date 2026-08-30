from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

SCRIPT = Path(__file__).parents[1] / "export_mirror_bootstrap.py"
spec = importlib.util.spec_from_file_location("export_mirror_bootstrap", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


class MirrorRegistryBootstrapTests(unittest.TestCase):
    def canonical_payload(self) -> str:
        return json.dumps({
            "schemaVersion": "0.2.0",
            "source": "mirror",
            "sourceVersion": "a" * 64,
            "syncedAt": "2026-08-30T00:00:00Z",
            "roots": [{"id": "journey", "name": "Journey", "siblingPosition": 0}],
        })

    def test_delegates_export_to_the_canonical_mirror_command(self) -> None:
        runner = Mock(return_value=SimpleNamespace(returncode=0, stdout=self.canonical_payload(), stderr=""))
        environment = {"MIRROR_HOME": "/runtime", "MIRROR_USER": "mirror-dev", "DB_PATH": "/runtime/memory.db"}

        payload = module.export_canonical_registry(
            Path("/mirror-dev"),
            uv_command="/trusted/uv",
            environment=environment,
            runner=runner,
        )

        self.assertEqual(json.loads(payload)["schemaVersion"], "0.2.0")
        runner.assert_called_once_with(
            ["/trusted/uv", "run", "python", "-m", "memory", "journey", "export-registry"],
            cwd=Path("/mirror-dev"),
            env=environment,
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )

    def test_rejects_legacy_or_unbounded_export_output(self) -> None:
        legacy = json.dumps({"schemaVersion": "0.1.0", "source": "mirror", "syncedAt": "now", "roots": []})
        with self.assertRaisesRegex(ValueError, "canonical schema"):
            module.validate_canonical_registry(legacy)
        with self.assertRaisesRegex(ValueError, "oversized"):
            module.validate_canonical_registry(" " * (2 * 1024 * 1024 + 1))

    def test_publishes_the_verified_registry_without_leaving_staging_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "app-data" / "journey-registry.json"
            module.publish_registry(output, self.canonical_payload())
            self.assertEqual(json.loads(output.read_text())["schemaVersion"], "0.2.0")
            self.assertEqual(list(output.parent.glob("*.tmp")), [])

    def test_invalid_replacement_preserves_the_previous_registry(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "journey-registry.json"
            previous = self.canonical_payload()
            module.publish_registry(output, previous)
            with self.assertRaisesRegex(ValueError, "canonical schema"):
                module.publish_registry(
                    output,
                    json.dumps({"schemaVersion": "0.1.0", "source": "mirror", "roots": []}),
                )
            self.assertEqual(json.loads(output.read_text()), json.loads(previous))

    def test_script_has_no_parallel_database_exporter_or_conversation_surface(self) -> None:
        source = SCRIPT.read_text()
        for obsolete in (
            "sqlite3",
            "select key, content, metadata",
            "write_local_conversations",
            "conversation-id",
            "list-conversations",
            "generate-conversation-title",
            '"schemaVersion": "0.1.0"',
        ):
            self.assertNotIn(obsolete, source)
        self.assertIn('"export-registry"', source)


if __name__ == "__main__":
    unittest.main()
