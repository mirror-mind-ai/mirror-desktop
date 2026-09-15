import { describe, expect, it } from "vitest";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { ConversationSegmentManifest } from "../domain/conversationSegments";
import {
  combineConversationSegmentProjections,
  partitionConversationBySegments,
} from "../domain/conversationSegmentProjection";

function fixture(): JourneyConversation {
  const turns = [1, 2, 3].map((number) => ({
    turnId: `turn-${number}`, runId: `run-${number}`, origin: "nautilus" as const,
    startedAt: `2026-09-1${number}T00:00:00.000Z`,
    harness: { state: "committed" as const, userMessageId: `user-${number}`, assistantMessageId: `assistant-${number}` },
    pi: { state: "committed" as const, userEntryId: `pi-user-${number}`, assistantEntryId: `pi-assistant-${number}` },
    mirror: { state: "committed" as const },
  }));
  return {
    id: "desktop-thread-123", journeyId: "mirror-desktop", createdAt: "2026-09-11T00:00:00.000Z",
    messages: turns.flatMap((_, index) => [{ id: `user-${index + 1}`, role: "user" as const, content: `u${index + 1}`, createdAt: "2026-09-11T00:00:00.000Z" },
      { id: `assistant-${index + 1}`, role: "assistant" as const, content: `a${index + 1}`, createdAt: "2026-09-11T00:00:01.000Z" }]),
    liveIdentity: { schemaVersion: "0.1.0", journeyId: "mirror-desktop", harnessConversationId: "desktop-thread-123",
      piSessionId: "pi-session-123", generation: 1, origin: "new" },
    reconciliation: { schemaVersion: "0.1.0", authority: { journeyId: "mirror-desktop", harnessConversationId: "desktop-thread-123",
      piSessionId: "pi-session-123", generation: 1 }, checkpoints: {}, turns, classification: "in_sync",
      classifiedAt: "2026-09-13T00:00:00.000Z", reasonCodes: [] },
  };
}

const manifest: ConversationSegmentManifest = {
  schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-123", generation: 1,
  piSessionId: "pi-session-123", sourceEntryCount: 7, segments: [
    { segment: 1, segmentId: "segment-1", status: "closed", firstTurnId: "turn-1", lastTurnId: "turn-2",
      sourceFromEntryId: "pi-user-1", sourceThroughEntryId: "pi-assistant-2", retainedTailFromEntryId: "pi-user-2", compactionEntryId: "compact-1" },
    { segment: 2, segmentId: "segment-2", status: "current", firstTurnId: "turn-2", lastTurnId: "turn-3",
      sourceFromEntryId: "pi-user-2", sourceThroughEntryId: "pi-assistant-3" },
  ],
};

describe("bounded Conversation Segment projections", () => {
  it("assigns retained-tail turns to the current Segment without duplicating messages", () => {
    const projections = partitionConversationBySegments(fixture(), manifest);
    expect(projections.map((item) => item.conversation.reconciliation.turns.map((turn) => turn.turnId))).toEqual([
      ["turn-1"], ["turn-2", "turn-3"],
    ]);
    const ids = projections.flatMap((item) => item.conversation.messages.map((message) => message.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(combineConversationSegmentProjections(projections).messages).toEqual(fixture().messages);
  });

  it("keeps a generated 10 MiB historical action body out of the current working Segment", () => {
    const conversation = fixture();
    conversation.terminalAgentActionEvidence = {
      "assistant-1": { schemaVersion: "0.1.0", journeyId: "mirror-desktop", generation: 1, runId: "run-1",
        turnId: "turn-1", assistantMessageId: "assistant-1", projection: { status: "completed",
          operations: [{ id: "tool-1", name: "generated", status: "completed", output: "x".repeat(10 * 1024 * 1024) }],
          reasoningSummaries: [], activityOrder: [{ type: "operation", id: "tool-1" }] } },
    };
    const projections = partitionConversationBySegments(conversation, manifest);
    expect(JSON.stringify(projections[0]).length).toBeGreaterThan(10 * 1024 * 1024);
    expect(JSON.stringify(projections[1]).length).toBeLessThan(10_000);
    expect(combineConversationSegmentProjections(projections).terminalAgentActionEvidence?.["assistant-1"]).toBeDefined();
  });

  it("rejects duplicate IDs instead of silently merging divergent Segment state", () => {
    const projections = partitionConversationBySegments(fixture(), manifest);
    projections[1]!.conversation.messages.push(projections[0]!.conversation.messages[0]!);
    expect(() => combineConversationSegmentProjections(projections)).toThrow("duplicate message authority");
  });

  it("rejects cross-Journey authority", () => {
    expect(() => partitionConversationBySegments(fixture(), { ...manifest, journeyId: "other-journey" }))
      .toThrow("authority mismatch");
  });
});
