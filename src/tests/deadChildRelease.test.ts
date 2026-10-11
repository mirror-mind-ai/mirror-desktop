import { describe, expect, it } from "vitest";
import {
  deriveDeadChildRelease,
  describeDeadChildRelease,
} from "../app/deadChildRelease";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  validatePiInvocationRegistryInspection,
  type PiChildLiveness,
  type PiInvocationAuthorityInspection,
  type PiInvocationLeaseInspection,
  type PiInvocationOccupancyState,
  type PiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";
import { journeyWorkspace } from "../app/journeyWorkspaceKey";
import appSource from "../app/App.tsx?raw";
import abandonmentSource from "../app/settlementAbandonment.ts?raw";
import streamSource from "../agent/piProcessStream.ts?raw";

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

/** A `running` lease — the shape the 2026-10-11 incident held for 45 minutes after Pi exited. */
function running(threadId: string, runId: string, liveness?: PiChildLiveness): PiInvocationLeaseInspection {
  return {
    authority: authority(threadId, runId),
    leasePhase: "running",
    processCapacityState: "running",
    cancellationState: "none",
    terminalState: "open",
    ...(liveness === undefined ? {} : { childLiveness: liveness }),
  };
}

function finalizing(threadId: string, runId: string): PiInvocationLeaseInspection {
  return {
    authority: authority(threadId, runId),
    leasePhase: "finalizing",
    processCapacityState: "released",
    cancellationState: "none",
    terminalState: "process_died",
    childLiveness: "absent",
  };
}

function inspection(entries: PiInvocationLeaseInspection[]): PiInvocationRegistryInspection {
  return {
    schemaVersion: "0.1.0",
    limit: 4,
    journeyWorkspaceShare: 3,
    processCapacityInUse: entries.filter((entry) => entry.processCapacityState !== "released").length,
    entries,
  };
}

function known(entries: PiInvocationLeaseInspection[]): PiInvocationOccupancyState {
  const reconciling = beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 145);
  const state = applyPiInvocationInspection(reconciling, 145, inspection(entries));
  if (state.status !== "known") throw new Error(`fixture did not reach known: ${state.diagnostic}`);
  return state;
}

const stuck = journeyWorkspace("mirror-desktop", "desktop-thread-mirror-desktop-18dd7a36acc7f288");
const sibling = journeyWorkspace("mirror-desktop", "desktop-thread-mirror-desktop-18d5cf4842b669b0");

describe("CR145: when releasing a dead child's turn is NOT offered", () => {
  it("declines while occupancy is unknown — an unknown registry is not an absent lease", () => {
    expect(deriveDeadChildRelease(createUnknownPiInvocationOccupancy(), stuck))
      .toEqual({ offered: false, reason: "occupancy_unknown" });
  });

  it("declines when this workspace holds no lease", () => {
    expect(deriveDeadChildRelease(known([]), stuck)).toEqual({ offered: false, reason: "no_lease" });
  });

  it("declines for a lease that is already finalizing — nothing left to reap", () => {
    expect(deriveDeadChildRelease(known([finalizing(stuck.threadId!, "run-1")]), stuck))
      .toEqual({ offered: false, reason: "lease_not_active" });
  });

  // The half that can break. A running child must never be offered a release: this is the exact
  // case CR132's guard exists for, and this module must be at least as careful.
  it("declines while the OS reports the child still running", () => {
    expect(deriveDeadChildRelease(known([running(stuck.threadId!, "run-1", "running")]), stuck))
      .toEqual({ offered: false, reason: "child_running" });
  });

  it("declines when liveness was not measured", () => {
    expect(deriveDeadChildRelease(known([running(stuck.threadId!, "run-1", "unknown")]), stuck))
      .toEqual({ offered: false, reason: "liveness_unmeasured" });
  });

  it("declines for an inspection from a native build that does not measure — absence is absence", () => {
    expect(deriveDeadChildRelease(known([running(stuck.threadId!, "run-1")]), stuck))
      .toEqual({ offered: false, reason: "liveness_unmeasured" });
  });

  it("declines when no handle is held at all", () => {
    expect(deriveDeadChildRelease(known([running(stuck.threadId!, "run-1", "absent")]), stuck))
      .toEqual({ offered: false, reason: "child_absent" });
  });

  it("does not offer a sibling workspace's dead child on this workspace — workspace grain, not Journey", () => {
    const state = known([running(sibling.threadId!, "run-sibling", "exited")]);
    expect(deriveDeadChildRelease(state, stuck)).toEqual({ offered: false, reason: "no_lease" });
  });
});

