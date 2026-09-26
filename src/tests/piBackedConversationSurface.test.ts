import { describe, expect, it } from "vitest";
import {
  projectPiBackedConversationSurface,
  type PiConversationSurfaceInspection,
} from "../domain/piBackedConversationSurface";
import { createJourneyConversation, type JourneyConversation } from "../domain/journeyConversation";

function conversation(): JourneyConversation {
  const base = createJourneyConversation({ journeyId: "journey-a", initialMessages: [], now: new Date("2026-09-18T10:00:00Z") });
  return {
    ...base,
    id: "thread-a",
    liveIdentity: {
      schemaVersion: "0.1.0",
      journeyId: "journey-a",
      harnessConversationId: "thread-a",
      piSessionId: "session-a",
      piSessionFile: "/safe/session-a.jsonl",
      mirrorConversationId: "mirror-a",
      activationReceiptActivatedAt: "2026-09-18T09:00:00Z",
      generation: 1,
      origin: "new",
    },
    reconciliation: {
      ...base.reconciliation,
      authority: {
        journeyId: "journey-a",
        harnessConversationId: "thread-a",
        piSessionId: "session-a",
        generation: 1,
        mirrorConversationId: "mirror-a",
      },
    },
  };
}

function inspection(entries: PiConversationSurfaceInspection["entries"]): PiConversationSurfaceInspection {
  return { schemaVersion: "0.1.0", entries };
}

