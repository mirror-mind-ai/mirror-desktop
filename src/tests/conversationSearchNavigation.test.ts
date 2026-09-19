import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "../agent/piTaskPacket";
import {
  clampConversationNavigationIndex,
  createConversationTurnNavigationItems,
  findConversationSearchMatches,
} from "../app/conversationSearchNavigation";

const messages: ConversationMessage[] = [
  { id: "user-1", role: "user", content: "Find the first Mirror note.", createdAt: "2026-09-19T10:00:00Z" },
  { id: "assistant-1", role: "assistant", content: "Mirror appears again. Another mirror appears later.", createdAt: "2026-09-19T10:00:01Z" },
  { id: "user-2", role: "user", content: "No matching keyword here.", createdAt: "2026-09-19T10:00:02Z" },
];

describe("conversation search and turn navigation", () => {
  it("finds materialized text matches in active conversation order", () => {
    const matches = findConversationSearchMatches(messages, "mirror");

    expect(matches.map((match) => [match.messageId, match.matchOrdinal])).toEqual([
      ["user-1", 1],
      ["assistant-1", 2],
      ["assistant-1", 3],
    ]);
  });

  it("reports no matches for empty or absent queries", () => {
    expect(findConversationSearchMatches(messages, "   ")).toEqual([]);
    expect(findConversationSearchMatches(messages, "absent")).toEqual([]);
  });

  it("lists only user turns from newest to oldest with plain-text snippets", () => {
    const formatted: ConversationMessage[] = [
      { id: "user-1", role: "user", content: "# First **Mirror** [note](https://example.com)", createdAt: "2026-09-19T10:00:00Z" },
      { id: "assistant-1", role: "assistant", content: "Assistant response", createdAt: "2026-09-19T10:00:01Z" },
      { id: "user-2", role: "user", content: "<p>Latest <em>request</em> &amp; context</p>", createdAt: "2026-09-19T10:00:02Z" },
    ];

    expect(createConversationTurnNavigationItems(formatted)).toEqual([
      { messageId: "user-2", ordinal: 2, snippet: "Latest request & context" },
      { messageId: "user-1", ordinal: 1, snippet: "First Mirror note" },
    ]);
  });

  it("wraps search navigation without leaving active conversation scope", () => {
    expect(clampConversationNavigationIndex(-1, 3)).toBe(2);
    expect(clampConversationNavigationIndex(3, 3)).toBe(0);
    expect(clampConversationNavigationIndex(1, 3)).toBe(1);
    expect(clampConversationNavigationIndex(1, 0)).toBe(0);
  });
});
