import { describe, expect, it } from "vitest";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  hasBlockingPiInvocationOccupancy,
  retainExpectedPiInvocationLease,
  resolveExactInterruptedRecovery,
  resolveExactSettlementRecovery,
  releaseAndReinspectPiInvocationLease,
  shouldRehydratePiProcessRoute,
  validatePiInvocationRegistryInspection,
  type PiInvocationAuthorityInspection,
  type PiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";

const authority: PiInvocationAuthorityInspection = {
  schemaVersion: "0.1.0",
  journeyId: "journey-a",
  runId: "run-a1",
  turnId: "turn-a1",
  threadId: "thread-a",
  generation: 2,
  piSessionId: "pi-a",
  mirrorConversationId: "mirror-a",
  harnessUserMessageId: "user-a1",
  harnessAssistantMessageId: "assistant-a1",
};

const inspection = (overrides: Partial<PiInvocationRegistryInspection> = {}): PiInvocationRegistryInspection => ({
  schemaVersion: "0.1.0",
  limit: 1,
  processCapacityInUse: 0,
  entries: [{
    authority,
    leasePhase: "finalizing",
    processCapacityState: "released",
    cancellationState: "none",
    terminalState: "completed",
  }],
  ...overrides,
});

describe("native Pi invocation occupancy", () => {
  it("fails closed while occupancy is unknown or reconciling", () => {
    const unknown = createUnknownPiInvocationOccupancy();
    expect(hasBlockingPiInvocationOccupancy(unknown)).toBe(true);
    const reconciling = beginPiInvocationReconciliation(unknown, 7);
    expect(reconciling.status).toBe("reconciling");
    expect(hasBlockingPiInvocationOccupancy(reconciling)).toBe(true);
  });

  it("becomes free only after a matching bounded inspection", () => {
    const reconciling = beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1);
    const known = applyPiInvocationInspection(reconciling, 1, inspection({ entries: [] }));
    expect(known.status).toBe("known");
    expect(hasBlockingPiInvocationOccupancy(known)).toBe(false);
  });

  it("ignores stale inspection responses and rejects malformed capacity", () => {
    const reconciling = beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 2);
    expect(applyPiInvocationInspection(reconciling, 1, inspection({ entries: [] }))).toEqual(reconciling);
    const failed = applyPiInvocationInspection(reconciling, 2, inspection({ limit: 3 }));
    expect(failed.status).toBe("unknown");
    expect(hasBlockingPiInvocationOccupancy(failed)).toBe(true);
  });

  it("retains exact local authority until a fresh bounded inspection confirms absence", () => {
    const known = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection({ entries: [] }));
    const retained = retainExpectedPiInvocationLease(known, authority);
    expect(hasBlockingPiInvocationOccupancy(retained)).toBe(true);
    const staleResponse = applyPiInvocationInspection(retained, 99, inspection({ entries: [] }));
    expect(staleResponse).toEqual(retained);
    const reconciling = beginPiInvocationReconciliation(retained, 2);
    const fresh = applyPiInvocationInspection(reconciling, 2, inspection({ entries: [] }));
    expect(hasBlockingPiInvocationOccupancy(fresh)).toBe(false);
  });

  it("authorizes recovery only for the exact owner and persisted correlation", () => {
    const occupied = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection());
    const evidence = { ...authority };
    expect(resolveExactSettlementRecovery(occupied, "journey-a", evidence)?.authority.runId).toBe("run-a1");
    expect(resolveExactSettlementRecovery(occupied, "journey-b", evidence)).toBeNull();
    expect(resolveExactSettlementRecovery(occupied, "journey-a", { ...evidence, generation: 3 })).toBeNull();
    expect(resolveExactSettlementRecovery(occupied, "journey-a", { ...evidence, turnId: "stale" })).toBeNull();
  });

  it("requires an interrupted native terminal for interrupted-save recovery", () => {
    const completed = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection());
    expect(resolveExactInterruptedRecovery(completed, "journey-a", authority)).toBeNull();
    const cancelled = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 2), 2, inspection({
      entries: [{
        authority,
        leasePhase: "finalizing",
        processCapacityState: "released",
        cancellationState: "requested",
        terminalState: "cancelled",
      }],
    }));
    expect(resolveExactInterruptedRecovery(cancelled, "journey-a", authority)?.terminalState).toBe("cancelled");
  });

  it("never rehydrates a route for a terminal finalizing lease", () => {
    const completed = inspection().entries[0];
    expect(shouldRehydratePiProcessRoute(completed, false)).toBe(false);
    expect(shouldRehydratePiProcessRoute({
      ...completed,
      leasePhase: "running",
      processCapacityState: "running",
      terminalState: "open",
    }, false)).toBe(true);
    expect(shouldRehydratePiProcessRoute({
      ...completed,
      leasePhase: "running",
      processCapacityState: "running",
      terminalState: "open",
    }, true)).toBe(false);
    expect(shouldRehydratePiProcessRoute(undefined, false)).toBe(false);
  });

  it("keeps finalizing occupancy separate from presentation phase", () => {
    const occupied = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection());
    expect(occupied.entries[0]?.leasePhase).toBe("finalizing");
    expect(hasBlockingPiInvocationOccupancy(occupied)).toBe(true);
  });

  it("admits a second Journey only with known limit-two capacity", () => {
    const unknown = createUnknownPiInvocationOccupancy();
    expect(derivePiInvocationAdmission(unknown, "journey-b")).toEqual({
      allowed: false,
      reason: "inspection_unknown",
    });

    const limitTwo = applyPiInvocationInspection(
      beginPiInvocationReconciliation(unknown, 1),
      1,
      inspection({ limit: 2 }),
    );
    expect(derivePiInvocationAdmission(limitTwo, "journey-a")).toEqual({
      allowed: false,
      reason: "same_journey_occupied",
    });
    expect(derivePiInvocationAdmission(limitTwo, "journey-b")).toEqual({
      allowed: true,
      reason: null,
    });

    const authorityB = {
      ...authority,
      journeyId: "journey-b",
      runId: "run-b1",
      turnId: "turn-b1",
      threadId: "thread-b",
      piSessionId: "pi-b",
      mirrorConversationId: "mirror-b",
      harnessUserMessageId: "user-b1",
      harnessAssistantMessageId: "assistant-b1",
    };
    const full = retainExpectedPiInvocationLease(limitTwo, authorityB);
    expect(derivePiInvocationAdmission(full, "journey-c")).toEqual({
      allowed: false,
      reason: "global_capacity_reached",
    });
  });

  it("uses the same admission logic for rollback limit one", () => {
    const limitOne = applyPiInvocationInspection(
      beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1),
      1,
      inspection(),
    );
    expect(derivePiInvocationAdmission(limitOne, "journey-b")).toEqual({
      allowed: false,
      reason: "global_capacity_reached",
    });
    const free = applyPiInvocationInspection(
      beginPiInvocationReconciliation(limitOne, 2),
      2,
      inspection({ entries: [] }),
    );
    expect(derivePiInvocationAdmission(free, "journey-b")).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it("accepts only bounded rollback and enabled inspection limits", () => {
    expect(validatePiInvocationRegistryInspection(inspection())).toBe(true);
    expect(validatePiInvocationRegistryInspection(inspection({ limit: 2 }))).toBe(true);
    expect(validatePiInvocationRegistryInspection(inspection({ limit: 0 }))).toBe(false);
    expect(validatePiInvocationRegistryInspection(inspection({ limit: 3 }))).toBe(false);
    expect(validatePiInvocationRegistryInspection(inspection({ limit: 2, processCapacityInUse: 3 }))).toBe(false);
  });

  it("rejects invalid enums, lifecycle combinations, authority fields, duplicates, and unbounded values", () => {
    expect(validatePiInvocationRegistryInspection(inspection())).toBe(true);
    expect(validatePiInvocationRegistryInspection(inspection({ entries: [{
      ...inspection().entries[0],
      leasePhase: "invalid" as "finalizing",
    }] }))).toBe(false);
    expect(validatePiInvocationRegistryInspection(inspection({ entries: [{
      ...inspection().entries[0],
      terminalState: "open",
    }] }))).toBe(false);
    expect(validatePiInvocationRegistryInspection(inspection({ entries: [{
      ...inspection().entries[0],
      authority: { ...authority, turnId: "" },
    }] }))).toBe(false);
    expect(validatePiInvocationRegistryInspection(inspection({ entries: [{
      ...inspection().entries[0],
      authority: { ...authority, runId: "x".repeat(513) },
    }] }))).toBe(false);
    expect(validatePiInvocationRegistryInspection({
      ...inspection(),
      limit: 2,
      entries: [inspection().entries[0], inspection().entries[0]],
    })).toBe(false);
    expect(validatePiInvocationRegistryInspection(inspection({
      limit: 1,
      entries: [inspection().entries[0], {
        ...inspection().entries[0],
        authority: { ...authority, journeyId: "journey-b", runId: "run-b1" },
      }],
    }))).toBe(false);
  });

  it("releases exact authority and always performs a fresh bounded reinspection", async () => {
    const order: string[] = [];
    const fresh = inspection({ entries: [] });
    await expect(releaseAndReinspectPiInvocationLease(authority, {
      releaseLease: async () => { order.push("release"); return { journeyId: "journey-a", runId: "run-a1", status: "released" }; },
      inspectRegistry: async () => { order.push("inspect"); return fresh; },
    })).resolves.toEqual(fresh);
    expect(order).toEqual(["release", "inspect"]);
  });

  it("rejects cleanup ambiguity and preserves replacement occupancy from fresh inspection", async () => {
    await expect(releaseAndReinspectPiInvocationLease(authority, {
      releaseLease: async () => ({ journeyId: "journey-a", runId: "replacement", status: "released" }),
      inspectRegistry: async () => inspection({ entries: [] }),
    })).rejects.toThrow("mismatched");

    const replacementAuthority = { ...authority, runId: "run-a2", turnId: "turn-a2", harnessUserMessageId: "user-a2", harnessAssistantMessageId: "assistant-a2" };
    const replacement = inspection({ entries: [{
      authority: replacementAuthority,
      leasePhase: "running",
      processCapacityState: "running",
      cancellationState: "none",
      terminalState: "open",
    }], processCapacityInUse: 1 });
    const fresh = await releaseAndReinspectPiInvocationLease(authority, {
      releaseLease: async () => ({ journeyId: "journey-a", runId: "run-a1", status: "released" }),
      inspectRegistry: async () => replacement,
    });
    const reconciled = applyPiInvocationInspection(
      beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 9),
      9,
      fresh,
    );
    expect(reconciled.status).toBe("known");
    expect(reconciled.entries[0]?.authority.runId).toBe("run-a2");
    expect(hasBlockingPiInvocationOccupancy(reconciled)).toBe(true);
  });
});
