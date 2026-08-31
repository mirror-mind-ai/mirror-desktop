import { describe, expect, it } from "vitest";
import {
  createJourneySettlementAuthority,
  executeCompletedSettlement,
  executeInterruptedSettlement,
  rollbackRejectedReservation,
  type ActiveSettlementEvidence,
  type GenerationScopedOutboxAuthority,
} from "../app/journeySettlement";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  resolveExactInterruptedRecovery,
  type PiInvocationAuthorityInspection,
} from "../app/piInvocationOccupancy";
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

function fixture() {
  const thread = readyThread("journey-a");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-a1", "turn-a1", "user-a1", "assistant-a1");
  const projection = stageCorrelatedTurn(base, correlation,
    { id: "user-a1", role: "user", content: "hello", createdAt: "2026-09-01T10:00:00Z" },
    { id: "assistant-a1", role: "assistant", content: "hi", createdAt: "2026-09-01T10:00:01Z" },
  );
  const authority = createJourneySettlementAuthority(
    createRunAuthority(correlation, base.liveIdentity, thread.generations[0]),
  );
  const outbox: GenerationScopedOutboxAuthority = {
    itemId: authority.turnId,
    journeyId: authority.journeyId,
    threadId: authority.threadId,
    generation: authority.generation,
    conversationId: authority.mirrorConversationId,
  };
  const active: ActiveSettlementEvidence = {
    activeGeneration: authority.generation,
    currentRunId: authority.runId,
    currentTurnId: authority.turnId,
  };
  return { projection, authority, outbox, active };
}

function completedDependencies(
  order: string[],
  active: ActiveSettlementEvidence,
  outbox: GenerationScopedOutboxAuthority,
  failures: { save?: boolean; enqueue?: boolean } = {},
) {
  return {
    loadActiveEvidence: async () => { order.push("validate_active"); return active; },
    saveActiveProjection: async () => {
      order.push("save_active");
      if (failures.save) throw new Error("save_failed");
    },
    enqueueOutbox: async () => {
      order.push("enqueue");
      if (failures.enqueue) throw new Error("enqueue_failed");
      return outbox;
    },
    cleanupLease: async () => { order.push("cleanup"); },
    onLeaseReleased: undefined as (() => void | Promise<void>) | undefined,
    appendAndAcknowledge: async (projection: typeof fixture extends () => infer R ? R extends { projection: infer P } ? P : never : never) => {
      order.push("append_ack");
      return projection;
    },
  };
}

describe("phase-specific completed settlement boundary", () => {
  it("orders active validation, durable save, revalidation, enqueue, cleanup, then append/ack", async () => {
    const { projection, authority, outbox, active } = fixture();
    const order: string[] = [];
    await executeCompletedSettlement({
      projection,
      authority,
      cleanupLeaseAuthority: authority,
    }, completedDependencies(order, active, outbox));
    expect(order).toEqual([
      "validate_active", "save_active", "validate_active", "enqueue", "cleanup", "append_ack",
    ]);
  });

  it("retains the lease when active projection save or enqueue fails", async () => {
    const { projection, authority, outbox, active } = fixture();
    const saveOrder: string[] = [];
    await expect(executeCompletedSettlement({ projection, authority, cleanupLeaseAuthority: authority },
      completedDependencies(saveOrder, active, outbox, { save: true }))).rejects.toThrow("save_failed");
    expect(saveOrder).toEqual(["validate_active", "save_active"]);

    const enqueueOrder: string[] = [];
    await expect(executeCompletedSettlement({ projection, authority, cleanupLeaseAuthority: authority },
      completedDependencies(enqueueOrder, active, outbox, { enqueue: true }))).rejects.toThrow("enqueue_failed");
    expect(enqueueOrder).toEqual(["validate_active", "save_active", "validate_active", "enqueue"]);
  });

  it("stops after save when rollover is observed before enqueue", async () => {
    const { projection, authority, outbox, active } = fixture();
    const order: string[] = [];
    let validations = 0;
    const dependencies = completedDependencies(order, active, outbox);
    dependencies.loadActiveEvidence = async () => {
      validations += 1;
      order.push("validate_active");
      return validations === 1 ? active : { activeGeneration: 2, currentRunId: "run-a2", currentTurnId: "turn-a2" };
    };
    await expect(executeCompletedSettlement({ projection, authority, cleanupLeaseAuthority: authority }, dependencies))
      .rejects.toThrow("settlement_pre_frontier_authority_stale");
    expect(order).toEqual(["validate_active", "save_active", "validate_active"]);
  });

  it("resumes an exact inactive-generation outbox without active validation or lease cleanup", async () => {
    const { projection, authority, outbox, active } = fixture();
    const order: string[] = [];
    await executeCompletedSettlement({ projection, authority, existingOutbox: outbox },
      completedDependencies(order, active, outbox));
    expect(order).toEqual(["append_ack"]);
  });

  it("admits one later serial child after cleanup while model-free append remains pending", async () => {
    const { projection, authority, outbox, active } = fixture();
    const order: string[] = [];
    const appendStarted = deferred();
    const finishAppend = deferred();
    let children = 1;
    const dependencies = completedDependencies(order, active, outbox);
    dependencies.cleanupLease = async () => { order.push("cleanup"); children = 0; };
    dependencies.onLeaseReleased = () => { children += 1; order.push("start-a2"); };
    dependencies.appendAndAcknowledge = async (candidate) => {
      order.push("append_pending"); appendStarted.resolve(); await finishAppend.promise; return candidate;
    };
    const settlement = executeCompletedSettlement({
      projection, authority, cleanupLeaseAuthority: authority,
    }, dependencies);
    await appendStarted.promise;
    expect(children).toBe(1);
    expect(order).toEqual([
      "validate_active", "save_active", "validate_active", "enqueue", "cleanup", "start-a2", "append_pending",
    ]);
    finishAppend.resolve();
    await settlement;
  });

  it("rejects a cleanup lease belonging to a replacement", async () => {
    const { projection, authority, outbox, active } = fixture();
    const order: string[] = [];
    await expect(executeCompletedSettlement({
      projection, authority, existingOutbox: outbox,
      cleanupLeaseAuthority: { ...authority, runId: "run-a2" },
    }, completedDependencies(order, active, outbox))).rejects.toThrow("exact_settlement_cleanup_authority_mismatch");
    expect(order).toEqual([]);
  });
});

