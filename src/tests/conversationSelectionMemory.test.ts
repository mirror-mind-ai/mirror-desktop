import { describe, expect, it } from "vitest";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import {
  EMPTY_CONVERSATION_SELECTION_MEMORY,
  MAX_REMEMBERED_SELECTION_JOURNEYS,
  forgetConversationSelection,
  parseConversationSelectionMemory,
  rememberConversationSelection,
  resolveRestoredConversationSelection,
  sanitizeConversationSelectionMemory,
  type LastConversationSelectionByJourney,
} from "../domain/conversationSelectionMemory";
import { fixtureJourneyRegistry } from "../fixtures/journeyRegistry";
import appSource from "../app/App.tsx?raw";

function desktop(conversationId: string): ConversationCatalogEntry {
  return {
    kind: "desktop_conversation",
    conversationId,
    threadId: `thread-${conversationId}`,
    title: `Desktop ${conversationId}`,
    updatedAt: "2026-10-12T10:00:00.000Z",
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
    updatedAt: "2026-10-12T09:00:00.000Z",
    messageCount: 12,
    availability: "available_in_mirror",
  };
}

const JOURNEY = "mirror-desktop";
const CONVERSATION = "desktop-conversation-mirror-desktop-18d5d765";

const memoryWith = (
  kind: "desktop_conversation" | "mirror_history",
  conversationId: string,
  journeyId = JOURNEY,
): LastConversationSelectionByJourney => ({ [journeyId]: { kind, conversationId } });

/**
 * CR137's negatives are the half worth guarding. Landing the Navigator in the wrong conversation,
 * or in a conversation they deliberately put away, is worse than the defect of landing them on the
 * Journey workspace — which is exactly where every refusal lands, because it is already where the
 * reducer starts.
 */
describe("CR137: a relaunch refuses to guess where the Navigator was", () => {
  it("declines when nothing was stored for the Journey", () => {
    const result = resolveRestoredConversationSelection({
      memory: EMPTY_CONVERSATION_SELECTION_MEMORY,
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION)],
      hidden: {},
    });
    expect(result).toEqual({
      restored: false,
      reason: "no_memory",
      selection: { kind: "journey_workspace", journeyId: JOURNEY },
    });
  });

  it("declines when the stored coordinate belongs to a different Journey", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION, "livro-lideranca-soberana"),
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION)],
      hidden: {},
    });
    expect(result.restored).toBe(false);
    expect(result.restored === false && result.reason).toBe("no_memory");
  });

  it("declines on a blank Journey id rather than building a selection with no owner", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION, ""),
      journeyId: "",
      entries: [desktop(CONVERSATION)],
      hidden: {},
    });
    expect(result.restored).toBe(false);
  });

  /**
   * The ordering this protects is the whole reason the caller loads the catalog first. With no
   * catalog, `selectedConversationEntry` is undefined and the conversation-load effect falls back
   * to the Journey's root thread — so restoring here would show the Journey's transcript beneath a
   * conversation selection, manufacturing the very disagreement this CR removes.
   */
  it("declines while the catalog is unavailable instead of restoring against nothing", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION),
      journeyId: JOURNEY,
      entries: undefined,
      hidden: {},
    });
    expect(result).toEqual({
      restored: false,
      reason: "catalog_unavailable",
      selection: { kind: "journey_workspace", journeyId: JOURNEY },
    });
  });

  it("declines when the stored conversation is no longer in the catalog", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION),
      journeyId: JOURNEY,
      entries: [desktop("desktop-conversation-other")],
      hidden: {},
    });
    expect(result.restored === false && result.reason).toBe("conversation_missing");
  });

  it("declines when the id matches but the kind does not", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("mirror_history", CONVERSATION),
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION)],
      hidden: {},
    });
    expect(result.restored === false && result.reason).toBe("conversation_missing");
  });

  /**
   * The one place CR137 diverges from CR134 on purpose. CR134 reaches a hidden conversation
   * because work is really running there and the Navigator asked to be taken to it. Nobody asked
   * for this one, so a conversation they put away stays put away.
   */
  it("declines to restore a conversation the Navigator hid", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION),
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION)],
      hidden: { [JOURNEY]: [`desktop_conversation:${CONVERSATION}`] },
    });
    expect(result.restored === false && result.reason).toBe("conversation_hidden");
  });

  it("is not blocked by the same conversation id hidden under a different kind", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION),
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION)],
      hidden: { [JOURNEY]: [`mirror_history:${CONVERSATION}`] },
    });
    expect(result.restored).toBe(true);
  });

  it("is not blocked by a hidden conversation in another Journey", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION),
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION)],
      hidden: { "livro-lideranca-soberana": [`desktop_conversation:${CONVERSATION}`] },
    });
    expect(result.restored).toBe(true);
  });

  it("restores a Desktop conversation that exists and is visible", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("desktop_conversation", CONVERSATION),
      journeyId: JOURNEY,
      entries: [mirror("mirror-one"), desktop(CONVERSATION)],
      hidden: {},
    });
    expect(result).toEqual({
      restored: true,
      selection: { kind: "desktop_conversation", journeyId: JOURNEY, conversationId: CONVERSATION },
    });
  });

  it("restores a Mirror history selection with its own kind", () => {
    const result = resolveRestoredConversationSelection({
      memory: memoryWith("mirror_history", "mirror-one"),
      journeyId: JOURNEY,
      entries: [desktop(CONVERSATION), mirror("mirror-one")],
      hidden: {},
    });
    expect(result).toEqual({
      restored: true,
      selection: { kind: "mirror_history", journeyId: JOURNEY, conversationId: "mirror-one" },
    });
  });
});

