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

  it("keeps a generated history above 1,000 messages complete while opening only the current Segment", () => {
    const base = fixture();
    const turns = Array.from({ length: 1_200 }, (_, index) => {
      const number = index + 1;
      return {
        turnId: `turn-${number}`, runId: `run-${number}`, origin: "nautilus" as const,
        startedAt: "2026-09-15T00:00:00.000Z",
        harness: { state: "committed" as const, userMessageId: `user-${number}`, assistantMessageId: `assistant-${number}` },
        pi: { state: "committed" as const, userEntryId: `pi-user-${number}`, assistantEntryId: `pi-assistant-${number}` },
        mirror: { state: "committed" as const },
      };
    });
    const conversation: JourneyConversation = {
      ...base,
      messages: turns.flatMap((_, index) => {
        const number = index + 1;
        return [
          { id: `user-${number}`, role: "user" as const, content: `u${number}`, createdAt: "2026-09-15T00:00:00.000Z" },
          { id: `assistant-${number}`, role: "assistant" as const, content: `a${number}`, createdAt: "2026-09-15T00:00:01.000Z" },
        ];
      }),
      reconciliation: { ...base.reconciliation, turns },
    };
    const longManifest: ConversationSegmentManifest = {
      ...manifest,
      sourceEntryCount: 2_401,
      segments: [
        { segment: 1, segmentId: "segment-1", status: "closed", firstTurnId: "turn-1", lastTurnId: "turn-1000",
          sourceFromEntryId: "pi-user-1", sourceThroughEntryId: "pi-assistant-1000", retainedTailFromEntryId: "pi-user-1001", compactionEntryId: "compact-1" },
        { segment: 2, segmentId: "segment-2", status: "current", firstTurnId: "turn-1001", lastTurnId: "turn-1200",
          sourceFromEntryId: "pi-user-1001", sourceThroughEntryId: "pi-assistant-1200" },
      ],
    };
    const projections = partitionConversationBySegments(conversation, longManifest);
    expect(projections[0]!.conversation.messages).toHaveLength(2_000);
    expect(projections[1]!.conversation.messages).toHaveLength(400);
    const recovered = combineConversationSegmentProjections(projections);
    expect(recovered.messages).toHaveLength(2_400);
    expect(recovered.messages[0]?.id).toBe("user-1");
    expect(recovered.messages.at(-1)?.id).toBe("assistant-1200");
  });

  // CR114: the partition narrowed messages, turns and terminal evidence but spread the source
  // Conversation, so every per-message map reached every Segment at generation scope. One
  // production Segment held 16 messages in 5.86 MB, 1,148 of whose reconstructed actions belonged
  // to other Segments.
  it("scopes every per-message map to the Segment that owns those messages", () => {
    const conversation: JourneyConversation = {
      ...fixture(),
      reconstructedAgentActions: {
        "assistant-1": { status: "completed", operations: [{ id: "op-1", name: "old", status: "completed" }], reasoningSummaries: [], activityOrder: [{ type: "operation", id: "op-1" }] },
        "assistant-3": { status: "completed", operations: [{ id: "op-3", name: "new", status: "completed" }], reasoningSummaries: [], activityOrder: [{ type: "operation", id: "op-3" }] },
      },
      responseModels: {
        "assistant-1": { provider: "anthropic", model: "old" },
        "assistant-3": { provider: "anthropic", model: "new" },
      },
      agentCommentRoles: { "assistant-1": "trail", "assistant-3": "trail" },
      interruptedFragments: { "assistant-1": "old fragment", "assistant-3": "new fragment" },
      chapterDividers: { "user-2": { title: "Chapter two" } },
    };
    const [closed, current] = partitionConversationBySegments(conversation, manifest);
    expect(Object.keys(closed!.conversation.reconstructedAgentActions ?? {})).toEqual(["assistant-1"]);
    expect(Object.keys(closed!.conversation.responseModels ?? {})).toEqual(["assistant-1"]);
    expect(Object.keys(closed!.conversation.agentCommentRoles ?? {})).toEqual(["assistant-1"]);
    expect(Object.keys(closed!.conversation.interruptedFragments ?? {})).toEqual(["assistant-1"]);
    expect(closed!.conversation.chapterDividers).toBeUndefined();
    expect(Object.keys(current!.conversation.reconstructedAgentActions ?? {})).toEqual(["assistant-3"]);
    expect(Object.keys(current!.conversation.responseModels ?? {})).toEqual(["assistant-3"]);
    expect(Object.keys(current!.conversation.agentCommentRoles ?? {})).toEqual(["assistant-3"]);
    expect(Object.keys(current!.conversation.interruptedFragments ?? {})).toEqual(["assistant-3"]);
    expect(Object.keys(current!.conversation.chapterDividers ?? {})).toEqual(["user-2"]);
  });

  it("keeps a Segment's size proportional to its own messages, not the generation's", () => {
    const conversation: JourneyConversation = {
      ...fixture(),
      reconstructedAgentActions: {
        "assistant-1": { status: "completed",
          operations: [{ id: "op-1", name: "historical", status: "completed", output: "x".repeat(4 * 1024 * 1024) }],
          reasoningSummaries: [], activityOrder: [{ type: "operation", id: "op-1" }] },
      },
    };
    const [closed, current] = partitionConversationBySegments(conversation, manifest);
    expect(JSON.stringify(closed).length).toBeGreaterThan(4 * 1024 * 1024);
    expect(JSON.stringify(current).length).toBeLessThan(10_000);
  });

  it("rejects duplicate IDs instead of silently merging divergent Segment state", () => {
    const projections = partitionConversationBySegments(fixture(), manifest);
    projections[1]!.conversation.messages.push(projections[0]!.conversation.messages[0]!);
    expect(() => combineConversationSegmentProjections(projections)).toThrow("duplicate message authority");
  });

  it("rejects cross-Journey, stale-generation, and cross-session authority", () => {
    expect(() => partitionConversationBySegments(fixture(), { ...manifest, journeyId: "other-journey" }))
      .toThrow("authority mismatch");
    expect(() => partitionConversationBySegments(fixture(), { ...manifest, generation: 2 }))
      .toThrow("authority mismatch");
    expect(() => partitionConversationBySegments(fixture(), { ...manifest, piSessionId: "other-session" }))
      .toThrow("authority mismatch");
  });
});
