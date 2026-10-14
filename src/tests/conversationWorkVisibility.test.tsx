import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import sidebarSource from "../app/FocusedConversationSidebar.tsx?raw";
import appSource from "../app/App.tsx?raw";
import {
  deriveConversationWork,
  describeHiddenWork,
  summariseConversationWork,
} from "../app/conversationWorkIndicator";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  type PiInvocationAuthorityInspection,
  type PiInvocationLeaseInspection,
  type PiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";
import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";

function authority(threadId: string, runId: string, journeyId = "mirror-desktop"): PiInvocationAuthorityInspection {
  return {
    schemaVersion: "0.1.0",
    journeyId,
    runId,
    turnId: `turn-${runId}`,
    threadId,
    generation: 1,
    piSessionId: `pi-${threadId}`,
    mirrorConversationId: `mc-${threadId}`,
    harnessUserMessageId: `u-${runId}`,
    harnessAssistantMessageId: `a-${runId}`,
  };
}

function lease(
  threadId: string,
  runId: string,
  shape: "running" | "finalizing" | "released",
  journeyId = "mirror-desktop",
): PiInvocationLeaseInspection {
  if (shape === "running") {
    return {
      authority: authority(threadId, runId, journeyId),
      leasePhase: "running",
      processCapacityState: "running",
      cancellationState: "none",
      terminalState: "open",
    };
  }
  // The validator forbids `finalizing` with `terminalState: "open"`, which is exactly the
  // constraint that made the first version of the derivation wrong. The fixture obeys it.
  return {
    authority: authority(threadId, runId, journeyId),
    leasePhase: "finalizing",
    processCapacityState: "released",
    cancellationState: "none",
    terminalState: shape === "finalizing" ? "completed" : "process_died",
  };
}

function known(entries: PiInvocationLeaseInspection[]) {
  const state = beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1);
  return applyPiInvocationInspection(state, 1, {
    schemaVersion: "0.1.0",
    limit: 4,
    journeyWorkspaceShare: 3,
    processCapacityInUse: entries.filter((entry) => entry.processCapacityState !== "released").length,
    entries,
  } as PiInvocationRegistryInspection);
}

function desktop(conversationId: string): ConversationCatalogEntry {
  return {
    kind: "desktop_conversation",
    conversationId,
    threadId: `desktop-thread-${conversationId}`,
    title: `Desktop ${conversationId}`,
    updatedAt: "2026-10-09T10:00:00.000Z",
    messageCount: 3,
    availability: "ready",
    authority: { activeGeneration: 1, runtimeChannel: "development", generations: [] },
  };
}

function mirror(conversationId: string): ConversationCatalogEntry {
  return {
    kind: "mirror_history",
    conversationId,
    title: `Mirror ${conversationId}`,
    updatedAt: "2026-10-08T10:00:00.000Z",
    messageCount: 9,
    availability: "available_in_mirror",
  };
}

function sidebar(options: {
  entries: ConversationCatalogEntry[];
  work?: ReadonlyMap<string, "working" | "finishing">;
  hidden?: Record<string, string[]>;
  selected?: ConversationSpaceSelection;
}) {
  return renderToStaticMarkup(<FocusedConversationSidebar
    journeyId="mirror-desktop"
    journeyName="Mirror Desktop"
    selected={options.selected ?? { kind: "journey_workspace", journeyId: "mirror-desktop" }}
    entries={options.entries}
    status="ready"
    work={options.work}
    hiddenConversations={options.hidden ?? {}}
    onHideConversation={vi.fn()}
    onRevealConversation={vi.fn()}
    onRevealAllConversations={vi.fn()}
    onHideEveryOtherConversation={vi.fn()}
    hideMirrorHistory={false}
    onToggleMirrorHistoryFilter={vi.fn()}
    onCreateConversation={vi.fn()}
    onSelectEntry={vi.fn()}
    onContinueMirror={vi.fn()}
    onOpenMirrorTerminal={vi.fn()}
    onRenameConversation={vi.fn()}
    onDeleteDesktop={vi.fn()}
  />);
}

/**
 * CR143. RS024 made three turns possible inside one Journey, field-verified on 2026-10-10 with
 * three intersecting execution windows, and nothing in the conversation list said which of them
 * was running. The gap exists *because* the Story succeeded.
 */
