import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import catalogStateSource from "../app/conversationCatalogState.ts?raw";
import sidebarSource from "../app/FocusedConversationSidebar.tsx?raw";
import {
  EMPTY_HIDDEN_CONVERSATIONS,
  hideConversation,
} from "../domain/conversationVisibility";
import {
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
} from "../domain/journeyPreferencePersistence";

// Slices to the function's own closing brace. Written this way in CR134 after an anchor that
// stopped at "the next function this test knows about" started reading a neighbour's body.
function bodyOf(source: string, declaration: string) {
  const start = source.indexOf(declaration);
  expect(start).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf("\n  }\n", start) + 4);
}

describe("CR135: hiding filters the render and never the catalog", () => {
  it("keeps the catalog state module ignorant of visibility", () => {
    // If the catalog could be filtered, CR134's route would lose a hidden conversation and
    // RS023's reachability criterion would depend on vigilance instead of structure.
    expect(catalogStateSource).not.toMatch(/hidden/i);
    expect(catalogStateSource).not.toContain("conversationVisibility");
  });

  it("resolves CR134's route from the catalog, with no visibility filter in its path", () => {
    const route = bodyOf(appSource, "async function navigateToJourneyWorkOwner(");
    expect(route).toContain("journeyCatalogState(conversationCatalogs, owner.journeyId)");
    expect(route).toContain("loaded.entries");
    expect(route).not.toMatch(/hidden/i);
    expect(route).not.toContain("partitionConversationVisibility");
  });

  it("never changes what is hidden while expanding or routing", () => {
    expect(bodyOf(appSource, "async function expandJourneyConversations(")).not.toContain("setHiddenConversations");
    expect(bodyOf(appSource, "async function navigateToJourneyWorkOwner(")).not.toContain("setHiddenConversations");
    expect(bodyOf(appSource, "function selectJourney(")).not.toContain("setHiddenConversations");
  });

  it("forgets a deleted conversation's visibility so a reused identifier cannot inherit it", () => {
    const deletion = bodyOf(appSource, "async function confirmDesktopConversationDeletion(");
    expect(deletion).toContain("forgetConversationVisibility(current, selectedJourney, entry)");
  });
});

describe("CR135: the Navigator's choice and the app's cap stay disjoint", () => {
  it("applies the cap to the visible set only", () => {
    expect(sidebarSource).toContain("partition.visible.slice(0, INITIAL_VISIBLE_CONVERSATIONS)");
    expect(sidebarSource).toContain("partition.visible.length - visibleEntries.length");
    // The old arithmetic counted everything the cap withheld, which after this CR would have
    // folded the Navigator's deliberate choice into a number they never chose.
    expect(sidebarSource).not.toContain("props.entries.slice(0, INITIAL_VISIBLE_CONVERSATIONS)");
    expect(sidebarSource).not.toContain("props.entries.length - visibleEntries.length");
  });

  it("counts the hidden set separately from the cap", () => {
    expect(sidebarSource).toContain("Show {cappedCount} more");
    expect(sidebarSource).toContain("{partition.hidden.length} hidden");
  });

  it("keeps the heading reporting the factual total", () => {
    expect(sidebarSource).toContain("aria-label={`${props.entries.length} conversations`}");
  });
});

describe("CR135: a lost visibility choice costs nothing else", () => {
  it("degrades an unreadable hidden map to empty while the rest of the file survives", () => {
    const parsed = parsePersistedJourneyPreferences({
      schemaVersion: "0.1.0",
      preferences: {
        ...defaultJourneyPreferenceState,
        pinnedJourneyIds: ["mirror-desktop"],
        applicationTheme: "ember",
        hiddenConversationIdsByJourneyId: { "mirror-desktop": [7, false] },
      },
      savedAt: "2026-10-09T10:00:00.000Z",
    });
    expect(parsed?.preferences.hiddenConversationIdsByJourneyId).toEqual({});
    expect(parsed?.preferences.pinnedJourneyIds).toEqual(["mirror-desktop"]);
    expect(parsed?.preferences.applicationTheme).toBe("ember");
  });

  it("round-trips a real choice", () => {
    const hidden = hideConversation(EMPTY_HIDDEN_CONVERSATIONS, "mirror-desktop", {
      kind: "mirror_history", conversationId: "abc123",
    });
    const parsed = parsePersistedJourneyPreferences({
      schemaVersion: "0.1.0",
      preferences: { ...defaultJourneyPreferenceState, hiddenConversationIdsByJourneyId: hidden },
      savedAt: "2026-10-09T10:00:00.000Z",
    });
    expect(parsed?.preferences.hiddenConversationIdsByJourneyId).toEqual({
      "mirror-desktop": ["mirror_history:abc123"],
    });
  });

  it("persists and restores the choice through the application's own wiring", () => {
    expect(appSource).toContain("hiddenConversationIdsByJourneyId: hiddenConversations,");
    expect(appSource).toContain("setHiddenConversations(sanitizedPreferences.hiddenConversationIdsByJourneyId);");
  });
});