describe("interrupted and rejected reservation boundaries", () => {
  const rollbackAuthority = { journeyId: "journey-a", runId: "run-a1" };

  it("revalidates and persists interrupted state before cleanup", async () => {
    const { projection, authority, active } = fixture();
    const order: string[] = [];
    await executeInterruptedSettlement({ projection, authority }, {
      loadActiveEvidence: async () => { order.push("validate_active"); return active; },
      saveInterruptedProjection: async () => { order.push("save_interrupted"); },
      cleanupLease: async () => { order.push("cleanup"); },
    });
    expect(order).toEqual(["validate_active", "save_interrupted", "validate_active", "cleanup"]);
  });

  it("does not clean up when interrupted-state save fails", async () => {
    const { projection, authority, active } = fixture();
    const order: string[] = [];
    await expect(executeInterruptedSettlement({ projection, authority }, {
      loadActiveEvidence: async () => { order.push("validate_active"); return active; },
      saveInterruptedProjection: async () => { order.push("save_interrupted"); throw new Error("save_failed"); },
      cleanupLease: async () => { order.push("cleanup"); },
    })).rejects.toThrow("save_failed");
    expect(order).toEqual(["validate_active", "save_interrupted"]);
  });

  it("durably restores reversible staging before inspecting a reservation loser", async () => {
    const order: string[] = [];
    await rollbackRejectedReservation({ projection: "before-a1", authority: rollbackAuthority }, {
      saveRollbackProjection: async () => { order.push("save_rollback"); },
      inspectAfterRollback: async () => { order.push("inspect"); return "free"; },
      cleanupExactFinalizingLease: async () => { order.push("cleanup"); },
      isExactFinalizingLease: () => false,
    });
    expect(order).toEqual(["save_rollback", "inspect"]);
  });

  it("cleans an exact finalizing loser only after rollback and inspection", async () => {
    const order: string[] = [];
    await rollbackRejectedReservation({ projection: "before-a1", authority: rollbackAuthority }, {
      saveRollbackProjection: async () => { order.push("save_rollback"); },
      inspectAfterRollback: async () => { order.push("inspect"); return "exact_finalizing"; },
      cleanupExactFinalizingLease: async () => { order.push("cleanup"); },
      isExactFinalizingLease: (value) => value === "exact_finalizing",
    });
    expect(order).toEqual(["save_rollback", "inspect", "cleanup"]);
  });

  it("does not mutate settlement for non-owner or stale interrupted recovery", async () => {
    const exactAuthority: PiInvocationAuthorityInspection = {
      schemaVersion: "0.1.0", journeyId: "journey-a", runId: "run-a1", turnId: "turn-a1",
      threadId: "thread-a", generation: 1, piSessionId: "pi-a", mirrorConversationId: "mirror-a",
      harnessUserMessageId: "user-a1", harnessAssistantMessageId: "assistant-a1",
    };
    const inspection = {
      schemaVersion: "0.1.0" as const, limit: 1, processCapacityInUse: 0,
      entries: [{ authority: exactAuthority, leasePhase: "finalizing" as const,
        processCapacityState: "released" as const, cancellationState: "requested" as const,
        terminalState: "cancelled" as const }],
    };
    const occupied = applyPiInvocationInspection(
      beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1), 1, inspection,
    );
    let mutations = 0;
    const attempt = async (owner: string, evidence: PiInvocationAuthorityInspection) => {
      const lease = resolveExactInterruptedRecovery(occupied, owner, evidence);
      if (!lease) return;
      mutations += 2;
    };
    await attempt("journey-b", exactAuthority);
    await attempt("journey-a", { ...exactAuthority, runId: "stale" });
    expect(mutations).toBe(0);
  });
});