describe("CR143: the derivation says which threads are working", () => {
  it("reports both siblings when two run at once in one Journey", () => {
    const work = deriveConversationWork(
      known([lease("thread-A", "run-1", "running"), lease("thread-B", "run-2", "running")]),
      "mirror-desktop",
    );
    expect([...work.entries()].sort()).toEqual([["thread-A", "working"], ["thread-B", "working"]]);
  });

  /**
   * `liveWorkspacesInJourney` is the obvious call and the wrong one: it filters by
   * `isActivePiInvocationLease`, which excludes `finalizing`, so a settling conversation would
   * read as idle. This case is why the derivation reads open leases instead.
   */
  it("distinguishes a settling conversation from an idle one", () => {
    const work = deriveConversationWork(
      known([lease("thread-A", "run-1", "running"), lease("thread-B", "run-2", "finalizing")]),
      "mirror-desktop",
    );
    expect(work.get("thread-A")).toBe("working");
    expect(work.get("thread-B")).toBe("finishing");
  });

  /**
   * The characterisation that caught the defect. `validatePiInvocationRegistryInspection` admits
   * exactly two lease shapes — active, or finalizing with a non-open terminal state — so the
   * `terminalState === "open"` filter the first version copied from `deriveJourneyWorkLocus` made
   * `finishing` unreachable. A finished lease is not marked terminal here; the registry removes it.
   */
  it("still reports a finalizing lease however its run ended", () => {
    const work = deriveConversationWork(known([lease("thread-A", "run-1", "released")]), "mirror-desktop");
    expect(work.get("thread-A")).toBe("finishing");
  });

  it("marks nothing for a Journey with no leases at all", () => {
    const work = deriveConversationWork(known([lease("thread-A", "run-1", "running", "atlas")]), "mirror-desktop");
    expect(work.size).toBe(0);
  });

  it("never reports another Journey's work", () => {
    const work = deriveConversationWork(
      known([lease("thread-A", "run-1", "running", "atlas"), lease("thread-B", "run-2", "running")]),
      "mirror-desktop",
    );
    expect([...work.keys()]).toEqual(["thread-B"]);
  });

  it("keeps the last known marks through a reconciliation instead of blinking them off", () => {
    const settled = known([lease("thread-A", "run-1", "running")]);
    const reconciling = beginPiInvocationReconciliation(settled, 2);
    expect(reconciling.status).toBe("reconciling");
    expect(deriveConversationWork(reconciling, "mirror-desktop").get("thread-A")).toBe("working");
  });

  it("marks nothing at all when occupancy has never been read", () => {
    expect(deriveConversationWork(createUnknownPiInvocationOccupancy(), "mirror-desktop").size).toBe(0);
  });

  it("counts only the entries it is given, so one partition cannot borrow another's", () => {
    const work = deriveConversationWork(
      known([lease("desktop-thread-a", "run-1", "running"), lease("desktop-thread-b", "run-2", "finalizing")]),
      "mirror-desktop",
    );
    expect(summariseConversationWork(work, [desktop("a")])).toEqual({ working: 1, finishing: 0 });
    expect(summariseConversationWork(work, [desktop("b")])).toEqual({ working: 0, finishing: 1 });
    expect(summariseConversationWork(work, [])).toEqual({ working: 0, finishing: 0 });
  });

  it("never counts a Mirror history entry, which has no thread to hold a lease", () => {
    const work = deriveConversationWork(known([lease("desktop-thread-a", "run-1", "running")]), "mirror-desktop");
    expect(summariseConversationWork(work, [mirror("old")])).toEqual({ working: 0, finishing: 0 });
  });

  it("says nothing when a partition is quiet", () => {
    expect(describeHiddenWork({ working: 0, finishing: 0 })).toBeUndefined();
    expect(describeHiddenWork({ working: 1, finishing: 0 })).toBe("1 working");
    expect(describeHiddenWork({ working: 1, finishing: 1 })).toBe("2 working");
  });
});