describe("Pi-backed Conversation Surface", () => {
  it("replaces stale projected content with every visible native user and assistant entry", () => {
    const projected = { ...conversation(), messages: [
      { id: "ghost-user", role: "user" as const, content: "ghost", createdAt: "2026-09-18T09:01:00Z" },
      { id: "ghost-assistant", role: "assistant" as const, content: "", createdAt: "2026-09-18T09:01:00Z" },
    ] };
    const result = projectPiBackedConversationSurface(projected, inspection([
      { entryId: "native-user-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
      { entryId: "tool-1", role: "toolResult", visibleText: "private tool output", timestamp: "2026-09-18T10:01:01Z" },
      { entryId: "native-assistant-1", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:02Z" },
      { entryId: "native-user-2", role: "user", visibleText: "Unanswered but admitted", timestamp: "2026-09-18T10:02:00Z" },
    ]));

    expect(result.messages).toEqual([
      { id: "pi-native-user-1", role: "user", content: "Question", createdAt: "2026-09-18T10:01:00Z" },
      { id: "pi-native-assistant-1", role: "assistant", content: "Answer", createdAt: "2026-09-18T10:01:02Z" },
      { id: "pi-native-user-2", role: "user", content: "Unanswered but admitted", createdAt: "2026-09-18T10:02:00Z" },
    ]);
  });

  it("deterministically normalizes raw Pi structured assistant output", () => {
    const raw = '```json\n{"assistantMessage":"Readable answer","missionDraft":{"status":"draft"}}\n```';
    const result = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "native-assistant", role: "assistant", visibleText: raw, timestamp: "2026-09-18T10:00:00Z" },
    ]));
    expect(result.messages[0]?.content).toBe("Readable answer");
  });

  it("preserves exact aliases and user attachments only through matching Pi reconciliation", () => {
    const base = conversation();
    const projected: JourneyConversation = {
      ...base,
      messages: [{
        id: "desktop-user-1", role: "user", content: "stale", createdAt: "2026-09-18T09:00:00Z",
        attachments: [{ schemaVersion: "0.2.0", attachmentId: "attachment-1", journeyId: "journey-a", kind: "file", absolutePath: "/tmp/reference.md", displayName: "reference.md", sizeBytes: 12, selectedAt: "2026-09-18T09:00:00Z" }],
      }, {
        id: "desktop-assistant-1", role: "assistant", content: "stale", createdAt: "2026-09-18T09:00:01Z",
      }],
      reconciliation: {
        ...base.reconciliation,
        turns: [{
          turnId: "turn-1", runId: "run-1", origin: "nautilus", startedAt: "2026-09-18T10:00:00Z",
          harness: { state: "committed", userMessageId: "desktop-user-1", assistantMessageId: "desktop-assistant-1" },
          pi: { state: "committed", userEntryId: "native-user-1", assistantEntryId: "native-assistant-1" },
          mirror: { state: "pending" },
        }],
      },
    };
    const result = projectPiBackedConversationSurface(projected, inspection([
      { entryId: "native-user-1", role: "user", visibleText: "Native question", timestamp: "2026-09-18T10:00:00Z" },
      { entryId: "native-assistant-1", role: "assistant", visibleText: "Native answer", timestamp: "2026-09-18T10:00:01Z" },
    ]));

    expect(result.messages[0]).toMatchObject({ id: "desktop-user-1", content: "Native question", attachments: projected.messages[0].attachments });
    expect(result.messages[1]).toMatchObject({ id: "desktop-assistant-1", content: "Native answer" });
    expect(result.terminalAgentActionEvidence).toBe(projected.terminalAgentActionEvidence);
  });

  it("does not transfer attachments from an unbound projection-only ghost", () => {
    const projected = { ...conversation(), messages: [{
      id: "ghost", role: "user" as const, content: "ghost", createdAt: "2026-09-18T09:00:00Z",
      attachments: [{ schemaVersion: "0.2.0" as const, attachmentId: "ghost-attachment", journeyId: "journey-a", kind: "file" as const, absolutePath: "/tmp/ghost.md", displayName: "ghost.md", sizeBytes: 1, selectedAt: "2026-09-18T09:00:00Z" }],
    }] };
    const result = projectPiBackedConversationSurface(projected, inspection([
      { entryId: "native-user", role: "user", visibleText: "Native", timestamp: "" },
    ]));
    expect(result.messages).toEqual([{
      id: "pi-native-user", role: "user", content: "Native", createdAt: projected.createdAt,
    }]);
  });

  it("rejects incompatible inspection schema instead of falling back to projection messages", () => {
    expect(() => projectPiBackedConversationSurface(conversation(), {
      schemaVersion: "9.9.9" as "0.1.0",
      entries: [],
    })).toThrow("pi_surface_inspection_invalid");
  });

  it("rejects conflicting Desktop aliases for one native entry", () => {
    const base = conversation();
    const conflicted: JourneyConversation = {
      ...base,
      reconciliation: {
        ...base.reconciliation,
        turns: ["one", "two"].map((suffix) => ({
          turnId: `turn-${suffix}`, runId: `run-${suffix}`, origin: "nautilus" as const, startedAt: base.createdAt,
          harness: { state: "committed" as const, userMessageId: `desktop-${suffix}` },
          pi: { state: "committed" as const, userEntryId: "native-user" },
          mirror: { state: "pending" as const },
        })),
      },
    };
    expect(() => projectPiBackedConversationSurface(conflicted, inspection([])))
      .toThrow("pi_surface_metadata_conflict");
  });

  it("reconstructs interleaved thinking and tool calls across a multi-entry turn in order", () => {
    const result = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "user-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
      { entryId: "step-1", role: "assistant", visibleText: "", timestamp: "2026-09-18T10:01:01Z",
        nativeContent: [
          { type: "thinking", thinking: "I need to find where these files live." },
          { type: "toolCall", id: "call-1", name: "glob", arguments: { pattern: "**/*.ts" } },
        ] },
      { entryId: "result-1", role: "toolResult", visibleText: "matches", timestamp: "2026-09-18T10:01:02Z", toolCallId: "call-1", isError: false },
      { entryId: "step-2", role: "assistant", visibleText: "", timestamp: "2026-09-18T10:01:03Z",
        nativeContent: [
          { type: "thinking", thinking: "Not there, widening the search." },
          { type: "toolCall", id: "call-2", name: "bash", arguments: { command: "rg pattern" } },
        ] },
      { entryId: "result-2", role: "toolResult", visibleText: "boom", timestamp: "2026-09-18T10:01:04Z", toolCallId: "call-2", isError: true },
      { entryId: "final", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:05Z",
        nativeContent: [
          { type: "thinking", thinking: "Now I can answer." },
          { type: "text", text: "Answer" },
        ] },
    ]));

    const projection = result.reconstructedAgentActions?.["pi-final"];
    expect(projection).toBeDefined();
    expect(projection?.status).toBe("completed");
    expect(projection?.activityOrder).toEqual([
      { type: "reasoning_summary", id: "pi-final:thinking:1" },
      { type: "operation", id: "call-1" },
      { type: "reasoning_summary", id: "pi-final:thinking:2" },
      { type: "operation", id: "call-2" },
      { type: "reasoning_summary", id: "pi-final:thinking:3" },
    ]);
    expect(projection?.reasoningSummaries.map((summary) => summary.content)).toEqual([
      "I need to find where these files live.",
      "Not there, widening the search.",
      "Now I can answer.",
    ]);
    expect(projection?.operations).toEqual([
      { id: "call-1", name: "glob", status: "completed", arguments: { pattern: "**/*.ts" } },
      { id: "call-2", name: "bash", status: "failed", arguments: { command: "rg pattern" }, isError: true },
    ]);
  });

  it("marks tool calls without a recorded result as interrupted", () => {
    const result = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "final", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:00Z",
        nativeContent: [
          { type: "thinking", thinking: "Trying a tool that never returned." },
          { type: "toolCall", id: "call-lost", name: "bash", arguments: { command: "sleep" } },
        ] },
    ]));
    expect(result.reconstructedAgentActions?.["pi-final"]?.operations).toEqual([
      { id: "call-lost", name: "bash", status: "interrupted", arguments: { command: "sleep" } },
    ]);
  });

  it("reconstructs nothing without thinking evidence and keeps live evidence authoritative", () => {
    const toolsOnly = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "final", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:00Z",
        nativeContent: [{ type: "toolCall", id: "call-1", name: "read", arguments: {} }] },
    ]));
    expect(toolsOnly.reconstructedAgentActions).toBeUndefined();

    const base = conversation();
    const withEvidence: JourneyConversation = {
      ...base,
      terminalAgentActionEvidence: {
        "pi-final": {
          schemaVersion: "0.1.0", journeyId: "journey-a", generation: 1, runId: "run-live", turnId: "turn-live",
          assistantMessageId: "pi-final",
          projection: { status: "completed", operations: [], reasoningSummaries: [{ id: "live-1", content: "live capture", status: "completed" }], activityOrder: [{ type: "reasoning_summary", id: "live-1" }] },
        },
      },
    };
    const preserved = projectPiBackedConversationSurface(withEvidence, inspection([
      { entryId: "final", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:00Z",
        nativeContent: [{ type: "thinking", thinking: "session-derived reasoning" }] },
    ]));
    expect(preserved.reconstructedAgentActions).toBeUndefined();
    expect(preserved.terminalAgentActionEvidence?.["pi-final"]?.projection.reasoningSummaries[0]?.content).toBe("live capture");
  });

  it("drops pending reasoning when a new user entry arrives before a visible assistant answer", () => {
    const result = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "step-1", role: "assistant", visibleText: "", timestamp: "2026-09-18T10:01:00Z",
        nativeContent: [{ type: "thinking", thinking: "interrupted reasoning" }] },
      { entryId: "user-2", role: "user", visibleText: "New question", timestamp: "2026-09-18T10:02:00Z" },
      { entryId: "final", role: "assistant", visibleText: "Fresh answer", timestamp: "2026-09-18T10:02:05Z",
        nativeContent: [{ type: "thinking", thinking: "fresh reasoning" }] },
    ]));
    const projection = result.reconstructedAgentActions?.["pi-final"];
    expect(projection?.reasoningSummaries.map((summary) => summary.content)).toEqual(["fresh reasoning"]);
  });

  it("applies the CR076 bounds to reconstructed reasoning with visible truncation and elision", () => {
    const bigBlocks = Array.from({ length: 9 }, (_, index) => (
      { type: "thinking", thinking: String.fromCharCode(97 + index).repeat(9000) }
    ));
    const result = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "final", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:00Z",
        nativeContent: bigBlocks },
    ]));
    const summaries = result.reconstructedAgentActions?.["pi-final"]?.reasoningSummaries ?? [];
    expect(summaries).toHaveLength(9);
    expect(summaries[0].content.length).toBe(8192);
    expect(summaries[0].truncated).toBe(true);
    expect(summaries.at(-1)).toMatchObject({ content: "", elided: true });
    const total = summaries.reduce((sum, summary) => sum + summary.content.length, 0);
    expect(total).toBeLessThanOrEqual(65536);
  });

  // CR091: the transcript should be able to say which model produced each answer. The
  // attribution is re-derived from Pi at every reconstruction, never stored, so it survives
  // by construction and applies to Conversations that already exist.
  it("attributes each assistant message to the model Pi recorded for it", () => {
    const surface = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "pi-user-1", role: "user", visibleText: "First", timestamp: "2026-09-18T10:00:00Z" },
      {
        entryId: "pi-assistant-1", role: "assistant", visibleText: "Deep answer",
        timestamp: "2026-09-18T10:00:01Z", provider: "claude-bridge", model: "claude-opus-5",
      },
      { entryId: "pi-user-2", role: "user", visibleText: "Second", timestamp: "2026-09-18T10:00:02Z" },
      {
        entryId: "pi-assistant-2", role: "assistant", visibleText: "Everyday answer",
        timestamp: "2026-09-18T10:00:03Z", provider: "openai-codex", model: "gpt-5.5",
      },
    ]));

    const [, first, , second] = surface.messages;
    expect(surface.responseModels?.[first.id]).toEqual({ provider: "claude-bridge", model: "claude-opus-5" });
    expect(surface.responseModels?.[second.id]).toEqual({ provider: "openai-codex", model: "gpt-5.5" });
  });

  it("leaves an unattributed answer unattributed rather than borrowing a neighbour's model", () => {
    const surface = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "pi-user-1", role: "user", visibleText: "First", timestamp: "2026-09-18T10:00:00Z" },
      {
        entryId: "pi-assistant-1", role: "assistant", visibleText: "Attributed",
        timestamp: "2026-09-18T10:00:01Z", provider: "openai-codex", model: "gpt-5.5",
      },
      { entryId: "pi-user-2", role: "user", visibleText: "Second", timestamp: "2026-09-18T10:00:02Z" },
      { entryId: "pi-assistant-2", role: "assistant", visibleText: "Bare", timestamp: "2026-09-18T10:00:03Z" },
    ]));

    const [, attributed, , bare] = surface.messages;
    expect(surface.responseModels?.[attributed.id]).toEqual({ provider: "openai-codex", model: "gpt-5.5" });
    expect(surface.responseModels?.[bare.id]).toBeUndefined();
  });

  it("carries no attribution map at all when Pi recorded none", () => {
    const surface = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "pi-user-1", role: "user", visibleText: "First", timestamp: "2026-09-18T10:00:00Z" },
      { entryId: "pi-assistant-1", role: "assistant", visibleText: "Bare", timestamp: "2026-09-18T10:00:01Z" },
    ]));
    expect(surface.responseModels).toBeUndefined();
  });
});
