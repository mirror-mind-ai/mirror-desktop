import { describe, expect, it, vi } from "vitest";
import {
  createJourneyPersistenceCoordinator,
  type JourneyPersistencePhase,
} from "../app/journeyPersistenceCoordinator";
import {
  createJourneySettlementAuthority,
  validatePostFrontierSettlement,
  validatePreFrontierSettlement,
} from "../app/journeySettlement";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => { resolve = next; reject = fail; });
  return { promise, resolve, reject };
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
  return { projection, authority: createJourneySettlementAuthority(runAuthority) };
}

function run(
  coordinator: ReturnType<typeof createJourneyPersistenceCoordinator>,
  authority: ReturnType<typeof fixture>["authority"],
  phase: JourneyPersistencePhase,
  operation: () => Promise<string>,
) {
  return coordinator.run(authority, phase, operation);
}

describe("Journey persistence coordinator", () => {
  it("freezes complete settlement authority derived only from start-captured RunAuthority", () => {
    const { authority } = fixture();
    expect(Object.isFrozen(authority)).toBe(true);
    expect(authority.runAuthority.runId).toBe("run-a1");
    expect(authority).toMatchObject({
      journeyId: "journey-a", runId: "run-a1", turnId: "turn-run-a1",
      generation: 1, piSessionId: "pi-journey-a",
      harnessUserMessageId: "user-run-a1", harnessAssistantMessageId: "assistant-run-a1",
    });
  });

  it("executes persistence phases FIFO for the same Journey", async () => {
    const coordinator = createJourneyPersistenceCoordinator();
    const { authority } = fixture();
    const barrier = deferred();
    const entered = deferred();
    const order: string[] = [];
    const first = run(coordinator, authority, "pre_frontier", async () => {
      order.push("a1-enter"); entered.resolve(); await barrier.promise; order.push("a1-exit"); return "a1";
    });
    const secondAuthority = fixture("journey-a", "run-a2").authority;
    const second = run(coordinator, secondAuthority, "pre_frontier", async () => {
      order.push("a2-enter"); return "a2";
    });
    await entered.promise;
    expect(order).toEqual(["a1-enter"]);
    barrier.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual(["a1", "a2"]);
    expect(order).toEqual(["a1-enter", "a1-exit", "a2-enter"]);
  });

  it("joins duplicate exact turn phases without invoking the duplicate", async () => {
    const coordinator = createJourneyPersistenceCoordinator();
    const { authority } = fixture();
    const barrier = deferred();
    const operation = vi.fn(async () => { await barrier.promise; return "settled"; });
    const first = run(coordinator, authority, "post_frontier", operation);
    const duplicate = run(coordinator, authority, "post_frontier", vi.fn(async () => "duplicate"));
    barrier.resolve();
    await expect(Promise.all([first, duplicate])).resolves.toEqual(["settled", "settled"]);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("keeps different Journey queues independent", async () => {
    const coordinator = createJourneyPersistenceCoordinator();
    const a = fixture("journey-a", "run-a1").authority;
    const b = fixture("journey-b", "run-b1").authority;
    const barrier = deferred();
    const order: string[] = [];
    const pendingA = run(coordinator, a, "post_frontier", async () => {
      order.push("a-enter"); await barrier.promise; return "a";
    });
    const completedB = run(coordinator, b, "pre_frontier", async () => {
      order.push("b-enter"); return "b";
    });
    await expect(completedB).resolves.toBe("b");
    expect(order).toEqual(["a-enter", "b-enter"]);
    barrier.resolve();
    await pendingA;
  });

  it("releases queue bookkeeping in finally after rejection", async () => {
    const coordinator = createJourneyPersistenceCoordinator();
    const { authority } = fixture();
    await expect(run(coordinator, authority, "pre_frontier", async () => {
      throw new Error("save_failed");
    })).rejects.toThrow("save_failed");
    await expect(run(coordinator, fixture("journey-a", "run-a2").authority, "pre_frontier", async () => "recovered"))
      .resolves.toBe("recovered");
    expect(coordinator.inspect()).toEqual([]);
  });
});

describe("phase-specific settlement authority", () => {
  it("settles A from captured authority while selected B remains byte-for-byte unchanged", () => {
    const a = fixture("journey-a", "run-a1");
    const b = fixture("journey-b", "run-b1");
    let selectedJourney = "journey-b";
    const beforeB = JSON.stringify(b.projection);
    validatePreFrontierSettlement(a.authority, a.projection, {
      activeGeneration: 1, currentRunId: "run-a1", currentTurnId: "turn-run-a1",
    });
    selectedJourney = "journey-c";
    expect(a.authority.journeyId).toBe("journey-a");
    expect(selectedJourney).toBe("journey-c");
    expect(JSON.stringify(b.projection)).toBe(beforeB);
  });

  it("requires active exact run/turn evidence before the durable frontier", () => {
    const { projection, authority } = fixture();
    expect(() => validatePreFrontierSettlement(authority, projection, {
      activeGeneration: 1, currentRunId: "run-a1", currentTurnId: "turn-run-a1",
    })).not.toThrow();
    expect(() => validatePreFrontierSettlement(authority, projection, {
      activeGeneration: 2, currentRunId: "run-a2", currentTurnId: "turn-run-a2",
    })).toThrow("settlement_pre_frontier_authority_stale");
  });

  it("allows exact inactive-generation post-frontier recovery without touching replacement evidence", () => {
    const { projection, authority } = fixture();
    const outbox = {
      schemaVersion: "1.0.0" as const,
      itemId: authority.turnId,
      journeyId: authority.journeyId,
      threadId: authority.threadId,
      generation: authority.generation,
      conversationId: authority.mirrorConversationId,
      createdAt: "2026-09-01T10:00:02Z",
    };
    expect(() => validatePostFrontierSettlement(authority, projection, outbox)).not.toThrow();
    expect(() => validatePostFrontierSettlement(authority, projection, { ...outbox, generation: 2 }))
      .toThrow("settlement_post_frontier_authority_mismatch");
  });
});
