import { describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";
import { createTurnFinalizationCoordinator, type ConvergenceDeps, type TurnFinalizationPorts } from "../app/turnFinalizationCoordinator";
import { createJourneySettlementAuthority } from "../app/journeySettlement";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function fixture(journeyId = "journey-a", runId = "run-a1") {
  const thread = readyThread(journeyId);
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(
    thread, runId, `turn-${runId}`, `user-${runId}`, `assistant-${runId}`,
  );
  const projection = stageCorrelatedTurn(base, correlation,
    { id: correlation.harnessUserMessageId, role: "user", content: "hello", createdAt: "2026-09-01T10:00:00Z" },
    { id: correlation.harnessAssistantMessageId, role: "assistant", content: "", createdAt: "2026-09-01T10:00:01Z" },
  );
  const runAuthority = createRunAuthority(correlation, base.liveIdentity, thread.generations[0]);
  return { projection, correlation, authority: createJourneySettlementAuthority(runAuthority) };
}

function sourceBetween(start: string, end: string): string {
  const from = appSource.indexOf(start);
  const to = appSource.indexOf(end, from);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return appSource.slice(from, to);
}

/**
 * CR116: `turnFinalizationCoordinator.serialize` is one queue per Journey shared by
 * `finalizeCompletedTurn`, `finalizeInterruptedTurn` and `convergeDelivery`. A finalization that
 * never settled therefore parked the recovery routine behind it, which is why fixing the
 * renderer's guard alone would have accomplished nothing: repair would have hung instead of
 * being refused.
 */
describe("CR116 — a hung finalization no longer parks recovery", () => {
  it("lets convergeDelivery run after the stuck finalization is abandoned", async () => {
    const coordinator = createTurnFinalizationCoordinator({ boundMs: 5 });
    const { authority, correlation, projection } = fixture();
    const never = deferred<never>();

    const hungPorts = {
      loadJournal: vi.fn(() => never.promise),
    } as unknown as TurnFinalizationPorts;

    const stuck = coordinator.finalizeCompletedTurn({ authority, correlation, projection }, hungPorts);
    await expect(stuck).rejects.toThrow(/persistence_operation_abandoned:finalize_completed/u);

    const convergedPorts = {
      loadJournal: vi.fn(async () => ({ schemaVersion: "0.1.0", records: [], savedAt: "2026-09-01T10:00:02Z" })),
    } as unknown as TurnFinalizationPorts;
    const deps = {
      ports: convergedPorts,
      reconcileDeliveryDebt: vi.fn(async () => []),
      onExactError: vi.fn(),
    } as unknown as ConvergenceDeps;

    // Before the bound existed this await never returned.
    await expect(coordinator.convergeDelivery(authority.journeyId, deps)).resolves.toBe(false);
    expect(convergedPorts.loadJournal).toHaveBeenCalledWith("journey-a");
  });

  it("keeps a second Journey's finalization queue independent of the stuck one", async () => {
    const coordinator = createTurnFinalizationCoordinator({ boundMs: 5 });
    const stuck = fixture("journey-a", "run-a1");
    const never = deferred<never>();

    const pending = coordinator.finalizeCompletedTurn(
      { authority: stuck.authority, correlation: stuck.correlation, projection: stuck.projection },
      { loadJournal: vi.fn(() => never.promise) } as unknown as TurnFinalizationPorts,
    );

    const otherDeps = {
      ports: { loadJournal: vi.fn(async () => ({ schemaVersion: "0.1.0", records: [], savedAt: "x" })) },
      reconcileDeliveryDebt: vi.fn(async () => []),
      onExactError: vi.fn(),
    } as unknown as ConvergenceDeps;
    await expect(coordinator.convergeDelivery("journey-b", otherDeps)).resolves.toBe(false);

    await expect(pending).rejects.toThrow(/abandoned/u);
  });
});

/**
 * CR116: the repair route returned on its first line whenever the owner's runtime entry was
 * "active or finalizing" — which is true exactly while a Journey is stranded in Finishing. The
 * refusal must rest on whether Pi is really executing, which the native registry knows, not on a
 * renderer flag that a stuck settlement leaves set forever.
 */
describe("CR116 — the repair route is reachable while finalization is stranded", () => {
  const recovery = sourceBetween(
    "async function recoverPostTerminalPersistence",
    "function publishSteeringConversation",
  );

  it("no longer refuses merely because the Journey is finalizing", () => {
    expect(recovery).not.toContain("isJourneyRuntimeActiveOrFinalizing(ownerEntry)");
    expect(recovery).not.toContain("selectedRuntimeBusy");
  });

  it("refuses on native execution, which is the authority on whether Pi is working", () => {
    expect(recovery).toContain("hasActiveNativeExecution(piInvocationOccupancy, ownerJourneyId)");
    expect(recovery).toContain('piInvocationOccupancy.status !== "known"');
  });

  it("still refuses while this Journey's own run is streaming", () => {
    expect(recovery).toContain("isJourneyRuntimeStreaming(ownerEntry)");
  });

  it("keeps the CR115 property that convergence does not reconcile occupancy", () => {
    expect(recovery).toContain("turnFinalizationCoordinator.convergeDelivery(ownerJourneyId, convergenceDeps)");
    expect(recovery).not.toContain("reconcilePiInvocationOccupancy()");
  });

  it("names the abandonment where the Navigator reads the failure", () => {
    expect(appSource).toContain("isAbandonedOperationReason");
  });
});
