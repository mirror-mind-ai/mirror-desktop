import { describe, expect, it } from "vitest";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  confirmPiInvocationLeaseRelease,
  createUnknownPiInvocationOccupancy,
  hasBlockingPiInvocationOccupancy,
  retainExpectedPiInvocationLease,
  resolveExactInterruptedRecovery,
  resolveExactSettlementRecovery,
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
    const failed = applyPiInvocationInspection(reconciling, 2, inspection({ limit: 2 }));
    expect(failed.status).toBe("unknown");
    expect(hasBlockingPiInvocationOccupancy(failed)).toBe(true);
  });

  it("retains exact local authority until matching cleanup is confirmed", () => {
    const known = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection({ entries: [] }));
    const retained = retainExpectedPiInvocationLease(known, authority);
    expect(hasBlockingPiInvocationOccupancy(retained)).toBe(true);
    expect(confirmPiInvocationLeaseRelease(retained, { journeyId: "journey-a", runId: "stale", status: "released" })).toEqual(retained);
    expect(hasBlockingPiInvocationOccupancy(confirmPiInvocationLeaseRelease(retained, { journeyId: "journey-a", runId: "run-a1", status: "released" }))).toBe(false);
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

  it("keeps finalizing occupancy separate from presentation phase", () => {
    const occupied = applyPiInvocationInspection(beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection());
    expect(occupied.entries[0]?.leasePhase).toBe("finalizing");
    expect(hasBlockingPiInvocationOccupancy(occupied)).toBe(true);
  });
});
