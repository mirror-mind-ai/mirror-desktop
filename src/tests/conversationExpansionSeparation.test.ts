import { describe, expect, it } from "vitest";
import {
  EMPTY_CONVERSATION_EXPANSION,
  conversationExpansionActionTypes,
  conversationSelectionActionTypes,
  createJourneyWorkspaceSelection,
  reduceConversationExpansion,
  reduceConversationSelection,
  resolveSelectedConversationSpace,
  type ConversationExpansionAction,
  type ConversationSelectionAction,
} from "../domain/conversationSpaces";
import {
  EMPTY_JOURNEY_CONVERSATION_CATALOGS,
  beginJourneyCatalogLoad,
  completeJourneyCatalogLoad,
  failJourneyCatalogLoad,
  journeyCatalogState,
  updateJourneyCatalogEntries,
} from "../app/conversationCatalogState";
import {
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
  sanitizeJourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";
import { reconcileReloadedJourneyState } from "../domain/journeyRegistry";

const registry = {
  schemaVersion: "0.1.0" as const,
  source: "fixture" as const,
  syncedAt: "2026-10-08T00:00:00.000Z",
  roots: [
    { id: "journey-a", name: "Journey A", breadcrumb: ["Journey A"] },
    { id: "journey-b", name: "Journey B", breadcrumb: ["Journey B"] },
  ],
};

function entry(conversationId: string) {
  return {
    kind: "mirror_history" as const,
    conversationId,
    title: conversationId,
    updatedAt: "2026-10-08T00:00:00.000Z",
    messageCount: 1,
    availability: "available_in_mirror" as const,
  };
}

describe("CR133: structural visibility is separate from selection", () => {
  // The defect this CR repairs was one value carrying both concerns, so the
  // separation is asserted over every action rather than on a sample.
  it("gives expansion and selection disjoint action vocabularies", () => {
    const shared = conversationExpansionActionTypes
      .filter((type) => (conversationSelectionActionTypes as readonly string[]).includes(type));
    expect(shared).toEqual([]);
    expect(conversationExpansionActionTypes).toEqual(["expand", "collapse", "restore"]);
    expect(conversationSelectionActionTypes).toEqual(["select_root", "select_desktop", "select_mirror"]);
  });

  it("never changes selection through an expansion action", () => {
    const selection = createJourneyWorkspaceSelection("journey-a");
    const actions: ConversationExpansionAction[] = [
      { type: "expand", journeyId: "journey-b" },
      { type: "collapse", journeyId: "journey-a" },
      { type: "restore", journeyIds: ["journey-a", "journey-b"] },
    ];
    for (const action of actions) {
      const before = new Set(["journey-a"]);
      const after = reduceConversationExpansion(before, action);
      expect(after).not.toBe(before);
      // The selection value is untouched because it is not reachable from here.
      expect(selection).toEqual(createJourneyWorkspaceSelection("journey-a"));
    }
  });

  it("never changes expansion through a selection action", () => {
    const expansion = reduceConversationExpansion(EMPTY_CONVERSATION_EXPANSION, { type: "expand", journeyId: "journey-a" });
    const actions: ConversationSelectionAction[] = [
      { type: "select_root", journeyId: "journey-b" },
      { type: "select_desktop", journeyId: "journey-b", conversationId: "desktop-conversation-1" },
      { type: "select_mirror", journeyId: "journey-b", conversationId: "mirror-conv" },
    ];
    for (const action of actions) {
      reduceConversationSelection(createJourneyWorkspaceSelection("journey-a"), action);
      expect([...expansion]).toEqual(["journey-a"]);
    }
  });

  it("expands and collapses only the named Journey and keeps the others open", () => {
    let expansion = reduceConversationExpansion(EMPTY_CONVERSATION_EXPANSION, { type: "expand", journeyId: "journey-a" });
    expansion = reduceConversationExpansion(expansion, { type: "expand", journeyId: "journey-b" });
    expect([...expansion].sort()).toEqual(["journey-a", "journey-b"]);
    expansion = reduceConversationExpansion(expansion, { type: "collapse", journeyId: "journey-a" });
    expect([...expansion]).toEqual(["journey-b"]);
  });

  it("refuses an invalid Journey coordinate instead of expanding it", () => {
    expect(reduceConversationExpansion(EMPTY_CONVERSATION_EXPANSION, { type: "expand", journeyId: "../escape" }))
      .toBe(EMPTY_CONVERSATION_EXPANSION);
    expect([...reduceConversationExpansion(EMPTY_CONVERSATION_EXPANSION, {
      type: "restore", journeyIds: ["journey-a", "../escape", ""],
    })]).toEqual(["journey-a"]);
  });

  it("selects a conversation in a Journey that is not the selected one", () => {
    const selection = reduceConversationSelection(createJourneyWorkspaceSelection("journey-a"), {
      type: "select_desktop", journeyId: "journey-b", conversationId: "desktop-conversation-1",
    });
    expect(selection).toEqual({ kind: "desktop_conversation", journeyId: "journey-b", conversationId: "desktop-conversation-1" });
  });

  it("rejects an invalid conversation coordinate and keeps the previous selection", () => {
    const previous = createJourneyWorkspaceSelection("journey-a");
    expect(reduceConversationSelection(previous, { type: "select_desktop", journeyId: "journey-a", conversationId: "short" })).toBe(previous);
    expect(reduceConversationSelection(previous, { type: "select_root", journeyId: "../escape" })).toBe(previous);
  });

  // The guard that used to live in the reducer now lives where the value is read.
  it("ignores a selection belonging to another Journey when resolving the selected space", () => {
    const foreign = { kind: "desktop_conversation" as const, journeyId: "journey-b", conversationId: "desktop-conversation-1" };
    expect(resolveSelectedConversationSpace(foreign, "journey-a")).toEqual(createJourneyWorkspaceSelection("journey-a"));
    expect(resolveSelectedConversationSpace(foreign, "journey-b")).toBe(foreign);
  });
});

describe("CR133: the conversation catalog is per Journey", () => {
  it("keeps one Journey's catalog while another loads and fails", () => {
    let catalogs = beginJourneyCatalogLoad(EMPTY_JOURNEY_CONVERSATION_CATALOGS, "journey-a", 1);
    catalogs = completeJourneyCatalogLoad(catalogs, "journey-a", 1, { entries: [entry("mirror-a")], rootThreadId: "thread-root-a" });
    catalogs = beginJourneyCatalogLoad(catalogs, "journey-b", 2);
    catalogs = failJourneyCatalogLoad(catalogs, "journey-b", 2, "Conversations are unavailable.");

    expect(journeyCatalogState(catalogs, "journey-a")).toMatchObject({
      status: "ready", rootThreadId: "thread-root-a",
    });
    expect(journeyCatalogState(catalogs, "journey-a").entries.map((item) => item.conversationId)).toEqual(["mirror-a"]);
    expect(journeyCatalogState(catalogs, "journey-b")).toMatchObject({ status: "error", error: "Conversations are unavailable." });
    expect(journeyCatalogState(catalogs, "journey-b").entries).toEqual([]);
  });

  it("reports an unknown Journey as idle and empty without inventing state", () => {
    expect(journeyCatalogState(EMPTY_JOURNEY_CONVERSATION_CATALOGS, "journey-a")).toEqual({
      entries: [], status: "idle", requestId: 0,
    });
  });

  it("discards a load that a newer request for the same Journey superseded", () => {
    let catalogs = beginJourneyCatalogLoad(EMPTY_JOURNEY_CONVERSATION_CATALOGS, "journey-a", 1);
    catalogs = beginJourneyCatalogLoad(catalogs, "journey-a", 2);
    const stale = completeJourneyCatalogLoad(catalogs, "journey-a", 1, { entries: [entry("mirror-stale")], rootThreadId: "thread-stale" });
    expect(stale).toBe(catalogs);
    expect(failJourneyCatalogLoad(catalogs, "journey-a", 1, "stale failure")).toBe(catalogs);

    const fresh = completeJourneyCatalogLoad(catalogs, "journey-a", 2, { entries: [entry("mirror-fresh")], rootThreadId: "thread-fresh" });
    expect(journeyCatalogState(fresh, "journey-a").entries.map((item) => item.conversationId)).toEqual(["mirror-fresh"]);
  });

  it("updates one Journey's entries without touching another's", () => {
    let catalogs = beginJourneyCatalogLoad(EMPTY_JOURNEY_CONVERSATION_CATALOGS, "journey-a", 1);
    catalogs = completeJourneyCatalogLoad(catalogs, "journey-a", 1, { entries: [entry("mirror-a")], rootThreadId: "thread-root-a" });
    catalogs = beginJourneyCatalogLoad(catalogs, "journey-b", 2);
    catalogs = completeJourneyCatalogLoad(catalogs, "journey-b", 2, { entries: [entry("mirror-b")], rootThreadId: "thread-root-b" });

    const updated = updateJourneyCatalogEntries(catalogs, "journey-a", (entries) => [...entries, entry("mirror-a2")]);
    expect(journeyCatalogState(updated, "journey-a").entries.map((item) => item.conversationId)).toEqual(["mirror-a", "mirror-a2"]);
    expect(journeyCatalogState(updated, "journey-b").entries.map((item) => item.conversationId)).toEqual(["mirror-b"]);
  });
});

describe("CR133: expansion survives a reload", () => {
  it("round-trips the expanded set through the preference file", () => {
    const persisted = parsePersistedJourneyPreferences({
      schemaVersion: "0.1.0",
      savedAt: "2026-10-08T00:00:00.000Z",
      preferences: {
        ...defaultJourneyPreferenceState,
        expandedConversationJourneyIds: ["journey-a", "journey-b"],
      },
    });
    expect(persisted?.preferences.expandedConversationJourneyIds).toEqual(["journey-a", "journey-b"]);
  });

  it("treats an absent expanded set as empty", () => {
    const { expandedConversationJourneyIds: _omitted, ...withoutField } = defaultJourneyPreferenceState;
    const persisted = parsePersistedJourneyPreferences({
      schemaVersion: "0.1.0",
      savedAt: "2026-10-08T00:00:00.000Z",
      preferences: withoutField,
    });
    expect(persisted?.preferences.expandedConversationJourneyIds).toEqual([]);
    expect(defaultJourneyPreferenceState.expandedConversationJourneyIds).toEqual([]);
  });

  // Stated departure from the sibling fields: cosmetic renderer state must never be
  // able to discard the Navigator's pins, theme or recents.
  it("drops an invalid expanded set without discarding the rest of the preferences", () => {
    const persisted = parsePersistedJourneyPreferences({
      schemaVersion: "0.1.0",
      savedAt: "2026-10-08T00:00:00.000Z",
      preferences: {
        ...defaultJourneyPreferenceState,
        pinnedJourneyIds: ["journey-a"],
        applicationTheme: "daylight",
        expandedConversationJourneyIds: "not-an-array",
      },
    });
    expect(persisted).toBeDefined();
    expect(persisted?.preferences.expandedConversationJourneyIds).toEqual([]);
    expect(persisted?.preferences.pinnedJourneyIds).toEqual(["journey-a"]);
    expect(persisted?.preferences.applicationTheme).toBe("daylight");
  });

  it("drops expanded Journeys that no longer exist on reload", () => {
    expect(sanitizeJourneyPreferenceState({
      ...defaultJourneyPreferenceState,
      expandedConversationJourneyIds: ["journey-a", "journey-gone"],
    }, registry).expandedConversationJourneyIds).toEqual(["journey-a"]);

    const reconciled = reconcileReloadedJourneyState(registry, {
      selectedJourneyId: "journey-a",
      pinnedJourneyIds: [],
      recentJourneyIds: [],
      collapsedJourneyIds: new Set<string>(),
      expandedConversationJourneyIds: new Set(["journey-b", "journey-gone"]),
    });
    expect([...(reconciled?.expandedConversationJourneyIds ?? [])]).toEqual(["journey-b"]);
  });
});
