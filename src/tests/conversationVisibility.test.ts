import { describe, expect, it } from "vitest";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import {
  EMPTY_HIDDEN_CONVERSATIONS,
  MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY,
  conversationVisibilityKey,
  hideConversation,
  isConversationHidden,
  parseHiddenConversations,
  partitionConversationVisibility,
  revealAllConversations,
  revealConversation,
  sanitizeHiddenConversations,
} from "../domain/conversationVisibility";
import type { JourneyRegistry } from "../domain/journeyRegistry";

function desktop(conversationId: string, threadId = `thread-${conversationId}`): ConversationCatalogEntry {
  return {
    kind: "desktop_conversation",
    conversationId,
    threadId,
    title: `Desktop ${conversationId}`,
    updatedAt: "2026-10-09T10:00:00.000Z",
    messageCount: 4,
    availability: "ready",
    authority: { activeGeneration: 1, runtimeChannel: "user", generations: [] },
  };
}

function mirror(conversationId: string): ConversationCatalogEntry {
  return {
    kind: "mirror_history",
    conversationId,
    title: `Mirror ${conversationId}`,
    updatedAt: "2026-10-08T10:00:00.000Z",
    messageCount: 12,
    availability: "available_in_mirror",
  };
}

// Fully typed on purpose: the first version of this fixture was cast through `unknown` and the
// cast hid a wrong field name until the test ran.
const registry: JourneyRegistry = {
  schemaVersion: "0.1.0",
  source: "fixture",
  syncedAt: "2026-10-09T10:00:00.000Z",
  roots: [{ id: "mirror-desktop", name: "Mirror Desktop", children: [] }],
};

describe("CR135: the hidden key is composite", () => {
  it("distinguishes a Desktop entry from a Mirror entry that share an identifier", () => {
    const shared = "a1b2c3";
    expect(conversationVisibilityKey(desktop(shared))).not.toEqual(conversationVisibilityKey(mirror(shared)));
  });

  it("hiding a Mirror entry does not hide the Desktop entry with the same identifier", () => {
    const shared = "a1b2c3";
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", mirror(shared));
    expect(isConversationHidden(hidden, "mirror-desktop", mirror(shared))).toBe(true);
    expect(isConversationHidden(hidden, "mirror-desktop", desktop(shared))).toBe(false);
  });

  it("keeps one Journey's choice out of another's", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", desktop("one"));
    expect(isConversationHidden(hidden, "builder-mode-evolution", desktop("one"))).toBe(false);
  });
});

describe("CR135: hiding is reversible and loses nothing", () => {
  it("reveals exactly what was hidden", () => {
    const first = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", desktop("one"));
    const second = hideConversation(first, "mirror-desktop", mirror("two"));
    const revealed = revealConversation(second, "mirror-desktop", desktop("one"));
    expect(isConversationHidden(revealed, "mirror-desktop", desktop("one"))).toBe(false);
    expect(isConversationHidden(revealed, "mirror-desktop", mirror("two"))).toBe(true);
  });

  it("drops the Journey entirely once nothing is hidden, so empty and absent cannot disagree", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", desktop("one"));
    expect(revealConversation(hidden, "mirror-desktop", desktop("one"))).toEqual({});
    expect(revealAllConversations(hidden, "mirror-desktop")).toEqual({});
  });

  it("is idempotent in both directions", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", desktop("one"));
    expect(hideConversation(hidden, "mirror-desktop", desktop("one"))).toBe(hidden);
    expect(revealConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", desktop("one"))).toBe(EMPTY_HIDDEN_CONVERSATIONS);
  });

  it("refuses to grow past the per-Journey bound instead of unbounded accumulation", () => {
    let hidden = EMPTY_HIDDEN_CONVERSATIONS;
    for (let index = 0; index < MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY + 5; index += 1) {
      hidden = hideConversation(hidden, "mirror-desktop", desktop(`c${index}`));
    }
    expect(hidden["mirror-desktop"]).toHaveLength(MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY);
  });

  it("can hide an entry that needs attention, because hiding mutates nothing it could damage", () => {
    const broken: ConversationCatalogEntry = { ...desktop("broken"), availability: "needs_attention" };
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", broken);
    expect(isConversationHidden(hidden, "mirror-desktop", broken)).toBe(true);
  });
});

