import { describe, expect, it } from "vitest";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";

describe("run authority", () => {
  it("builds one live dedicated authority from TurnCorrelation and live identity", () => {
    const thread = readyThread("journey-one");
    const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
    const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");

    const authority = createRunAuthority(correlation, conversation.liveIdentity, thread.generations[0]);

    expect(authority).toMatchObject({
      schemaVersion: "0.1.0",
      correlation,
      journeyId: "journey-one",
      runId: "run-1",
      turnId: "turn-1",
      threadId: thread.threadId,
      harnessConversationId: thread.threadId,
      generation: 1,
      piSessionId: thread.generations[0].piSessionId,
      piSessionFile: thread.generations[0].piSessionFile,
      mirrorConversationId: thread.generations[0].mirrorConversationId,
      activationReceiptActivatedAt: thread.generations[0].activationReceipt?.activatedAt,
      harnessUserMessageId: "user-1",
      harnessAssistantMessageId: "assistant-1",
    });
    expect(authority.eventAuthority).toEqual({
      schemaVersion: "0.1.0",
      journeyId: "journey-one",
      runId: "run-1",
      turnId: "turn-1",
      threadId: thread.threadId,
      generation: 1,
      piSessionId: thread.generations[0].piSessionId,
      mirrorConversationId: thread.generations[0].mirrorConversationId,
      harnessUserMessageId: "user-1",
      harnessAssistantMessageId: "assistant-1",
    });
    expect("piSessionFile" in authority.eventAuthority).toBe(false);
  });

  it("rejects live dedicated authority when mandatory generation fields are missing", () => {
    const thread = readyThread("journey-one");
    const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
    const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");

    expect(() => createRunAuthority({ ...correlation, threadId: undefined }, conversation.liveIdentity)).toThrow("run_authority_thread_missing");
    expect(() => createRunAuthority({ ...correlation, mirrorConversationId: undefined }, conversation.liveIdentity)).toThrow("run_authority_mirror_conversation_missing");
    expect(() => createRunAuthority({ ...correlation, activationReceiptActivatedAt: undefined }, conversation.liveIdentity)).toThrow("run_authority_activation_receipt_missing");
    expect(() => createRunAuthority(correlation, { ...conversation.liveIdentity, piSessionFile: undefined })).toThrow("run_authority_pi_session_file_missing");
  });

  it("rejects mismatches between TurnCorrelation and live identity", () => {
    const thread = readyThread("journey-one");
    const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
    const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");

    expect(() => createRunAuthority({ ...correlation, journeyId: "other" }, conversation.liveIdentity)).toThrow("run_authority_journey_mismatch");
    expect(() => createRunAuthority({ ...correlation, piSessionId: "other" }, conversation.liveIdentity)).toThrow("run_authority_pi_session_mismatch");
    expect(() => createRunAuthority({ ...correlation, generation: 2 }, conversation.liveIdentity)).toThrow("run_authority_generation_mismatch");
    expect(() => createRunAuthority(correlation, { ...conversation.liveIdentity, piSessionFile: "/tmp/other.jsonl" }, thread.generations[0])).toThrow("run_authority_pi_session_file_mismatch");
  });
});
