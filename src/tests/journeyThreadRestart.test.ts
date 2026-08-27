import { describe, expect, it } from "vitest";
import { createJourneyActivationReceipt } from "../domain/journeyThreadProvisioning";
import { createJourneyRestartOperation, projectGenerationHistory, publishRestartedGeneration } from "../domain/journeyThreadRestart";
import { readyThread } from "./fixtures/readyThread";

describe("Journey generation restart", () => {
  it("reserves exactly the next generation", () => {
    expect(createJourneyRestartOperation(readyThread("nautilus-harness"), "restart-1")).toMatchObject({
      operationId: "restart-1", priorGeneration: 1, nextGeneration: 2, status: "reserved",
    });
  });

  it("atomically closes the prior generation and publishes the verified replacement", () => {
    const thread = readyThread("nautilus-harness");
    const operation = createJourneyRestartOperation(thread, "restart-1");
    const activatedAt = "2026-08-27T00:01:00.000Z";
    const generation = {
      generation: 2, status: "ready" as const, piSessionId: "pi-two", piSessionFile: "/tmp/pi-two.jsonl",
      mirrorConversationId: "mirror-two", piSessionName: "Journey · Nautilus · Generation 2",
      mirrorConversationName: "Journey · Nautilus · Generation 2", createdAt: activatedAt, activatedAt,
      activationReceipt: createJourneyActivationReceipt({
        journeyId: thread.journeyId, threadId: thread.threadId, generation: 2,
        piSessionId: "pi-two", mirrorConversationId: "mirror-two", activatedAt,
      }),
    };
    const next = publishRestartedGeneration({ thread, operation, generation, closedAt: activatedAt });
    expect(next.activeGeneration).toBe(2);
    expect(next.generations).toHaveLength(2);
    expect(next.generations[0]).toMatchObject({ generation: 1, status: "inactive", closedAt: activatedAt });
    expect(next.generations[1]).toMatchObject({ generation: 2, status: "ready", piSessionId: "pi-two" });
    expect(thread.generations[0].status).toBe("ready");
  });

  it("rejects stale operations and non-contiguous replacements", () => {
    const thread = readyThread("nautilus-harness");
    const operation = createJourneyRestartOperation(thread, "restart-1");
    expect(() => publishRestartedGeneration({
      thread,
      operation: { ...operation, priorGeneration: 0 },
      generation: { ...thread.generations[0], generation: 2 },
      closedAt: "2026-08-27T00:00:00.000Z",
    })).toThrow("restart_authority_invalid");
  });

  it("projects bounded newest-first history without native ids", () => {
    const thread = readyThread("nautilus-harness");
    thread.generations[0].piSessionName = "Journey · Nautilus · Generation 1";
    const history = projectGenerationHistory(thread);
    expect(history).toEqual([expect.objectContaining({ generation: 1, status: "active" })]);
    expect(history[0]).not.toHaveProperty("piSessionId");
    expect(history[0]).not.toHaveProperty("mirrorConversationId");
  });
});
