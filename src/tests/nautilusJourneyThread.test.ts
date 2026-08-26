import { describe, expect, it } from "vitest";
import {
  classifyNautilusJourneyThread,
  validateNautilusThreadRegistry,
  validateNautilusThreadTransition,
  type NautilusJourneyThread,
} from "../domain/nautilusJourneyThread";

const readyThread = (journeyId = "nautilus-harness"): NautilusJourneyThread => ({
  schemaVersion: "1.0.0",
  threadId: `nautilus-thread-${journeyId}`,
  journeyId,
  createdAt: "2026-08-26T00:00:00.000Z",
  activeGeneration: 1,
  generations: [{
    generation: 1,
    status: "ready",
    piSessionId: `nautilus-${journeyId}-1`,
    mirrorConversationId: "mirror-1",
    createdAt: "2026-08-26T00:00:00.000Z",
    activatedAt: "2026-08-26T00:01:00.000Z",
    activationReceipt: {
      schemaVersion: "1.0.0", journeyId, threadId: `nautilus-thread-${journeyId}`, generation: 1,
      piSessionId: `nautilus-${journeyId}-1`, mirrorConversationId: "mirror-1",
      mode: "mirror", commandAuthority: "installed", activatedAt: "2026-08-26T00:01:00.000Z",
    },
  }],
});

describe("dedicated Nautilus Journey thread authority", () => {
  it("keeps missing and legacy-only state absent", () => {
    expect(classifyNautilusJourneyThread(undefined, "nautilus-harness")).toEqual({ kind: "absent", legacyStatePresent: false });
    expect(classifyNautilusJourneyThread(undefined, "nautilus-harness", true)).toEqual({ kind: "absent", legacyStatePresent: true });
  });

  it("recognizes one exact ready generation", () => {
    expect(classifyNautilusJourneyThread(readyThread(), "nautilus-harness")).toMatchObject({
      kind: "ready",
      thread: { threadId: "nautilus-thread-nautilus-harness" },
      activeGeneration: { generation: 1, piSessionId: "nautilus-nautilus-harness-1", mirrorConversationId: "mirror-1" },
    });
  });

  it.each([
    ["journey_mismatch", { ...readyThread(), journeyId: "other" }],
    ["active_generation_missing", { ...readyThread(), activeGeneration: 2 }],
    ["active_generation_not_ready", { ...readyThread(), generations: [{ ...readyThread().generations[0], status: "activating" }] }],
    ["activation_receipt_invalid", { ...readyThread(), generations: [{ ...readyThread().generations[0], activationReceipt: undefined }] }],
    ["generation_sequence_invalid", { ...readyThread(), generations: [{ ...readyThread().generations[0], generation: 2 }] }],
    ["native_id_reused", { ...readyThread(), generations: [readyThread().generations[0], { ...readyThread().generations[0], generation: 2, status: "inactive" }] }],
  ])("fails closed with %s", (reasonCode, value) => {
    expect(classifyNautilusJourneyThread(value, "nautilus-harness")).toMatchObject({ kind: "inconsistent", reasonCodes: expect.arrayContaining([reasonCode]) });
  });

  it("preserves append-only generation history", () => {
    const previous = readyThread();
    const next: NautilusJourneyThread = {
      ...previous,
      activeGeneration: 2,
      generations: [
        { ...previous.generations[0], status: "inactive", closedAt: "2026-08-27T00:00:00.000Z" },
        { ...previous.generations[0], generation: 2, piSessionId: "pi-two", mirrorConversationId: "mirror-two", createdAt: "2026-08-27T00:00:00.000Z" },
      ],
    };
    expect(validateNautilusThreadTransition(previous, next)).toEqual({ valid: true, reasonCodes: [] });
    expect(validateNautilusThreadTransition(previous, { ...next, generations: [{ ...next.generations[0], piSessionId: "rewritten" }, next.generations[1]] })).toMatchObject({ valid: false, reasonCodes: expect.arrayContaining(["history_rewritten"]) });
  });

  it("rejects native ids reused across Journey threads", () => {
    const second = readyThread("other");
    second.generations[0].piSessionId = readyThread().generations[0].piSessionId;
    expect(validateNautilusThreadRegistry([readyThread(), second])).toEqual({ valid: false, reasonCodes: ["native_id_reused"] });
  });
});
