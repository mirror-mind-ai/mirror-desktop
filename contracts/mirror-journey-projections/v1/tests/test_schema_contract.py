from __future__ import annotations

import json
import re
import unittest
from datetime import datetime
from pathlib import Path, PurePosixPath

CONTRACT_ROOT = Path(__file__).resolve().parents[1]
IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$")
SENSITIVE_KEYS = {"prompt", "response", "transcript", "reasoning", "secret", "environment"}


def load(relative: str):
    return json.loads((CONTRACT_ROOT / relative).read_text(encoding="utf-8"))


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


class SchemaDocumentTests(unittest.TestCase):
    def test_all_schema_documents_are_json_schema_2020_12(self):
        for path in sorted((CONTRACT_ROOT / "schemas").glob("*.schema.json")):
            schema = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual("https://json-schema.org/draft/2020-12/schema", schema["$schema"])
            self.assertIn("$id", schema)

    def test_all_local_schema_references_resolve(self):
        schema_dir = CONTRACT_ROOT / "schemas"
        for path in sorted(schema_dir.glob("*.schema.json")):
            schema = json.loads(path.read_text(encoding="utf-8"))
            for node in walk(schema):
                reference = node.get("$ref")
                if not isinstance(reference, str) or reference.startswith("#"):
                    continue
                target = reference.split("#", 1)[0]
                self.assertTrue((schema_dir / target).exists(), f"missing {target} referenced by {path.name}")


class FixtureContractTests(unittest.TestCase):
    def test_operational_fixture_has_normative_envelope_and_hierarchy(self):
        document = load("fixtures/expected/operational.json")
        self.assertEqual("1.0", document["contractVersion"])
        self.assertEqual("1", document["schemaVersion"])
        self.assertEqual("projection-probe-journey", document["journeyId"])
        self.assertEqual(("operational", "ariad", "operational"), (document["altitude"], document["namespace"], document["projection"]))
        self.assertTrue(IDENTIFIER.fullmatch(document["snapshotId"]))
        self.assertTrue(document["generatedAt"].endswith("Z"))
        datetime.fromisoformat(document["generatedAt"].replace("Z", "+00:00"))
        self.assertEqual([], document["sourceSnapshots"])

        cv = document["content"]["roadmap"]["roots"][0]
        ds = cv["children"][0]
        child_types = {child["type"] for child in ds["children"]}
        self.assertEqual("capability_value", cv["type"])
        self.assertEqual("delivery_story", ds["type"])
        self.assertEqual({"user_story", "technical_story"}, child_types)
        self.assertEqual("CV-PROBE.DS-1.TS-1", document["content"]["activeWork"]["activeItem"])
        self.assertEqual(1, len(document["content"]["exploratoryStories"]))
        self.assertEqual(1, len(document["content"]["refinementStories"][0]["changeRequests"]))

    def test_all_published_paths_are_relative_and_confined(self):
        documents = [
            load("fixtures/expected/operational.json"),
            load("fixtures/expected/manifest.json"),
        ]
        for document in documents:
            for node in walk(document):
                for key, value in node.items():
                    if key not in {"path", "plan", "validation", "done"} or not isinstance(value, str):
                        continue
                    pure = PurePosixPath(value)
                    self.assertFalse(pure.is_absolute(), value)
                    self.assertNotIn("..", pure.parts, value)

    def test_fixtures_contain_no_private_evidence_fields(self):
        for path in sorted((CONTRACT_ROOT / "fixtures").rglob("*.json")):
            document = json.loads(path.read_text(encoding="utf-8"))
            for node in walk(document):
                lowered = {str(key).lower() for key in node}
                self.assertTrue(lowered.isdisjoint(SENSITIVE_KEYS), f"sensitive field in {path}")

    def test_valid_and_invalid_candidates_are_intentionally_distinct(self):
        valid = load("fixtures/candidates/valid-extension-projection.json")
        invalid = load("fixtures/candidates/invalid-extension-projection.json")
        self.assertEqual("1", valid["schemaVersion"])
        self.assertIn("content", valid)
        self.assertEqual("0", invalid["schemaVersion"])
        self.assertNotIn("content", invalid)


if __name__ == "__main__":
    unittest.main()
