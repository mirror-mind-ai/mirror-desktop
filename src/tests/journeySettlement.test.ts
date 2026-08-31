import { describe, expect, it } from "vitest";
import {
  executeCompletedSettlement,
  executeInterruptedSettlement,
  rollbackRejectedReservation,
} from "../app/journeySettlement";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  resolveExactInterruptedRecovery,
  type PiInvocationAuthorityInspection,
} from "../app/piInvocationOccupancy";

const authority = { journeyId: "journey-a", runId: "run-a1" };

function completedDependencies(order: string[], failures: { save?: boolean; enqueue?: boolean } = {}) {
  return {
    saveProjection: async (projection: string) => {
      order.push(`save:${projection}`);
      if (failures.save) throw new Error("save_failed");
    },
    enqueueOutbox: async (projection: string) => {
      order.push(`enqueue:${projection}`);
      if (failures.enqueue) throw new Error("enqueue_failed");
      return "outbox-a1";
    },
    cleanupLease: async () => { order.push("cleanup"); },
    appendAndAcknowledge: async (projection: string, outbox: string) => {
      order.push(`append_ack:${outbox}`);
      return `${projection}:committed`;
    },
  };
}

describe("exact completed settlement boundary", () => {
  it("orders save, durable enqueue, cleanup, then append and acknowledgement", async () => {
    const order: string[] = [];
    const result = await executeCompletedSettlement({
      projection: "settled-a1",
      authority,
    }, completedDependencies(order));

    expect(result).toEqual({ projection: "settled-a1:committed", outbox: "outbox-a1" });
    expect(order).toEqual([
      "save:settled-a1",
      "enqueue:settled-a1",
      "cleanup",
      "append_ack:outbox-a1",
    ]);
  });

  it("does not enqueue or clean up when the exact settled projection save fails", async () => {
    const order: string[] = [];
    await expect(executeCompletedSettlement({
      projection: "settled-a1",
      authority,
    }, completedDependencies(order, { save: true }))).rejects.toThrow("save_failed");
    expect(order).toEqual(["save:settled-a1"]);
  });

  it("does not clean up when durable enqueue fails", async () => {
    const order: string[] = [];
    await expect(executeCompletedSettlement({
      projection: "settled-a1",
      authority,
    }, completedDependencies(order, { enqueue: true }))).rejects.toThrow("enqueue_failed");
    expect(order).toEqual(["save:settled-a1", "enqueue:settled-a1"]);
  });

  it("repeats the exact settled projection save when retry follows a save failure", async () => {
    const order: string[] = [];
    const dependencies = completedDependencies(order);
    let attempts = 0;
    dependencies.saveProjection = async (projection: string) => {
      attempts += 1;
      order.push(`save:${projection}:${attempts}`);
      if (attempts === 1) throw new Error("save_failed");
    };

    await expect(executeCompletedSettlement({ projection: "settled-a1", authority }, dependencies)).rejects.toThrow("save_failed");
    await executeCompletedSettlement({ projection: "settled-a1", authority }, dependencies);

    expect(order).toEqual([
      "save:settled-a1:1",
      "save:settled-a1:2",
      "enqueue:settled-a1",
      "cleanup",
      "append_ack:outbox-a1",
    ]);
  });

  it("uses an existing durable outbox only after exact authority validation by the caller", async () => {
    const order: string[] = [];
    const result = await executeCompletedSettlement({
      projection: "settled-a1",
      authority,
      existingOutbox: "outbox-a1",
    }, completedDependencies(order));

    expect(result.projection).toBe("settled-a1:committed");
    expect(order).toEqual(["cleanup", "append_ack:outbox-a1"]);
  });
});

describe("interrupted and rejected reservation boundaries", () => {
  it("persists interrupted state before cleanup without exposing start or staging dependencies", async () => {
    const order: string[] = [];
    await executeInterruptedSettlement({ projection: "interrupted-a1", authority }, {
      saveInterruptedProjection: async () => { order.push("save_interrupted"); },
      cleanupLease: async () => { order.push("cleanup"); },
    });
    expect(order).toEqual(["save_interrupted", "cleanup"]);
  });

  it("does not clean up when interrupted-state save fails", async () => {
    const order: string[] = [];
    await expect(executeInterruptedSettlement({ projection: "interrupted-a1", authority }, {
      saveInterruptedProjection: async () => { order.push("save_interrupted"); throw new Error("save_failed"); },
      cleanupLease: async () => { order.push("cleanup"); },
    })).rejects.toThrow("save_failed");
    expect(order).toEqual(["save_interrupted"]);
  });

  it("durably restores reversible staging before inspecting a reservation loser", async () => {
    const order: string[] = [];
    await rollbackRejectedReservation({ projection: "before-a1", authority }, {
      saveRollbackProjection: async () => { order.push("save_rollback"); },
      inspectAfterRollback: async () => { order.push("inspect"); return "free"; },
      cleanupExactFinalizingLease: async () => { order.push("cleanup"); },
      isExactFinalizingLease: () => false,
    });
    expect(order).toEqual(["save_rollback", "inspect"]);
  });

  it("cleans an exact finalizing reservation loser only after durable rollback and inspection", async () => {
    const order: string[] = [];
    await rollbackRejectedReservation({ projection: "before-a1", authority }, {
      saveRollbackProjection: async () => { order.push("save_rollback"); },
      inspectAfterRollback: async () => { order.push("inspect"); return "exact_finalizing"; },
      cleanupExactFinalizingLease: async () => { order.push("cleanup"); },
      isExactFinalizingLease: (value) => value === "exact_finalizing",
    });
    expect(order).toEqual(["save_rollback", "inspect", "cleanup"]);
  });

  it("does not mutate settlement for non-owner or stale interrupted recovery", async () => {
    const exactAuthority: PiInvocationAuthorityInspection = {
      schemaVersion: "0.1.0",
      journeyId: "journey-a",
      runId: "run-a1",
      turnId: "turn-a1",
      threadId: "thread-a",
      generation: 1,
      piSessionId: "pi-a",
      mirrorConversationId: "mirror-a",
      harnessUserMessageId: "user-a1",
      harnessAssistantMessageId: "assistant-a1",
    };
    const inspection = {
      schemaVersion: "0.1.0" as const,
      limit: 1,
      processCapacityInUse: 0,
      entries: [{
        authority: exactAuthority,
        leasePhase: "finalizing" as const,
        processCapacityState: "released" as const,
        cancellationState: "requested" as const,
        terminalState: "cancelled" as const,
      }],
    };
    const occupied = applyPiInvocationInspection(
      beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1),
      1,
      inspection,
    );
    let mutations = 0;
    const attempt = async (owner: string, evidence: PiInvocationAuthorityInspection) => {
      const lease = resolveExactInterruptedRecovery(occupied, owner, evidence);
      if (!lease) return;
      await executeInterruptedSettlement({ projection: "interrupted", authority: lease.authority }, {
        saveInterruptedProjection: async () => { mutations += 1; },
        cleanupLease: async () => { mutations += 1; },
      });
    };
    await attempt("journey-b", exactAuthority);
    await attempt("journey-a", { ...exactAuthority, runId: "stale" });
    expect(mutations).toBe(0);
  });
});
