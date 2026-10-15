import { describe, expect, it } from "vitest";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  hasActiveNativeExecution,
  hasActiveNativeExecutionInJourney,
  retainExpectedPiInvocationLease,
  selectWorkspaceNativeLease,
  validatePiInvocationRegistryInspection,
  type PiInvocationAuthorityInspection,
  type PiInvocationLeaseInspection,
  type PiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";
import { journeyWorkspace } from "../domain/journeyWorkspaceKey";

function authority(threadId: string, runId: string, journeyId = "mirror-desktop"): PiInvocationAuthorityInspection {
  return {
    schemaVersion: "0.1.0",
    journeyId,
    runId,
    turnId: `turn-${runId}`,
    threadId,
    generation: 1,
    piSessionId: `pi-${runId}`,
    mirrorConversationId: `mc-${runId}`,
    harnessUserMessageId: `u-${runId}`,
    harnessAssistantMessageId: `a-${runId}`,
  };
}

function running(threadId: string, runId: string, journeyId = "mirror-desktop"): PiInvocationLeaseInspection {
  return {
    authority: authority(threadId, runId, journeyId),
    leasePhase: "running",
    processCapacityState: "running",
    cancellationState: "none",
    terminalState: "open",
  };
}

function finalizing(threadId: string, runId: string): PiInvocationLeaseInspection {
  return {
    authority: authority(threadId, runId),
    leasePhase: "finalizing",
    processCapacityState: "released",
    cancellationState: "none",
    terminalState: "completed",
  };
}

function inspection(entries: PiInvocationLeaseInspection[], limit: 1 | 2 | 4 = 4, share = 3) {
  return {
    schemaVersion: "0.1.0" as const,
    limit,
    // CR140: reported by the registry rather than assumed here. Three is the production constant.
    journeyWorkspaceShare: share,
    processCapacityInUse: entries.filter((entry) => entry.processCapacityState !== "released").length,
    entries,
  };
}

function known(entries: PiInvocationLeaseInspection[], limit: 1 | 2 | 4 = 4, share = 3) {
  const state = beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1);
  return applyPiInvocationInspection(state, 1, inspection(entries, limit, share) as PiInvocationRegistryInspection);
}

describe("CR138: the inspection carries two workspaces in one Journey", () => {
  it("accepts two entries in one Journey when their threads differ", () => {
    const payload = inspection([running("thread-A", "run-1"), running("thread-B", "run-2")]);
    expect(validatePiInvocationRegistryInspection(payload)).toBe(true);
  });

  it("still rejects two entries that share a workspace", () => {
    const payload = inspection([running("thread-A", "run-1"), running("thread-A", "run-2")]);
    expect(validatePiInvocationRegistryInspection(payload)).toBe(false);
  });

  it("still rejects duplicate run ids", () => {
    const payload = inspection([running("thread-A", "run-1"), running("thread-B", "run-1")]);
    expect(validatePiInvocationRegistryInspection(payload)).toBe(false);
  });

  it("reaches known state with both sibling workspaces retained", () => {
    const state = known([running("thread-B", "run-2"), running("thread-A", "run-1")]);
    expect(state.status).toBe("known");
    expect(state.entries).toHaveLength(2);
    expect(state.diagnostic).toBeNull();
  });

  it("orders sibling workspaces stably by journey then thread", () => {
    const state = known([running("thread-B", "run-2"), running("thread-A", "run-1"), running("thread-A", "run-3", "atlas")]);
    expect(state.entries.map((entry) => `${entry.authority.journeyId}|${entry.authority.threadId}`))
      .toEqual(["atlas|thread-A", "mirror-desktop|thread-A", "mirror-desktop|thread-B"]);
  });
});

/**
 * Re-aimed twice, deleted never. CR138 pinned the Journey grain, CR140 moved these to the workspace
 * grain, and the field showed the workspace grain is what the *registry* enforces while the *event
 * transport* still carries one route per Journey. So every case here asks the workspace question
 * explicitly, and the suite keeps measuring the same thing: does admission answer at the grain it
 * was asked about?
 *
 * Production's default grain is guarded in `runtimeWorkspaceKeying.test.ts`, which is where the
 * transport's bound belongs.
 */