describe("CR137: remembering is per Journey, and the workspace is an absence", () => {
  it("records the conversation the Navigator moved to", () => {
    expect(rememberConversationSelection(EMPTY_CONVERSATION_SELECTION_MEMORY, {
      kind: "desktop_conversation",
      journeyId: JOURNEY,
      conversationId: CONVERSATION,
    })).toEqual(memoryWith("desktop_conversation", CONVERSATION));
  });

  it("keeps one coordinate per Journey rather than a history", () => {
    const first = rememberConversationSelection(EMPTY_CONVERSATION_SELECTION_MEMORY, {
      kind: "desktop_conversation", journeyId: JOURNEY, conversationId: "one",
    });
    const second = rememberConversationSelection(first, {
      kind: "mirror_history", journeyId: JOURNEY, conversationId: "two",
    });
    expect(second).toEqual(memoryWith("mirror_history", "two"));
  });

  it("remembers different Journeys independently, which one global value could not", () => {
    const a = rememberConversationSelection(EMPTY_CONVERSATION_SELECTION_MEMORY, {
      kind: "desktop_conversation", journeyId: "a", conversationId: "ca",
    });
    const both = rememberConversationSelection(a, {
      kind: "desktop_conversation", journeyId: "b", conversationId: "cb",
    });
    expect(both).toEqual({
      a: { kind: "desktop_conversation", conversationId: "ca" },
      b: { kind: "desktop_conversation", conversationId: "cb" },
    });
  });

  it("deletes the key when the Navigator goes to the Journey workspace", () => {
    const remembered = memoryWith("desktop_conversation", CONVERSATION);
    expect(rememberConversationSelection(remembered, {
      kind: "journey_workspace", journeyId: JOURNEY,
    })).toEqual({});
  });

  it("returns the same object when nothing changes, so persistence does not churn", () => {
    const remembered = memoryWith("desktop_conversation", CONVERSATION);
    expect(rememberConversationSelection(remembered, {
      kind: "desktop_conversation", journeyId: JOURNEY, conversationId: CONVERSATION,
    })).toBe(remembered);
    expect(rememberConversationSelection(remembered, {
      kind: "journey_workspace", journeyId: "never-visited",
    })).toBe(remembered);
  });

  it("ignores a selection with no Journey, which is the reducer's initial state", () => {
    expect(rememberConversationSelection(EMPTY_CONVERSATION_SELECTION_MEMORY, {
      kind: "journey_workspace", journeyId: "",
    })).toEqual({});
  });

  it("stops growing at the cap instead of letting the preference file grow without bound", () => {
    let memory: LastConversationSelectionByJourney = {};
    for (let index = 0; index < MAX_REMEMBERED_SELECTION_JOURNEYS; index += 1) {
      memory = rememberConversationSelection(memory, {
        kind: "desktop_conversation", journeyId: `journey-${index}`, conversationId: `c-${index}`,
      });
    }
    expect(Object.keys(memory)).toHaveLength(MAX_REMEMBERED_SELECTION_JOURNEYS);
    const overflowed = rememberConversationSelection(memory, {
      kind: "desktop_conversation", journeyId: "one-too-many", conversationId: "c",
    });
    expect(overflowed).toBe(memory);
    // A Journey already tracked must still be updatable once the cap is reached.
    expect(rememberConversationSelection(memory, {
      kind: "desktop_conversation", journeyId: "journey-0", conversationId: "moved",
    })["journey-0"]).toEqual({ kind: "desktop_conversation", conversationId: "moved" });
  });

  it("forgets a deleted conversation, and leaves a different one alone", () => {
    const remembered = memoryWith("desktop_conversation", CONVERSATION);
    expect(forgetConversationSelection(remembered, JOURNEY, {
      kind: "desktop_conversation", conversationId: CONVERSATION,
    })).toEqual({});
    expect(forgetConversationSelection(remembered, JOURNEY, {
      kind: "desktop_conversation", conversationId: "something-else",
    })).toBe(remembered);
    expect(forgetConversationSelection(remembered, JOURNEY, {
      kind: "mirror_history", conversationId: CONVERSATION,
    })).toBe(remembered);
  });
});

