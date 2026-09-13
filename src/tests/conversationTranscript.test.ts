// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appendPendingSteering } from "../domain/steeringState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { createTerminalAgentActionEvidence } from "../app/terminalAgentActionEvidence";
import { buildConversationTranscriptIndex } from "../app/conversationTranscriptModel";
import { createPersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import {
  createLongConversationFixture,
  LONG_CONVERSATION_MIN_PROJECTION_CHARS,
  LONG_CONVERSATION_TURN_COUNT,
} from "./fixtures/longConversation";
import { readyThread } from "./fixtures/readyThread";

function fixture() {
  const thread = readyThread("mirror-desktop");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  const staged = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-1", role: "user", content: "Start", createdAt: "2026-09-13T10:00:00Z" },
    { id: "assistant-1", role: "assistant", content: "Answer", createdAt: "2026-09-13T10:00:01Z" },
  );
  const authority = createRunAuthority(correlation, staged.liveIdentity, thread.generations[0]);
  const steering = appendPendingSteering(staged, authority, "Correction", new Date("2026-09-13T10:00:02Z")).conversation;
  const terminal = createTerminalAgentActionEvidence({
    correlation,
    projection: { status: "completed", operations: [], reasoningSummaries: [], activityOrder: [] },
  });
  return { ...steering, terminalAgentActionEvidence: { "assistant-1": terminal } };
}

describe("long conversation transcript boundary", () => {
  it("provides a private-data-free production-scale fixture for deterministic coverage", () => {
    const conversation = createLongConversationFixture();
    const persisted = JSON.stringify(createPersistedJourneyConversation(conversation));
    const index = buildConversationTranscriptIndex(conversation);

    expect(conversation.messages).toHaveLength(LONG_CONVERSATION_TURN_COUNT * 2);
    expect(persisted.length).toBeGreaterThanOrEqual(LONG_CONVERSATION_MIN_PROJECTION_CHARS);
    expect(index.turnByUserMessageId.size).toBe(LONG_CONVERSATION_TURN_COUNT);
    expect(index.terminalEvidenceByAssistantMessageId.size).toBe(LONG_CONVERSATION_TURN_COUNT);
    expect(index.steeringByAssistantMessageId.size).toBe(8);
  });

  it("indexes turn, Steering and terminal evidence by stable message identity", () => {
    const index = buildConversationTranscriptIndex(fixture());

    expect(index.turnByUserMessageId.get("user-1")?.turnId).toBe("turn-1");
    expect(index.steeringByAssistantMessageId.get("assistant-1")?.map((item) => item.text)).toEqual(["Correction"]);
    expect(index.terminalEvidenceByAssistantMessageId.get("assistant-1")?.turnId).toBe("turn-1");
  });

  it("keeps the full-history map behind a memoized component outside App", () => {
    const app = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");
    const transcript = readFileSync(new URL("../app/ConversationTranscript.tsx", import.meta.url), "utf8");

    expect(app).toContain("<ConversationTranscript");
    expect(app).not.toContain("{messages.map((message) => {");
    expect(transcript).toContain("export const ConversationTranscript = memo");
    expect(transcript).toContain("const ConversationMessageRow = memo");
    expect(transcript).toContain("?? EMPTY_ACTIVITY");
    expect(transcript).toContain("?? EMPTY_STEERING");
  });
});
