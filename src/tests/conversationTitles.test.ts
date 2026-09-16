import { describe, expect, it } from "vitest";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import {
  conversationTitleExists,
  nextDesktopConversationTitle,
  normalizeConversationTitle,
  validateConversationTitle,
} from "../app/conversationTitles";

function entry(kind: "desktop_conversation" | "mirror_history", conversationId: string, title: string): ConversationCatalogEntry {
  if (kind === "mirror_history") return {
    kind, conversationId, title, updatedAt: "2026-01-01T00:00:00Z", messageCount: 2, availability: "available_in_mirror",
  };
  return {
    kind, conversationId, threadId: `thread-${conversationId}`, title, updatedAt: "2026-01-01T00:00:00Z",
    messageCount: 0, availability: "ready", authority: {
      activeGeneration: 1, runtimeChannel: "development", generations: [{
        generation: 1, status: "ready", piSessionId: `session-${conversationId}`,
        piSessionFile: `/tmp/${conversationId}.jsonl`, mirrorConversationId: `mirror-${conversationId}`,
        createdAt: "2026-01-01T00:00:00Z", activatedAt: "2026-01-01T00:00:00Z", activationReceipt: {
          schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: `thread-${conversationId}`,
          generation: 1, piSessionId: `session-${conversationId}`, mirrorConversationId: `mirror-${conversationId}`,
          mode: "mirror", commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-01-01T00:00:00Z",
        },
      }],
    },
  };
}

const entries = [
  entry("desktop_conversation", "one", "New Conversation #1"),
  entry("mirror_history", "mirror-two", "  Design   review  "),
  entry("desktop_conversation", "three", "New Conversation #3"),
];

describe("Conversation titles", () => {
  it("normalizes whitespace and compares case-insensitively across visible Conversation kinds", () => {
    expect(normalizeConversationTitle("  Design   review ")).toBe("Design review");
    expect(conversationTitleExists(entries, "design REVIEW")).toBe(true);
    expect(validateConversationTitle(entries, " DESIGN review ")).toBe("Another Conversation already uses this title.");
  });

  it("proposes the first available numbered title", () => {
    expect(nextDesktopConversationTitle(entries)).toBe("New Conversation #2");
  });

  it("allows a rename to retain its own normalized title but rejects empty and oversized titles", () => {
    expect(validateConversationTitle(entries, "new conversation #1", {
      kind: "desktop_conversation", conversationId: "one",
    })).toBeUndefined();
    expect(validateConversationTitle(entries, "   ")).toBe("Enter a Conversation title.");
    expect(validateConversationTitle(entries, "x".repeat(161))).toContain("160");
  });
});