describe("CR137: a malformed coordinate costs the Navigator nothing else", () => {
  it("parses a well-formed map", () => {
    expect(parseConversationSelectionMemory({
      [JOURNEY]: { kind: "desktop_conversation", conversationId: CONVERSATION },
    })).toEqual(memoryWith("desktop_conversation", CONVERSATION));
  });

  it("rejects an unknown kind", () => {
    expect(parseConversationSelectionMemory({
      [JOURNEY]: { kind: "journey_workspace", conversationId: CONVERSATION },
    })).toBeUndefined();
  });

  it("rejects a coordinate carrying anything beyond the two keys it is allowed", () => {
    expect(parseConversationSelectionMemory({
      [JOURNEY]: { kind: "desktop_conversation", conversationId: CONVERSATION, threadId: "t" },
    })).toBeUndefined();
    expect(parseConversationSelectionMemory({ [JOURNEY]: { kind: "desktop_conversation" } })).toBeUndefined();
  });

  it("rejects a blank conversation id, a blank Journey id and a non-object", () => {
    expect(parseConversationSelectionMemory({ [JOURNEY]: { kind: "desktop_conversation", conversationId: "  " } })).toBeUndefined();
    expect(parseConversationSelectionMemory({ "  ": { kind: "desktop_conversation", conversationId: "c" } })).toBeUndefined();
    expect(parseConversationSelectionMemory([])).toBeUndefined();
    expect(parseConversationSelectionMemory("nope")).toBeUndefined();
    expect(parseConversationSelectionMemory(null)).toBeUndefined();
    expect(parseConversationSelectionMemory({ [JOURNEY]: null })).toBeUndefined();
  });

  it("rejects a map larger than the cap", () => {
    const oversized = Object.fromEntries(
      Array.from({ length: MAX_REMEMBERED_SELECTION_JOURNEYS + 1 }, (_, index) => (
        [`journey-${index}`, { kind: "desktop_conversation", conversationId: `c-${index}` }]
      )),
    );
    expect(parseConversationSelectionMemory(oversized)).toBeUndefined();
  });

  it("drops a Journey that no longer exists during sanitization", () => {
    expect(sanitizeConversationSelectionMemory({
      nautilus: { kind: "desktop_conversation", conversationId: "keep" },
      gone: { kind: "mirror_history", conversationId: "drop" },
    }, fixtureJourneyRegistry)).toEqual({
      nautilus: { kind: "desktop_conversation", conversationId: "keep" },
    });
  });
});