describe("CR140: admission answers at the workspace grain the registry enforces", () => {
  it("admits a sibling workspace, which is the concurrency RS024 set out to allow", () => {
    const state = known([running("thread-A", "run-1")]);
    const admission = derivePiInvocationAdmission(state, journeyWorkspace("mirror-desktop", "thread-B"));
    expect(admission).toEqual({ allowed: true, reason: null });
  });

  /**
   * CR141 Stage B retired the companion case that asserted the Journey-grain refusal beside this
   * one. Its property is re-asserted rather than dropped: the sibling is admitted, and the only
   * thing that now refuses inside a Journey is the share.
   */
  it("refuses a sibling only once the Journey's whole share is live", () => {
    const state = known([running("thread-A", "run-1"), running("thread-B", "run-2"), running("thread-C", "run-3")]);
    expect(derivePiInvocationAdmission(state, journeyWorkspace("mirror-desktop", "thread-D")))
      .toEqual({ allowed: false, reason: "journey_share_exceeded" });
  });

  it("names the workspace, not the Journey, for the workspace that is already running", () => {
    const state = known([running("thread-A", "run-1")]);
    // The workspace check runs first, so the sharper reason always wins. CR141 Stage B removed
    // the second grain this looped over; the property it was checking — that the workspace reason
    // is not swallowed by a coarser one — is what the assertion below still holds.
    expect(derivePiInvocationAdmission(state, journeyWorkspace("mirror-desktop", "thread-A")))
      .toEqual({ allowed: false, reason: "same_workspace_occupied" });
  });

  it("refuses the fourth workspace by the Journey's share while capacity is still free", () => {
    const state = known([
      running("thread-A", "run-1"), running("thread-B", "run-2"), running("thread-C", "run-3"),
    ], 4);
    expect(state.processCapacityInUse).toBe(3);
    expect(state.limit).toBe(4);
    // Capacity is NOT spent, so the refusal must not borrow capacity's reason.
    expect(derivePiInvocationAdmission(state, journeyWorkspace("mirror-desktop", "thread-D")))
      .toEqual({ allowed: false, reason: "journey_share_exceeded" });
    // And another Journey is still admitted, because the share is per Journey.
    expect(derivePiInvocationAdmission(state, journeyWorkspace("atlas", "thread-Z")))
      .toEqual({ allowed: true, reason: null });
  });

  it("does not count a finalizing sibling toward the share, because it holds no slot", () => {
    const state = known([
      running("thread-A", "run-1"), running("thread-B", "run-2"), finalizing("thread-C", "run-3"),
    ], 4);
    expect(derivePiInvocationAdmission(state, journeyWorkspace("mirror-desktop", "thread-D")))
      .toEqual({ allowed: true, reason: null });
  });

  it("reads the share from the inspection rather than assuming three", () => {
    const two = known([running("thread-A", "run-1"), running("thread-B", "run-2")], 4, 2);
    expect(derivePiInvocationAdmission(two, journeyWorkspace("mirror-desktop", "thread-C")))
      .toEqual({ allowed: false, reason: "journey_share_exceeded" });
    const four = known([running("thread-A", "run-1"), running("thread-B", "run-2")], 4, 4);
    expect(derivePiInvocationAdmission(four, journeyWorkspace("mirror-desktop", "thread-C")))
      .toEqual({ allowed: true, reason: null });
  });

  it("prefers capacity's reason when the share is larger than the registry can hold", () => {
    // A share of three in a registry of two: `reserve` compares the share first and finds it
    // unspent, then refuses on capacity. The pre-check must reach the same conclusion, or it would
    // claim a share was exhausted that the registry would say was not.
    const state = known([running("thread-A", "run-1"), running("thread-B", "run-2")], 2, 3);
    expect(derivePiInvocationAdmission(state, journeyWorkspace("mirror-desktop", "thread-C")))
      .toEqual({ allowed: false, reason: "global_capacity_reached" });
  });

  it("admits another Journey and refuses on global capacity before any grain", () => {
    const state = known([running("thread-A", "run-1")], 1);
    expect(derivePiInvocationAdmission(state, journeyWorkspace("atlas", "thread-Z")))
      .toEqual({ allowed: false, reason: "global_capacity_reached" });
    const roomy = known([running("thread-A", "run-1")], 4);
    expect(derivePiInvocationAdmission(roomy, journeyWorkspace("atlas", "thread-Z")))
      .toEqual({ allowed: true, reason: null });
  });

  it("refuses while the inspection is unknown", () => {
    const admission = derivePiInvocationAdmission(
      createUnknownPiInvocationOccupancy(),
      journeyWorkspace("mirror-desktop", "thread-A"),
    );
    expect(admission).toEqual({ allowed: false, reason: "inspection_unknown" });
  });
});

