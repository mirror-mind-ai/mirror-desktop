import { describe, expect, it } from "vitest";
import { createDedicatedTurnAuthority, validateDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { readyThread } from "./fixtures/readyThread";

describe("dedicated turn authority", () => {
  it("binds the exact active dedicated generation", () => {
    const thread = readyThread("journey-one");
    const authority = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
    expect(authority).toMatchObject({
      journeyId: "journey-one",
      threadId: thread.threadId,
      generation: 1,
      piSessionId: thread.generations[0].piSessionId,
      mirrorConversationId: thread.generations[0].mirrorConversationId,
      runId: "run-1",
      turnId: "turn-1",
    });
    expect(validateDedicatedTurnAuthority(authority, thread, "journey-one")).toEqual({ valid: true, reasonCodes: [] });
  });

  it("rejects stale Journey, generation and native coordinates", () => {
    const thread = readyThread("journey-one");
    const authority = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
    expect(validateDedicatedTurnAuthority({ ...authority, journeyId: "other" }, thread, "journey-one").valid).toBe(false);
    expect(validateDedicatedTurnAuthority({ ...authority, generation: 2 }, thread, "journey-one").reasonCodes).toContain("generation_mismatch");
    expect(validateDedicatedTurnAuthority({ ...authority, piSessionId: "other" }, thread, "journey-one").reasonCodes).toContain("pi_session_mismatch");
  });
});
