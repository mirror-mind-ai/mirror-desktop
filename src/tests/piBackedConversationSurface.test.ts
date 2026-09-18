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
});
