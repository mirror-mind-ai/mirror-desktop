import { describe, expect, it } from "vitest";
import fixtureSource from "./fixtures/piInvocationTwoWorkspaceInspection.json?raw";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  hasActiveNativeExecution,
  hasActiveNativeExecutionInJourney,
  hasBlockingPiInvocationOccupancy,
  liveWorkspacesInJourney,
  validatePiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";
import { journeyWorkspace } from "../app/journeyWorkspaceKey";

// CR139: the Rust registry and this validator are two independently written rule sets over the
// same bytes. The fixture is emitted by `PiProcessRegistry::inspect` itself (regenerate with
// CR139_WRITE_FIXTURE=1), so neither side can drift into agreement with a hand-written sample.
const fixture = JSON.parse(fixtureSource) as {
  note: string;
  inspection: unknown;
};

/** Drives the real reconciliation path, so the fixture is parsed exactly as a live inspection is. */
function applied() {
  const reconciling = beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 139);
  return applyPiInvocationInspection(reconciling, 139, fixture.inspection as never);
}

describe("CR139: the re-keyed registry's own output satisfies the renderer's validator", () => {
  it("accepts two sibling workspaces in one Journey as a valid inspection", () => {
    expect(validatePiInvocationRegistryInspection(fixture.inspection)).toBe(true);
  });

  it("reaches known rather than unknown, which is what used to disable the Composer app-wide", () => {
    const state = applied();
    expect(state.status).toBe("known");
    expect(state.diagnostic).toBeNull();
    expect(state.entries).toHaveLength(3);
  });

  // Two different causes of an app-wide Composer block used to be indistinguishable, and CR136's
  // Finding 1 conflated them. This separates them on real bytes: the *validator* no longer degrades
  // this payload to `unknown`, which was the lockout CR138 removed; what still blocks globally is
  // this predicate's reach, which counts an active lease in ANY Journey. That is CR140's explicit
  // question and it is deliberately not narrowed here.
  it("still reports a global block, now for the predicate's reach rather than an invalid payload", () => {
    const state = applied();
    expect(state.status).toBe("known");
    expect(hasBlockingPiInvocationOccupancy(state)).toBe(true);
    // The proof that the cause moved: with every lease finalizing, the same shape stops blocking,
    // so it is occupancy and not invalidity that the predicate is reacting to.
    const settled = {
      ...state,
      entries: state.entries.map((entry) => ({
        ...entry,
        leasePhase: "finalizing" as const,
        processCapacityState: "released" as const,
        terminalState: "completed" as const,
      })),
    };
    expect(hasBlockingPiInvocationOccupancy(settled)).toBe(false);
  });

  it("keeps the two siblings addressable as separate workspaces", () => {
    const state = applied();
    const root = journeyWorkspace("mirror-desktop", "nautilus-thread-mirror-desktop");
    const conversation = journeyWorkspace("mirror-desktop", "desktop-thread-mirror-desktop-18d5cf4842");
    expect(hasActiveNativeExecution(state, root)).toBe(true);
    expect(hasActiveNativeExecution(state, conversation)).toBe(true);
    expect(hasActiveNativeExecution(state, journeyWorkspace("mirror-desktop", "thread-absent"))).toBe(false);
    expect(hasActiveNativeExecutionInJourney(state, "mirror-desktop")).toBe(true);
    expect(hasActiveNativeExecutionInJourney(state, "atlas")).toBe(false);
  });

  it("entries arrive in the stable workspace order the registry sorted them into", () => {
    const state = applied();
    expect(state.entries.map((entry) => [entry.authority.journeyId, entry.authority.threadId])).toEqual([
      ["ariad", "nautilus-thread-ariad"],
      ["mirror-desktop", "desktop-thread-mirror-desktop-18d5cf4842"],
      ["mirror-desktop", "nautilus-thread-mirror-desktop"],
    ]);
  });

  /**
   * CR139 left a seam open on purpose: the registry admitted a sibling the renderer refused. CR140
   * tried to close it and the field showed the seam was in a third place — the event dispatcher,
   * keyed by Journey. **CR141 closed that one**, so the two independently written rule sets now
   * agree on this payload: the registry reports a third slot and the renderer takes it.
   *
   * This case is the measure of the distance travelled. It asserted the disagreement while the
   * disagreement was real, and asserts the agreement now, against the same generated fixture.
   */
  it("reports three available slots and the renderer now admits the second", () => {
    const state = applied();
    const free = journeyWorkspace("mirror-desktop", "desktop-thread-not-yet-started");
    // The registry's own numbers: a share of three, two live, so it admits a third.
    expect(state.journeyWorkspaceShare).toBe(3);
    expect(state.limit).toBe(4);
    expect(derivePiInvocationAdmission(state, free)).toEqual({ allowed: true, reason: null });
    // And the revertible journey grain still refuses it with a reason that has a sentence.
    expect(derivePiInvocationAdmission(state, free, "journey")).toEqual({
      allowed: false,
      reason: "same_journey_occupied",
    });
  });

  it("refuses this Journey's fourth workspace by the share, with the real registry's numbers", () => {
    const state = applied();
    const occupied = {
      ...state,
      entries: [...state.entries, {
        ...state.entries[1],
        authority: {
          ...state.entries[1].authority,
          threadId: "desktop-thread-third",
          runId: "run-third",
        },
      }],
    };
    expect(derivePiInvocationAdmission(occupied, journeyWorkspace("mirror-desktop", "desktop-thread-fourth")))
      .toEqual({ allowed: false, reason: "journey_share_exceeded" });
  });

  it("names the three occupants from the fixture's own authorities", () => {
    const state = applied();
    expect(liveWorkspacesInJourney(state, "mirror-desktop").map((authority) => authority.threadId))
      .toEqual(["desktop-thread-mirror-desktop-18d5cf4842", "nautilus-thread-mirror-desktop"]);
    // The reserved-but-unattached entry in another Journey is live too, and is not this Journey's.
    expect(liveWorkspacesInJourney(state, "ariad").map((authority) => authority.threadId))
      .toEqual(["nautilus-thread-ariad"]);
  });
});
