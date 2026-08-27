from __future__ import annotations

import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "export_mirror_bootstrap.py"
spec = importlib.util.spec_from_file_location("export_mirror_bootstrap", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


class MirrorRegistryBootstrapTests(unittest.TestCase):
    def test_loads_only_journey_identity_as_a_nested_registry(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "memory.db"
            conn = sqlite3.connect(db)
            conn.execute("create table identity (key text, layer text, content text, metadata text, updated_at text)")
            conn.execute(
                "insert into identity values (?, 'journey', ?, ?, ?)",
                ("parent", "# Parent\n\n## Description\nRoot Journey", '{"display_name":"Parent","project_path":"/journeys/parent"}', "now"),
            )
            conn.execute(
                "insert into identity values (?, 'journey', ?, ?, ?)",
                ("child", "# Child", '{"parent_journey":"parent"}', "now"),
            )
            conn.commit()
            roots = module.load_journeys(conn)
            self.assertEqual([root["id"] for root in roots], ["parent"])
            self.assertEqual(roots[0]["children"][0]["id"], "child")
            self.assertEqual(roots[0]["projectPath"], "/journeys/parent")

    def test_script_has_no_conversation_materialization_surface(self) -> None:
        source = SCRIPT.read_text()
        for obsolete in ("write_local_conversations", "conversation-id", "list-conversations", "generate-conversation-title"):
            self.assertNotIn(obsolete, source)
        self.assertIn("mode=ro", source)


if __name__ == "__main__":
    unittest.main()
