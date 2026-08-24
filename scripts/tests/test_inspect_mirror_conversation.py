from __future__ import annotations

import json
import sqlite3
import unittest

from scripts.inspect_mirror_conversation import inspect_conversation


class MirrorConversationInspectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(
            """
            create table conversations (id text primary key, journey text);
            create table messages (
              id text primary key, conversation_id text, role text, content text,
              created_at text, metadata text
            );
            insert into conversations values ('mirror-a', 'journey-a');
            insert into messages values ('base-user', 'mirror-a', 'user', 'before', '2026-01-01T10:00:00Z', null);
            insert into messages values ('base-assistant', 'mirror-a', 'assistant', 'answer', '2026-01-01T10:01:00Z', null);
            """
        )

    def tearDown(self) -> None:
        self.conn.close()

    def inspect(self):
        return inspect_conversation(
            self.conn,
            journey_id="journey-a",
            conversation_id="mirror-a",
            base_message_id="base-assistant",
            base_message_count=2,
        )

    def test_returns_unchanged_exact_cursor(self) -> None:
        result = self.inspect()
        self.assertEqual(result["status"], "unchanged")
        self.assertEqual(result["fingerprint"]["lastMessageId"], "base-assistant")
        self.assertNotIn("messages", result)

    def test_returns_only_bounded_native_tail_and_allowlisted_correlation(self) -> None:
        metadata = json.dumps({
            "nautilus": {
                "turnId": "turn-1", "runId": "do-not-return", "phase": "user", "generation": 3,
                "piSessionId": "nautilus-journey-a", "harnessUserMessageId": "h-user",
                "secret": "do-not-return",
            },
            "private": "do-not-return",
        })
        self.conn.execute(
            "insert into messages values (?, ?, ?, ?, ?, ?)",
            ("new-user", "mirror-a", "user", "new fact", "2026-01-01T11:00:00Z", metadata),
        )
        self.conn.execute(
            "insert into messages values (?, ?, ?, ?, ?, ?)",
            ("new-assistant", "mirror-a", "assistant", "accepted", "2026-01-01T11:01:00Z", None),
        )
        result = self.inspect()
        self.assertEqual(result["status"], "advanced")
        self.assertEqual([item["id"] for item in result["messages"]], ["new-user", "new-assistant"])
        self.assertEqual(result["messages"][0]["correlation"], {
            "turnId": "turn-1", "phase": "user", "generation": 3,
            "piSessionId": "nautilus-journey-a", "harnessMessageId": "h-user",
        })
        self.assertNotIn("metadata", json.dumps(result))
        self.assertNotIn("secret", json.dumps(result))
        self.assertNotIn("runId", json.dumps(result))

    def test_rejects_wrong_conversation_cursor_regression_and_overflow(self) -> None:
        wrong = inspect_conversation(
            self.conn, journey_id="other", conversation_id="mirror-a",
            base_message_id="base-assistant", base_message_count=2,
        )
        self.assertEqual(wrong["reasonCode"], "mirror_conversation_mismatch")
        missing = inspect_conversation(
            self.conn, journey_id="journey-a", conversation_id="mirror-a",
            base_message_id="other", base_message_count=2,
        )
        self.assertEqual(missing["reasonCode"], "mirror_cursor_mismatch")
        for index in range(3):
            self.conn.execute(
                "insert into messages values (?, ?, ?, ?, ?, ?)",
                (f"tail-{index}", "mirror-a", "user", "x", f"2026-01-01T12:0{index}:00Z", None),
            )
        overflow = inspect_conversation(
            self.conn, journey_id="journey-a", conversation_id="mirror-a",
            base_message_id="base-assistant", base_message_count=2, limit=2,
        )
        self.assertEqual(overflow["reasonCode"], "tail_overflow")

    def test_marks_boundary_truncated_content_without_returning_the_remainder(self) -> None:
        self.conn.execute(
            "insert into messages values (?, ?, ?, ?, ?, ?)",
            ("large", "mirror-a", "user", "x" * 20_001, "2026-01-01T11:00:00Z", None),
        )
        result = self.inspect()
        self.assertTrue(result["messages"][0]["boundaryTruncated"])
        self.assertEqual(len(result["messages"][0]["content"]), 20_000)


if __name__ == "__main__":
    unittest.main()