describe("CR135: hiding filters the rendered list and never the catalog", () => {
  const entries = [desktop("one"), mirror("two"), desktop("three")];

  it("partitions without dropping or reordering anything", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", mirror("two"));
    const partition = partitionConversationVisibility({ entries, hidden, journeyId: "mirror-desktop" });
    expect(partition.visible.map((entry) => entry.conversationId)).toEqual(["one", "three"]);
    expect(partition.hidden.map((entry) => entry.conversationId)).toEqual(["two"]);
    expect(partition.visible.length + partition.hidden.length).toBe(entries.length);
  });

  it("preserves provenance for both kinds in the hidden partition", () => {
    let hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", mirror("two"));
    hidden = hideConversation(hidden, "mirror-desktop", desktop("three"));
    const partition = partitionConversationVisibility({ entries, hidden, journeyId: "mirror-desktop" });
    expect(partition.hidden.map((entry) => entry.kind)).toEqual(["mirror_history", "desktop_conversation"]);
  });

  it("renders a hidden conversation that is selected, marked, so two surfaces cannot disagree", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", mirror("two"));
    const partition = partitionConversationVisibility({
      entries,
      hidden,
      journeyId: "mirror-desktop",
      selected: { kind: "mirror_history", journeyId: "mirror-desktop", conversationId: "two" },
    });
    expect(partition.visible.map((entry) => entry.conversationId)).toEqual(["one", "two", "three"]);
    expect(partition.hidden).toEqual([]);
    expect(partition.shownBecauseSelected).toBe("mirror_history:two");
  });

  it("does not treat a Journey workspace selection as a conversation", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", mirror("two"));
    const partition = partitionConversationVisibility({
      entries,
      hidden,
      journeyId: "mirror-desktop",
      selected: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    });
    expect(partition.hidden.map((entry) => entry.conversationId)).toEqual(["two"]);
    expect(partition.shownBecauseSelected).toBeUndefined();
  });

  it("leaves a stale key inert rather than failing", () => {
    const partition = partitionConversationVisibility({
      entries,
      hidden: { "mirror-desktop": ["desktop_conversation:deleted-long-ago"] },
      journeyId: "mirror-desktop",
    });
    expect(partition.visible).toHaveLength(3);
    expect(partition.hidden).toEqual([]);
  });
});

describe("CR135: persistence degrades without collateral", () => {
  it("accepts a well-formed map and drops Journeys with nothing hidden", () => {
    expect(parseHiddenConversations({ "mirror-desktop": ["desktop_conversation:one"], empty: [] }))
      .toEqual({ "mirror-desktop": ["desktop_conversation:one"] });
  });

  it("de-duplicates repeated keys", () => {
    expect(parseHiddenConversations({ a: ["mirror_history:x", "mirror_history:x"] }))
      .toEqual({ a: ["mirror_history:x"] });
  });

  it("rejects shapes it cannot trust", () => {
    expect(parseHiddenConversations(["mirror_history:x"])).toBeUndefined();
    expect(parseHiddenConversations({ a: "mirror_history:x" })).toBeUndefined();
    expect(parseHiddenConversations({ a: [7] })).toBeUndefined();
    expect(parseHiddenConversations({ "  ": ["mirror_history:x"] })).toBeUndefined();
    expect(parseHiddenConversations(undefined)).toBeUndefined();
  });

  it("forgets a Journey the registry no longer has", () => {
    const sanitized = sanitizeHiddenConversations(
      { "mirror-desktop": ["desktop_conversation:one"], departed: ["mirror_history:two"] },
      registry,
    );
    expect(sanitized).toEqual({ "mirror-desktop": ["desktop_conversation:one"] });
  });
});