describe("CR145: when it IS offered", () => {
  it("offers exactly the selected workspace's active lease whose child the OS reports exited", () => {
    const dead = running(stuck.threadId!, "run-dead", "exited");
    const alive = running(sibling.threadId!, "run-alive", "running");
    const result = deriveDeadChildRelease(known([dead, alive]), stuck);
    expect(result).toEqual({ offered: true, entry: dead });
    // And the live sibling, read from its own workspace, is still protected.
    expect(deriveDeadChildRelease(known([dead, alive]), sibling)).toEqual({ offered: false, reason: "child_running" });
  });

  it("says what it does and what it does not do", () => {
    const notice = describeDeadChildRelease();
    expect(notice.title).toBe("This turn's process has already ended");
    expect(notice.sentence).toContain("never released");
    expect(notice.sentence).toContain("same finish every turn runs");
    expect(notice.sentence).toContain("Nothing still running elsewhere is touched");
    expect(notice.action).toBe("Release this turn");
  });
});

describe("CR145: the validator accepts both native shapes and nothing in between", () => {
  it("accepts an entry without the field (older native build)", () => {
    expect(validatePiInvocationRegistryInspection(inspection([running(stuck.threadId!, "run-1")]))).toBe(true);
  });

  it("accepts every measured value", () => {
    for (const liveness of ["running", "exited", "absent", "unknown"] as const) {
      expect(validatePiInvocationRegistryInspection(inspection([running(stuck.threadId!, "run-1", liveness)]))).toBe(true);
    }
  });

  it("rejects a value the native side cannot produce, rather than guessing what it meant", () => {
    const entry = { ...running(stuck.threadId!, "run-1"), childLiveness: "dead" };
    expect(validatePiInvocationRegistryInspection(inspection([entry as never]))).toBe(false);
  });

  it("still rejects any further key — the measured shape is exact too", () => {
    const entry = { ...running(stuck.threadId!, "run-1", "exited"), pid: 96616 };
    expect(validatePiInvocationRegistryInspection(inspection([entry as never]))).toBe(false);
  });
});

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("CR145: wiring, and what deliberately did not change", () => {
  it("App derives the offer for the selected workspace and routes the action through the native reap", () => {
    const stripped = withoutComments(appSource);
    expect(stripped).toContain("deriveDeadChildRelease(piInvocationOccupancy, selectedWorkspace)");
    expect(stripped).toContain("await reapExitedPiChild(");
    // After the reap the registry is re-read, so the surfaces update from measurement, not belief.
    expect(stripped).toContain("await reconcilePiInvocationOccupancy();");
    expect(stripped).toContain("Release this turn");
  });

  it("the renderer wrapper names the native command exactly", () => {
    expect(streamSource).toContain('invoke<PiExitedChildReap>("reap_exited_pi_child", { journeyId, runId })');
  });

  // Nothing else changes. CR132's guard is correct in intent and this CR corrects the premise it
  // reads, not the guard. If this line moves, the slice has grown past its scope.
  it("leaves CR132's native-execution guard exactly as it was", () => {
    expect(abandonmentSource).toContain(
      'if (input.nativeExecutionActive) return { offered: false, reason: "native_execution_active" };',
    );
  });
});
