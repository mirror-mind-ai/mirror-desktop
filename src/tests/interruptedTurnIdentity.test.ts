import { describe, expect, it } from "vitest";
import { buildConversationTranscriptIndex } from "../app/conversationTranscriptModel";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";

type Entry = Record<string, unknown>;

function user(entryId: string, text: string, timestamp: string): Entry {
  return { entryId, role: "user", visibleText: text, timestamp, nativeContent: [{ type: "text", text }] };
}

function answer(entryId: string, text: string, timestamp: string): Entry {
  return { entryId, role: "assistant", visibleText: text, timestamp, nativeContent: [{ type: "text", text }] };
}

function narratedToolCall(entryId: string, text: string, name: string, timestamp: string): Entry {
  return {
    entryId,
    role: "assistant",
    visibleText: text,
    timestamp,
    nativeContent: [{ type: "text", text }, { type: "toolCall", id: `call-${entryId}`, name }],
  };
}

function toolResult(entryId: string, callEntryId: string, timestamp: string): Entry {
  return {
    entryId,
    role: "toolResult",
    visibleText: "",
    timestamp,
    toolCallId: `call-${callEntryId}`,
    isError: false,
    nativeContent: [{ type: "text", text: "ok" }],
  };
}

function turn(startedAt: string, pi: Record<string, unknown>) {
  return {
    turnId: `turn-agent-run-${startedAt}`,
    runId: `agent-run-${startedAt}`,
    origin: "nautilus",
    startedAt,
    harness: {
      state: "pending",
      userMessageId: `user-${startedAt}`,
      assistantMessageId: `assistant-${startedAt}`,
    },
    pi,
    mirror: { state: "pending" },
  };
}

function project(entries: Entry[], turns: unknown[], extra: Record<string, unknown> = {}) {
  return projectPiBackedConversationSurface(
    {
      id: "c1",
      journeyId: "j1",
      title: "t",
      createdAt: "2026-09-30T11:00:00Z",
      updatedAt: "2026-09-30T11:00:00Z",
      messages: [],
      reconciliation: { turns },
      liveIdentity: { schemaVersion: "0.1.0", journeyId: "j1", generation: 2 },
      ...extra,
    } as never,
    {
      schemaVersion: "0.1.0",
      activeEntryCount: entries.length,
      compactionCount: 0,
      chapterClosures: [],
      unknownPromptEnvelopeCount: 0,
      entries,
      turns: [],
    } as never,
  );
}

const CANCELLED_AT = "2026-09-30T11:34:31.407Z";

const CANCELLED_RUN = [
  { entryId: "s0", role: "system", visibleText: "", timestamp: "2026-09-30T11:34:33.100Z", nativeContent: [] },
  user("c49d7d5d", "me explique a autoridade de transcript", "2026-09-30T11:34:33.252Z"),
  narratedToolCall("d9bfbd9a", "Vou localizar a RS018.", "bash", "2026-09-30T11:34:37.753Z"),
  toolResult("aab26a7d", "d9bfbd9a", "2026-09-30T11:34:38.270Z"),
];

describe("CR089 interrupted turn identity", () => {
  it("keeps the harness identity of a cancelled turn's request", () => {
    const surface = project(CANCELLED_RUN, [turn(CANCELLED_AT, { state: "failed", failureCode: "turn_journal_cancelled" })]);

    const request = surface.messages.find((message) => message.role === "user");
    expect(request?.id).toBe(`user-${CANCELLED_AT}`);
    expect(request?.id).not.toBe("pi-c49d7d5d");
  });

  it("lets the cancelled turn find its own evidence again", () => {
    // The identity is what links a request to its turn, and through it to steering evidence.
    const surface = project(
      CANCELLED_RUN,
      [turn(CANCELLED_AT, { state: "failed", failureCode: "turn_journal_cancelled" })],
      {
        steeringEvidence: [
          { schemaVersion: "0.1.0", assistantMessageId: `assistant-${CANCELLED_AT}`, sequence: 1, status: "pending", content: "espera" },
        ],
      },
    );

    const index = buildConversationTranscriptIndex(surface);
    const request = surface.messages.find((message) => message.role === "user")!;
    const owningTurn = index.turnByUserMessageId.get(request.id);
    expect(owningTurn?.runId).toBe(`agent-run-${CANCELLED_AT}`);

    // CR097 changed where this lands, and strengthened it. A cancelled run's assistant message is
    // deliberately never bound, so it is not among the rendered messages — indexing the correction
    // under it meant the transcript, which looks up evidence by the ids it is rendering, could
    // never find it. The projection now says which message stands in for that run.
    const corrected = owningTurn!.harness.assistantMessageId!;
    expect(surface.messages.some((message) => message.id === corrected)).toBe(false);
    const anchor = surface.correctionAnchors?.[corrected];
    expect(surface.messages.some((message) => message.id === anchor)).toBe(true);
    expect(index.steeringByAssistantMessageId.get(anchor!)).toHaveLength(1);
  });

  it("gives each of two consecutive cancellations its own identity", () => {
    const first = "2026-09-30T11:30:03.771Z";
    const second = "2026-09-30T11:34:31.407Z";
    const surface = project(
      [
        user("aaa", "primeira", "2026-09-30T11:30:05.640Z"),
        narratedToolCall("aab", "Indo.", "bash", "2026-09-30T11:30:12.221Z"),
        toolResult("aac", "aab", "2026-09-30T11:30:12.317Z"),
        user("bbb", "segunda", "2026-09-30T11:34:33.252Z"),
        narratedToolCall("bbc", "Indo de novo.", "read", "2026-09-30T11:34:37.753Z"),
        toolResult("bbd", "bbc", "2026-09-30T11:34:38.270Z"),
      ],
      [
        turn(first, { state: "failed", failureCode: "turn_journal_cancelled" }),
        turn(second, { state: "failed", failureCode: "turn_journal_cancelled" }),
      ],
    );

    const requests = surface.messages.filter((message) => message.role === "user").map((message) => message.id);
    expect(requests).toEqual([`user-${first}`, `user-${second}`]);
  });

  it("leaves a completed turn's identity to the evidence that already records it", () => {
    const completedAt = "2026-09-30T12:00:00.000Z";
    const surface = project(
      [
        user("u1", "faça", "2026-09-30T12:00:01Z"),
        answer("a1", "Pronto.", "2026-09-30T12:00:05Z"),
      ],
      [turn(completedAt, { state: "committed", userEntryId: "u1", assistantEntryId: "a1" })],
    );

    expect(surface.messages.map((message) => message.id)).toEqual([`user-${completedAt}`, `assistant-${completedAt}`]);
  });

  it("still falls back to a synthetic identity when no turn record explains the request", () => {
    const surface = project(CANCELLED_RUN, []);

    expect(surface.messages.find((message) => message.role === "user")?.id).toBe("pi-c49d7d5d");
  });
});