describe("CR137: the restore is wired where it cannot disagree with the transcript", () => {
  function withoutComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  const restoreRegion = (() => {
    const start = appSource.indexOf("const restoredConversationSelectionRef = useRef(false);");
    const end = appSource.indexOf("}, [registryLoaded, preferencesLoaded, selectedJourney, lastConversationSelection,");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return withoutComments(appSource.slice(start, end));
  })();

  const catalogLoader = (() => {
    const start = appSource.indexOf("async function expandJourneyConversations(");
    const end = appSource.indexOf("* CR134: the route from the signal to the work");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return withoutComments(appSource.slice(start, end));
  })();

  it("loads the catalog before it dispatches, because the transcript is derived from it", () => {
    // The needle pins the read-only mode as well as the ordering, because a disclosing load here
    // is what the field caught reopening a group the Navigator had collapsed.
    const awaited = restoreRegion.indexOf("await expandJourneyConversations(journeyId, { disclose: false })");
    const dispatched = restoreRegion.indexOf("dispatchConversationSelection(");
    expect(awaited).toBeGreaterThan(-1);
    expect(dispatched).toBeGreaterThan(awaited);
  });

  it("runs once per launch rather than fighting the Navigator's own navigation", () => {
    expect(restoreRegion).toContain("restoredConversationSelectionRef.current = true;");
    expect(restoreRegion).toContain("if (conversationSelectionRef.current.kind !== \"journey_workspace\") return;");
  });

  it("abandons the restore when the Navigator has moved to another Journey", () => {
    expect(restoreRegion).toContain("if (selectedJourneyRef.current !== journeyId) return;");
  });

  /**
   * An allow-list rather than a list of forbidden names, because the risk is a call nobody thought
   * to forbid. Restoring a selection must never start, provision, restart or activate anything.
   */
  it("calls nothing beyond reading a catalog and dispatching a selection", () => {
    // `if`, `void` and `async` match the call shape without being calls. They are filtered rather
    // than allow-listed, because listing a keyword as something this region may "call" would turn
    // the allow-list into a list of whatever happens to be there.
    const KEYWORDS = new Set(["if", "for", "while", "switch", "return", "void", "async", "await", "typeof", "catch"]);
    const called = new Set(
      [...restoreRegion.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)]
        .map((match) => match[1])
        .filter((name) => !KEYWORDS.has(name)),
    );
    expect([...called].sort()).toEqual([
      "expandJourneyConversations",
      "dispatchConversationSelection",
      "journeyCatalogState",
      "resolveRestoredConversationSelection",
      "useEffect",
      "useRef",
    ].sort());
  });

  it("persists the memory alongside the preferences it belongs with", () => {
    expect(appSource).toContain("lastConversationSelectionByJourneyId: lastConversationSelection,");
    expect(appSource).toContain("setLastConversationSelection(sanitizedPreferences.lastConversationSelectionByJourneyId);");
  });

  /**
   * CR134's route is pinned by having no hidden-conversation check at all. It reaches a hidden
   * conversation on purpose, because that is where running work is. If a filter appears here, the
   * two CRs have been collapsed into one policy and this slice has grown past its scope.
   */
  it("opens the disclosure only when the caller asked for it", () => {
    expect(catalogLoader).toContain(
      "if (disclose) dispatchConversationExpansion({ type: \"expand\", journeyId: ownerJourneyId });",
    );
    // Exactly one dispatch, so a second unconditional one cannot be added beside the guarded one.
    expect(catalogLoader.match(/dispatchConversationExpansion\(/g)).toHaveLength(1);
  });

  /**
   * CR133 abandons a disclosing load when its own disclosure closes, and its suite pins that the
   * abort is the disclosure's own and never the selection's. A read-only load has no disclosure to
   * close, so it abandons on nothing: inventing a second rule here would contradict CR133's rather
   * than extend it, and CR137's restore already declines on its own Journey guard.
   *
   * This is the shape of the slice's first draft being wrong. That draft abandoned a read-only
   * load when the selected Journey changed, which violates CR133's stated intent, and CR133's
   * suite caught it only narrowly — the forbidden literal was `!==` and the draft used `===`.
   */
  it("abandons a read-only load on nothing, because its caller decides relevance", () => {
    expect(catalogLoader).toContain(
      "const stillWanted = () => !disclose || expandedConversationJourneyIdsRef.current.has(ownerJourneyId);",
    );
    expect(catalogLoader.match(/if \(!stillWanted\(\)\) return undefined;/g)).toHaveLength(2);
    // The disclosure set is readable only through the predicate, so neither guard can bypass it.
    expect(catalogLoader.match(/expandedConversationJourneyIdsRef/g)).toHaveLength(1);
    // And the selected Journey is not readable here at all, in either comparison direction.
    expect(catalogLoader).not.toContain("selectedJourneyRef");
  });

  /**
   * A read-only load still has to publish into the catalog state. `selectedConversationEntry` is
   * derived from it, and without that entry the conversation-load effect falls back to the
   * Journey's root thread — the transcript disagreeing with the selection, which is the defect
   * CR137 exists to remove.
   */
  it("publishes the catalog in both modes", () => {
    const start = catalogLoader.indexOf("try {");
    const end = catalogLoader.indexOf("return entries;");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const publishing = catalogLoader.slice(start, end);
    expect(publishing).toContain("completeJourneyCatalogLoad(");
    expect(publishing).not.toContain("disclose");
  });

  it("leaves the three disclosing callers disclosing, and opts out exactly once", () => {
    const source = withoutComments(appSource);
    expect(source.match(/disclose: false/g)).toHaveLength(1);
    for (const caller of [
      "await expandJourneyConversations(journeyId);",
      "await expandJourneyConversations(owner.journeyId);",
      "void expandJourneyConversations(journey.id);",
    ]) {
      expect(source).toContain(caller);
    }
  });

  it("leaves CR134's route reaching a hidden conversation", () => {
    const start = appSource.indexOf("async function navigateToJourneyWorkOwner(owner: JourneyWorkOwner) {");
    const end = appSource.indexOf("function requestBlankDesktopConversation()");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const route = withoutComments(appSource.slice(start, end));
    for (const forbidden of ["hiddenConversations", "isConversationHidden", "hiddenConversationKeys", "partitionConversationVisibility"]) {
      expect(route).not.toContain(forbidden);
    }
    expect(route).toContain("dispatchConversationSelection({ type: \"select_root\", journeyId: owner.journeyId });");
  });
});
