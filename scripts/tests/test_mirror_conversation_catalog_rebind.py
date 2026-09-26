"""CR093: the bundled catalog script must restore a drifted Journey binding.

Mirror core can rewrite ``conversations.journey`` for a Conversation that Mirror Desktop
provisioned, which makes the explicit append contract reject every later delivery with
``journey_mismatch``. The Desktop cannot change Mirror core, so it re-asserts the binding it
owns through this bundled support script. These tests exercise the script as a black box
against a fake Mirror runtime, so they prove the command contract rather than the Mirror
internals.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPOSITORY = Path(__file__).parents[2]
SCRIPT = REPOSITORY / "scripts" / "mirror_conversation_catalog.py"

FAKE_MEMORY = '''
import json
from pathlib import Path


class _Conversation:
    def __init__(self, record):
        self.id = record["id"]
        self.journey = record["journey"]
        self.title = record.get("title")
        self.persona = record.get("persona")


class _Conversations:
    def __init__(self, client):
        self._client = client

    def find_by_id_prefix(self, prefix):
        for record in self._client.state["conversations"]:
            if record["id"].startswith(prefix):
                return _Conversation(record)
        return None


class _Store:
    def __init__(self, client):
        self._client = client

    def update_conversation(self, conversation_id, **kwargs):
        for record in self._client.state["conversations"]:
            if record["id"] == conversation_id:
                record.update(kwargs)
                self._client.state.setdefault("writes", []).append(
                    {"conversationId": conversation_id, "values": kwargs}
                )
                self._client.save()
                return
        raise AssertionError("fake Mirror was asked to update an unknown conversation")


class MemoryClient:
    def __init__(self, db_path=None):
        self.path = Path(db_path)
        self.state = json.loads(self.path.read_text(encoding="utf-8"))
        self.conversations = _Conversations(self)
        self.store = _Store(self)

    def save(self):
        self.path.write_text(json.dumps(self.state, indent=1), encoding="utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False
'''

FAKE_CLI_COMMON = '''
from pathlib import Path


def db_path_from_mirror_home(mirror_home):
    return Path(mirror_home) / "state.json"
'''


class RebindJourneyTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temp = tempfile.TemporaryDirectory()
        self.root = Path(self._temp.name)
        memory = self.root / "runtime" / "src" / "memory"
        (memory / "cli").mkdir(parents=True)
        (memory / "__init__.py").write_text(FAKE_MEMORY, encoding="utf-8")
        (memory / "cli" / "__init__.py").write_text("", encoding="utf-8")
        (memory / "cli" / "common.py").write_text(FAKE_CLI_COMMON, encoding="utf-8")
        self.mirror_root = self.root / "runtime"
        self.mirror_home = self.root / "home"
        self.mirror_home.mkdir()
        self.state_path = self.mirror_home / "state.json"

    def tearDown(self) -> None:
        self._temp.cleanup()

    def write_state(self, conversations: list[dict[str, object]]) -> None:
        self.state_path.write_text(
            json.dumps({"conversations": conversations}, indent=1), encoding="utf-8"
        )

    def read_state(self) -> dict:
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def invoke(self, journey_id: str, conversation_id: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable, str(SCRIPT), "rebind-journey",
                "--journey-id", journey_id,
                "--conversation-id", conversation_id,
                "--mirror-root", str(self.mirror_root),
                "--mirror-home", str(self.mirror_home),
            ],
            capture_output=True, text=True, check=False,
        )

    def last_line(self, completed: subprocess.CompletedProcess[str]) -> dict:
        lines = [line for line in completed.stdout.splitlines() if line.strip()]
        self.assertTrue(lines, f"no response: {completed.stderr}")
        return json.loads(lines[-1])

    def test_restores_a_drifted_journey_binding(self) -> None:
        self.write_state([
            {"id": "792b9bf0aaaa", "journey": "alissonvale-com", "title": "Continue RS to Beta"},
        ])
        completed = self.invoke("mirror-desktop", "792b9bf0aaaa")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        response = self.last_line(completed)
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["operation"], "rebind-journey")
        self.assertEqual(response["journeyId"], "mirror-desktop")
        self.assertEqual(response["conversationId"], "792b9bf0aaaa")
        self.assertTrue(response["rebound"])
        self.assertEqual(response["previousJourneyId"], "alissonvale-com")
        state = self.read_state()
        self.assertEqual(state["conversations"][0]["journey"], "mirror-desktop")

    def test_restores_only_the_journey_column(self) -> None:
        self.write_state([
            {
                "id": "792b9bf0aaaa", "journey": "alissonvale-com",
                "title": "Continue RS to Beta", "persona": "product-designer",
            },
        ])
        self.assertEqual(self.invoke("mirror-desktop", "792b9bf0aaaa").returncode, 0)
        state = self.read_state()
        self.assertEqual(state["writes"], [
            {"conversationId": "792b9bf0aaaa", "values": {"journey": "mirror-desktop"}},
        ])
        self.assertEqual(state["conversations"][0]["title"], "Continue RS to Beta")
        self.assertEqual(state["conversations"][0]["persona"], "product-designer")

    def test_reports_an_already_correct_binding_without_writing(self) -> None:
        self.write_state([{"id": "792b9bf0aaaa", "journey": "mirror-desktop"}])
        response = self.last_line(self.invoke("mirror-desktop", "792b9bf0aaaa"))
        self.assertEqual(response["status"], "ok")
        self.assertFalse(response["rebound"])
        self.assertEqual(response["previousJourneyId"], "mirror-desktop")
        self.assertNotIn("writes", self.read_state())

    def test_reports_an_absent_journey_binding_as_rebound(self) -> None:
        self.write_state([{"id": "792b9bf0aaaa", "journey": None}])
        response = self.last_line(self.invoke("mirror-desktop", "792b9bf0aaaa"))
        self.assertTrue(response["rebound"])
        self.assertIsNone(response["previousJourneyId"])
        self.assertEqual(self.read_state()["conversations"][0]["journey"], "mirror-desktop")

    def test_rejects_an_unknown_conversation(self) -> None:
        self.write_state([{"id": "792b9bf0aaaa", "journey": "mirror-desktop"}])
        completed = self.invoke("mirror-desktop", "ffffffffffff")
        self.assertEqual(completed.returncode, 2)
        response = self.last_line(completed)
        self.assertEqual(response["status"], "rejected")
        self.assertEqual(response["reason"], "conversation_unavailable")
        self.assertNotIn("writes", self.read_state())

    def test_rejects_a_prefix_that_is_not_the_exact_conversation_id(self) -> None:
        self.write_state([{"id": "792b9bf0aaaa", "journey": "alissonvale-com"}])
        completed = self.invoke("mirror-desktop", "792b9bf0aaa")
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(self.last_line(completed)["reason"], "conversation_unavailable")
        self.assertEqual(self.read_state()["conversations"][0]["journey"], "alissonvale-com")

    def test_rejects_an_invalid_journey_id(self) -> None:
        self.write_state([{"id": "792b9bf0aaaa", "journey": "alissonvale-com"}])
        completed = self.invoke("Mirror Desktop", "792b9bf0aaaa")
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(self.last_line(completed)["reason"], "invalid_journey_id")

    def test_rejects_a_missing_conversation_id(self) -> None:
        self.write_state([{"id": "792b9bf0aaaa", "journey": "alissonvale-com"}])
        completed = subprocess.run(
            [
                sys.executable, str(SCRIPT), "rebind-journey",
                "--journey-id", "mirror-desktop",
                "--mirror-root", str(self.mirror_root),
                "--mirror-home", str(self.mirror_home),
            ],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(self.last_line(completed)["reason"], "invalid_conversation_id")


if __name__ == "__main__":
    unittest.main()
