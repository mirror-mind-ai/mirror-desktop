import { describe, expect, it } from "vitest";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { readyThread } from "./fixtures/readyThread";
import {
  applyMirrorCommitEvent,
  applyMirrorTurnCommitStatus,
  commitHarnessTurn,
  createTurnCorrelation,
  pendingMirrorTurnRepair,
  stageCorrelatedTurn,
} from "../domain/threeBodyTurnCommit";
import type { ConversationMessage } from "../agent/piTaskPacket";

const user: ConversationMessage = { id: "h-user", role: "user", content: "hello", createdAt: "2026-08-24T10:00:00Z" };
const assistant: ConversationMessage = { id: "h-assistant", role: "assistant", content: "hi", createdAt: "2026-08-24T10:00:01Z" };

function staged() {
  const thread = readyThread("nautilus-harness");
  thread.generations[0].mirrorConversationId = "mirror-1";
  thread.generations[0].activationReceipt!.mirrorConversationId = "mirror-1";
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [], now: new Date("2026-08-24T09:00:00Z") });
  const correlation = createTurnCorrelation({
    conversation,
    runId: "run-1",
    turnId: "turn-1",
    userMessageId: user.id,
    assistantMessageId: assistant.id,
  });
  return { correlation, conversation: stageCorrelatedTurn(conversation, correlation, user, assistant) };
}

describe("observable three-body turn commit", () => {
  it("binds the first Mirror conversation and reaches in_sync only after all native evidence", () => {
    const fixture = staged();
    let conversation = applyMirrorCommitEvent(fixture.conversation, fixture.correlation, {
      turnId: "turn-1", runId: "run-1", phase: "user", status: "committed",
      mirrorConversationId: "mirror-1", mirrorMessageId: "m-user", mirrorMessageCount: 1,
      piUserEntryId: "pi-user",
    }, "2026-08-24T10:00:02Z");
    conversation = applyMirrorCommitEvent(conversation, fixture.correlation, {
      turnId: "turn-1", runId: "run-1", phase: "assistant", status: "committed",
      mirrorConversationId: "mirror-1", mirrorMessageId: "m-assistant", mirrorMessageCount: 2,
      piEvidence: {
        userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant",
        entryCount: 2, sessionFile: "/pi/session.jsonl",
      },
    }, "2026-08-24T10:00:03Z");
    conversation = commitHarnessTurn(conversation, fixture.correlation, "2026-08-24T10:00:04Z");

    expect(conversation.liveIdentity.mirrorConversationId).toBe("mirror-1");
    expect(conversation.reconciliation.authority.mirrorConversationId).toBe("mirror-1");
    expect(conversation.reconciliation.classification).toBe("in_sync");
    expect(conversation.reconciliation.checkpoints).toMatchObject({
      harness: { lastMessageId: "h-assistant" },
      pi: { leafEntryId: "pi-assistant" },
      mirror: { lastMessageId: "m-assistant", messageCount: 2 },
    });
  });

  it("preserves the Pi answer and classifies an assistant Mirror failure", () => {
    const fixture = staged();
    let conversation = applyMirrorCommitEvent(fixture.conversation, fixture.correlation, {
      turnId: "turn-1", runId: "run-1", phase: "user", status: "committed",
      mirrorConversationId: "mirror-1", mirrorMessageId: "m-user", mirrorMessageCount: 1,
      piUserEntryId: "pi-user",
    }, "2026-08-24T10:00:02Z");
    conversation = applyMirrorCommitEvent(conversation, fixture.correlation, {
      turnId: "turn-1", runId: "run-1", phase: "assistant", status: "failed",
      mirrorConversationId: "mirror-1", reasonCode: "mirror_cli_failed",
      piEvidence: { userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant", entryCount: 2 },
    }, "2026-08-24T10:00:03Z");
    conversation = commitHarnessTurn(conversation, fixture.correlation, "2026-08-24T10:00:04Z");

    expect(conversation.messages.at(-1)?.content).toBe("hi");
    expect(conversation.reconciliation.classification).toBe("commit_failed");
    expect(conversation.reconciliation.turns[0].pi.state).toBe("committed");
    expect(conversation.reconciliation.turns[0].mirror).toMatchObject({ state: "failed", failureCode: "mirror_cli_failed" });
  });

  it("exposes a bounded repair and completes it from queryable native Mirror status", () => {
    const fixture = staged();
    let conversation = applyMirrorCommitEvent(fixture.conversation, fixture.correlation, {
      turnId: "turn-1", runId: "run-1", phase: "user", status: "committed",
      mirrorConversationId: "mirror-1", mirrorMessageId: "m-user", mirrorMessageCount: 1,
      piUserEntryId: "pi-user",
    }, "2026-08-24T10:00:02Z");
    conversation = applyMirrorCommitEvent(conversation, fixture.correlation, {
      turnId: "turn-1", runId: "run-1", phase: "assistant", status: "failed",
      mirrorConversationId: "mirror-1", reasonCode: "mirror_cli_failed",
      piEvidence: { userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant", entryCount: 2, sessionFile: "/pi/session.jsonl" },
    }, "2026-08-24T10:00:03Z");
    conversation = commitHarnessTurn(conversation, fixture.correlation, "2026-08-24T10:00:04Z");

    const repair = pendingMirrorTurnRepair(conversation);
    expect(repair).toMatchObject({ sessionFile: "/pi/session.jsonl", failureCode: "mirror_cli_failed" });
    conversation = applyMirrorTurnCommitStatus(conversation, repair!.correlation, {
      schemaVersion: "0.2.0", status: "committed", conversationId: "mirror-1",
      userMessageId: "m-user", assistantMessageId: "m-assistant", messageCount: 2,
    }, "2026-08-24T10:00:05Z");

    expect(conversation.reconciliation.classification).toBe("in_sync");
    expect(pendingMirrorTurnRepair(conversation)).toBeUndefined();
  });

  it("rejects an event from another run without accepting its native ids", () => {
    const fixture = staged();
    const conversation = applyMirrorCommitEvent(fixture.conversation, fixture.correlation, {
      turnId: "turn-1", runId: "other-run", phase: "user", status: "committed",
      mirrorConversationId: "mirror-1", mirrorMessageId: "m-user",
    }, "2026-08-24T10:00:02Z");

    expect(conversation.reconciliation.classification).toBe("commit_failed");
    expect(conversation.liveIdentity.mirrorConversationId).toBe("mirror-1");
  });
});