describe("CR143: the list says which conversation is working", () => {
  it("marks two conversations at once, per entry and never per group", () => {
    const html = sidebar({
      entries: [desktop("a"), desktop("b"), desktop("c")],
      work: new Map([["desktop-thread-a", "working"], ["desktop-thread-b", "finishing"]]),
    });

    expect(html.match(/focused-conversation-work /g) ?? []).toHaveLength(2);
    expect(html).toContain("focused-conversation-work working");
    expect(html).toContain("focused-conversation-work finishing");
    expect(html).toContain(">Working<");
    expect(html).toContain(">Finishing<");
  });

  it("renders exactly as before when nothing is working", () => {
    const entries = [desktop("a"), desktop("b")];
    expect(sidebar({ entries, work: new Map() })).toEqual(sidebar({ entries }));
  });

  /**
   * CR102's rule, re-asserted at this grain: the state carries its own word, so it survives a
   * greyscale display, a reduced-motion preference and a colour-blind reading. A mark that is only
   * a colour is not a mark.
   */
  it("carries text rather than resting on colour", () => {
    const html = sidebar({ entries: [desktop("a")], work: new Map([["desktop-thread-a", "working"]]) });
    expect(html).toMatch(/<span class="focused-conversation-work working"[^>]*>Working<\/span>/);
  });

  /**
   * CR134's rule is that naming running work must not hide that it runs, and CR135 established
   * that reassurance has to be reachable before the section is opened. Together they decide this:
   * a hidden conversation that is working says so from the **closed** control.
   */
  it("announces a working hidden conversation on the closed toggle", () => {
    const html = sidebar({
      entries: [desktop("a"), desktop("b")],
      hidden: { "mirror-desktop": ["desktop_conversation:b"] },
      work: new Map([["desktop-thread-b", "working"]]),
    });

    expect(html).toContain("1 hidden");
    expect(html).toContain("focused-conversation-hidden-work");
    expect(html).toContain("Some hidden conversations are working.");
    expect(html).toContain("1 hidden conversations in Mirror Desktop, 1 working");
  });

  it("leaves the hidden toggle alone when the hidden conversations are quiet", () => {
    const html = sidebar({
      entries: [desktop("a"), desktop("b")],
      hidden: { "mirror-desktop": ["desktop_conversation:b"] },
      work: new Map([["desktop-thread-a", "working"]]),
    });

    expect(html).toContain("1 hidden");
    expect(html).not.toContain("focused-conversation-hidden-work");
    expect(html).toContain("Hidden only from this list. Nothing was deleted.");
  });

  /**
   * The finding the report did not contain. A conversation below the cap of six is exactly as
   * invisible as a hidden one, by a mechanism the Navigator never chose. Same defect, same remedy.
   */
  it("announces a working conversation that is below the visible cap", () => {
    const entries = ["a", "b", "c", "d", "e", "f", "g", "h"].map(desktop);
    const html = sidebar({ entries, work: new Map([["desktop-thread-h", "working"]]) });

    expect(html).toContain("Show ");
    expect(html).toContain("focused-conversation-more-work");
    expect(html).toContain("1 working");
    // And the mark itself is not rendered, because the entry holding it is not on screen — which
    // is precisely why the control has to carry the count.
    expect(html).not.toContain("focused-conversation-work working");
  });

  it("leaves the capped control alone when the capped conversations are quiet", () => {
    const entries = ["a", "b", "c", "d", "e", "f", "g", "h"].map(desktop);
    const html = sidebar({ entries, work: new Map([["desktop-thread-a", "working"]]) });

    expect(html).toContain("Show ");
    expect(html).not.toContain("focused-conversation-more-work");
    expect(html).toContain("focused-conversation-work working");
  });
});

describe("CR143: the mark is wired from the right Journey and the right source", () => {
  function withoutComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  /**
   * Several conversation groups can be open at once (CR133), so a derivation keyed by the selected
   * Journey would mark the wrong group. The call site is the guarded thing, because the derivation
   * itself cannot tell which Journey it should have been asked about.
   */
  it("derives the group's work from the group's own Journey, never the selected one", () => {
    const stripped = withoutComments(appSource);
    expect(stripped).toContain("work={deriveConversationWork(piInvocationOccupancy, journey.id)}");
    expect(stripped).not.toContain("deriveConversationWork(piInvocationOccupancy, selectedJourney)");
  });

  /**
   * The sidebar already renders the word `Working…` on its New button, from `props.busy`, meaning
   * the create action is unavailable. Two signals at two grains sharing one word would re-create
   * inside the list the generic busy state RS024 set out to remove, so the mark must read
   * `props.work` and nothing else.
   */
  it("marks entries from work rather than from the group's busy flag", () => {
    const stripped = withoutComments(sidebarSource);
    const renderEntry = stripped.slice(
      stripped.indexOf("function renderEntry("),
      stripped.indexOf("return <section"),
    );
    expect(renderEntry).toContain("props.work?.get(entry.threadId)");
    expect(renderEntry).not.toContain("props.busy");
  });
});