describe("CR138: native execution is answerable per workspace and per Journey", () => {
  it("answers for one workspace without answering for its sibling", () => {
    const state = known([running("thread-A", "run-1")]);
    expect(hasActiveNativeExecution(state, journeyWorkspace("mirror-desktop", "thread-A"))).toBe(true);
    expect(hasActiveNativeExecution(state, journeyWorkspace("mirror-desktop", "thread-B"))).toBe(false);
  });

  it("answers for the Journey as an aggregate over every workspace", () => {
    const state = known([running("thread-B", "run-2")]);
    expect(hasActiveNativeExecutionInJourney(state, "mirror-desktop")).toBe(true);
    expect(hasActiveNativeExecutionInJourney(state, "atlas")).toBe(false);
  });

  it("treats a finalizing lease as not executing, at both grains", () => {
    const state = known([finalizing("thread-A", "run-1")]);
    expect(hasActiveNativeExecution(state, journeyWorkspace("mirror-desktop", "thread-A"))).toBe(false);
    expect(hasActiveNativeExecutionInJourney(state, "mirror-desktop")).toBe(false);
  });
});

describe("CR138: retaining an expected lease must not erase a sibling", () => {
  it("keeps a sibling workspace's lease while retaining its own", () => {
    const state = known([running("thread-A", "run-1")]);
    const retained = retainExpectedPiInvocationLease(state, authority("thread-B", "run-2"));
    expect(retained.entries).toHaveLength(2);
    expect(retained.entries.map((entry) => entry.authority.threadId)).toEqual(["thread-A", "thread-B"]);
    expect(retained.processCapacityInUse).toBe(2);
  });

  it("replaces its own workspace's lease rather than duplicating it", () => {
    const state = known([running("thread-A", "run-1")]);
    const retained = retainExpectedPiInvocationLease(state, authority("thread-A", "run-9"));
    expect(retained.entries).toHaveLength(1);
    expect(retained.entries[0].authority.runId).toBe("run-9");
    expect(retained.entries[0].leasePhase).toBe("reserved");
  });
});

/**
 * CR141. `App.tsx` selected the native lease with
 * `entries.find((entry) => entry.authority.journeyId === selectedJourney)`. Once two workspaces
 * could run, that returned whichever sorted first regardless of which conversation was selected —
 * and the consequence was silence, not noise: `findBlockingTurnJournalRecord` only matches a
 * record whose `runId` equals the active lease's, so the selected workspace's own blocking record
 * was hidden and its rehydration never ran.
 */
describe("CR141: the selected workspace's lease is its own", () => {
  it("returns each sibling's own lease rather than whichever sorts first", () => {
    const state = known([running("thread-A", "run-1"), running("thread-B", "run-2")]);
    const a = selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", "thread-A"));
    const b = selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", "thread-B"));

    expect(a?.authority.runId).toBe("run-1");
    expect(b?.authority.runId).toBe("run-2");
    expect(selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", "thread-C"))).toBeUndefined();
  });

  it("answers an unresolved root thread from a single live entry", () => {
    const state = known([running("thread-A", "run-1")]);
    expect(selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", null))?.authority.runId)
      .toBe("run-1");
  });

  it("declines to guess for an unresolved root thread when two are live", () => {
    const state = known([running("thread-A", "run-1"), running("thread-B", "run-2")]);
    expect(selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", null))).toBeUndefined();
  });

  it("keeps a finalizing lease for its own workspace but never lends it to a sibling", () => {
    // The exact match answers in any phase, because a retained `finalizing` lease is exactly what
    // the retained-lease notice asks about. The fallback counts only live entries.
    const state = known([finalizing("thread-A", "run-1"), running("thread-B", "run-2")]);
    expect(selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", "thread-A"))?.leasePhase)
      .toBe("finalizing");
    expect(selectWorkspaceNativeLease(state, journeyWorkspace("mirror-desktop", null))?.authority.runId)
      .toBe("run-2");
  });
});
