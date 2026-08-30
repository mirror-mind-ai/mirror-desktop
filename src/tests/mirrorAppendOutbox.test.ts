import { describe, expect, it } from "vitest";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { commitHarnessTurn, createTurnCorrelation, stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import {
  applyMirrorAppendReceipt,
  applyPiExecutionEvidence,
  classifyMirrorAppendMessagePair,
  classifyPendingMirrorAppend,
  createMirrorAppendOutboxItem,
  parseMirrorAppendReceipt,
} from "../domain/mirrorAppendOutbox";
import { readyThread } from "./fixtures/readyThread";

function fixture() {
  const thread = readyThread("journey-one");
  thread.generations[0].mirrorConversationId = "mirror-one";
  thread.generations[0].activationReceipt!.mirrorConversationId = "mirror-one";
  let conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createTurnCorrelation({
    conversation, runId: "run-one", turnId: "turn-one",
    userMessageId: "user-one", assistantMessageId: "assistant-one",
  });
  conversation = stageCorrelatedTurn(conversation, correlation,
    { id: "user-one", role: "user", content: "hello", createdAt: "2026-08-30T10:00:00Z" },
    { id: "assistant-one", role: "assistant", content: "hi", createdAt: "2026-08-30T10:00:01Z" },
  );
  conversation = applyPiExecutionEvidence(conversation, correlation, {
    userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant",
    entryCount: 2, sessionFile: "/app/pi.jsonl", committedAt: "2026-08-30T10:00:02Z",
  });
  conversation = commitHarnessTurn(conversation, correlation, "2026-08-30T10:00:03Z");
  return { conversation, correlation };
}

describe("Mirror append outbox domain", () => {
  it("creates one exact generation-owned two-message append item", () => {
    const { conversation, correlation } = fixture();
    expect(createMirrorAppendOutboxItem(conversation, correlation)).toEqual({
      schemaVersion: "1.0.0", itemId: "turn-one", journeyId: "journey-one",
      threadId: conversation.id, generation: 1, conversationId: "mirror-one",
      sourceInterface: "nautilus-harness", createdAt: "2026-08-30T10:00:02Z",
      messages: [
        { id: "user-one", role: "user", content: "hello", createdAt: "2026-08-30T10:00:00Z", metadata: { sourceTurnId: "turn-one", generation: 1 } },
        { id: "assistant-one", role: "assistant", content: "hi", createdAt: "2026-08-30T10:00:01Z", metadata: { sourceTurnId: "turn-one", generation: 1 } },
      ],
    });
  });

  it("distinguishes a complete append pair from the bounded legacy shape where both messages are absent", () => {
    const { conversation, correlation } = fixture();
    expect(classifyMirrorAppendMessagePair(conversation, correlation)).toBe("available");
    expect(classifyMirrorAppendMessagePair({ ...conversation, messages: [] }, correlation)).toBe("legacy_absent");
    expect(classifyMirrorAppendMessagePair({
      ...conversation,
      messages: conversation.messages.filter((message) => message.id !== "assistant-one"),
    }, correlation)).toBe("invalid");
    expect(classifyPendingMirrorAppend("legacy_absent", false)).toBe("legacy_gap");
    expect(classifyPendingMirrorAppend("legacy_absent", true)).toBe("outbox_retry");
    expect(classifyPendingMirrorAppend("invalid", false)).toBe("enqueue_required");
  });

  it("accepts only bounded receipts for the exact destination and message ids", () => {
    const accepted = parseMirrorAppendReceipt({
      schemaVersion: "1.0.0", status: "accepted", conversationId: "mirror-one", journeyId: "journey-one",
      insertedCount: 2, existingCount: 0,
      messages: [{ id: "user-one", state: "inserted" }, { id: "assistant-one", state: "inserted" }],
    });
    expect(accepted?.status).toBe("accepted");
    expect(parseMirrorAppendReceipt({ ...accepted, conversationId: "other" })).toBeDefined();
    expect(parseMirrorAppendReceipt({ ...accepted, insertedCount: 0, existingCount: 2 })).toBeUndefined();
    expect(parseMirrorAppendReceipt({ status: "accepted", messages: [] })).toBeUndefined();
  });

  it("marks the exact reconciliation turn committed from an accepted append receipt", () => {
    const { conversation, correlation } = fixture();
    const settled = applyMirrorAppendReceipt(conversation, correlation, {
      schemaVersion: "1.0.0", status: "accepted", conversationId: "mirror-one", journeyId: "journey-one",
      insertedCount: 0, existingCount: 2,
      messages: [{ id: "user-one", state: "existing" }, { id: "assistant-one", state: "existing" }],
    }, "2026-08-30T10:00:05Z");
    expect(settled.reconciliation.classification).toBe("in_sync");
    expect(settled.reconciliation.turns[0].mirror).toMatchObject({
      state: "committed", userMessageId: "user-one", assistantMessageId: "assistant-one",
    });
  });
});
