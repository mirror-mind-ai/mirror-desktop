import { describe, expect, it } from "vitest";
import {
  createTurnFinalizationCoordinator,
  type TurnFinalizationEvent,
  type TurnFinalizationPorts,
} from "../app/turnFinalizationCoordinator";
import { createJourneySettlementAuthority } from "../app/journeySettlement";
import type { TurnJournalRecord } from "../app/turnJournal";
import type { MirrorAppendOutboxItem } from "../domain/mirrorAppendOutbox";
import { createDedicatedJourneyConversation, type JourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import { readyThread } from "./fixtures/readyThread";

/**
 * CR184: the end of a turn redrew the whole Conversation. The settled presentation was the
 * projection read back from disk, and the disk deliberately keeps none of what the surface derives
 * from the Pi session (CR114): chapter dividers, comment roles, reconstructed actions, response
 * models. Adopting it changed the shape of nearly every message at once, so the transcript was
 * mounted again, then derived again by the next reload.
 */
function settlementWorld() {
  const thread = readyThread("journey-a");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-run-1", "user-run-1", "assistant-run-1");
  const staged = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-run-1", role: "user", content: "Ask", createdAt: "2026-11-02T10:00:00Z" },
    { id: "assistant-run-1", role: "assistant", content: "Answer", createdAt: "2026-11-02T10:00:01Z" },
  );
  // What the reader's surface carries and the disk never keeps.
  const surface: JourneyConversation = {
    ...staged,
    messages: [
      { id: "pi-earlier-user", role: "user", content: "Earlier", createdAt: "2026-11-01T10:00:00Z" },
      { id: "pi-earlier-note", role: "assistant", content: "Working on it", createdAt: "2026-11-01T10:00:01Z" },
      { id: "pi-earlier-answer", role: "assistant", content: "Done", createdAt: "2026-11-01T10:00:02Z" },
      ...staged.messages,
    ],
    chapterDividers: { "pi-earlier-user": { title: "The first chapter." } },
    agentCommentRoles: { "pi-earlier-note": "trail" },
    responseModels: { "pi-earlier-answer": { provider: "anthropic", model: "claude-opus-5-5" } },
    // CR188: the live run's persona is only on this surface; settlement must keep it.
    responsePersonas: { "pi-earlier-answer": "pensadora", "assistant-run-1": "pensadora" },
  };
  const authority = createJourneySettlementAuthority(
    createRunAuthority(correlation, base.liveIdentity, thread.generations[0]),
  );
  const journal: TurnJournalRecord[] = [{
    schemaVersion: "0.1.0",
    authority: {
      schemaVersion: "0.1.0",
      journeyId: authority.journeyId,
      runId: authority.runId,
      turnId: authority.turnId,
      threadId: authority.threadId,
      generation: authority.generation,
      piSessionId: authority.piSessionId,
      mirrorConversationId: authority.mirrorConversationId,
      harnessUserMessageId: authority.harnessUserMessageId,
      harnessAssistantMessageId: authority.harnessAssistantMessageId,
    },
    phase: "terminal_durable",
    terminalOutcome: "completed",
    terminalEvidence: {
      capturedAt: "2026-11-02T10:00:02Z",
      piExecution: {
        userEntryId: "pi-user-run-1",
        assistantEntryId: "pi-assistant-run-1",
        leafEntryId: "pi-assistant-run-1",
        entryCount: 2,
        assistantText: "Answer",
        assistantTextTruncated: false,
        startedAt: "2026-11-02T10:00:00Z",
        committedAt: "2026-11-02T10:00:02Z",
      },
    },
    cancellationIntent: "none",
    recoveryDisposition: "none",
    revision: 1,
    createdAt: "2026-11-02T10:00:00Z",
    updatedAt: "2026-11-02T10:00:02Z",
    lastReceipt: null,
  }];
  // The disk as production has it: written and read through the persisted shape.
  let stored: string | undefined;
  let outbox: MirrorAppendOutboxItem[] = [];
  const write = (projection: JourneyConversation) => {
    stored = JSON.stringify(createPersistedJourneyConversation(projection));
  };
  const ports: TurnFinalizationPorts = {
    loadActiveEvidence: async (exact) => ({
      activeGeneration: exact.generation, currentRunId: exact.runId, currentTurnId: exact.turnId,
    }),
    saveProjection: async (projection) => {
      write(projection);
      if (journal[0].phase === "terminal_durable") journal[0].phase = "projected";
    },
    cleanupLease: async () => {},
    loadJournal: async () => ({ schemaVersion: "0.1.0", records: journal, savedAt: "2026-11-02T10:00:03Z" }),
    advanceJournal: async (_exact, _expected, next) => { journal[0].phase = next; },
    enqueueOutboxItem: async (item) => { outbox = [item]; },
    deliverOutboxItem: async (itemId) => {
      const item = outbox.find((candidate) => candidate.itemId === itemId);
      if (!item) throw new Error("mirror_append_item_missing");
      return {
        schemaVersion: "1.0.0",
        status: "accepted",
        conversationId: item.conversationId,
        journeyId: item.journeyId,
        insertedCount: item.messages.length,
        existingCount: 0,
        messages: item.messages.map((message) => ({ id: message.id, state: "inserted" as const })),
      };
    },
    acknowledgeOutboxItem: async () => { outbox = []; },
    loadPersistedProjection: async () => (
      stored ? parsePersistedJourneyConversation(JSON.parse(stored))?.conversation : undefined
    ),
    savePostFrontierProjection: async (projection) => write(projection),
  };
  return { surface, authority, correlation, ports };
}

describe("CR184: a turn settles in place", () => {
  it("presents the settled turn on the reader's surface, not on the projection read back from disk", async () => {
    const { surface, authority, correlation, ports } = settlementWorld();
    const coordinator = createTurnFinalizationCoordinator();
    const presented: Extract<TurnFinalizationEvent, { type: "presentation" }>[] = [];
    coordinator.subscribe((event) => { if (event.type === "presentation") presented.push(event); });

    await coordinator.finalizeCompletedTurn({ authority, correlation, projection: surface }, ports);

    const settled = presented.find((event) => event.phase === "settled")?.projection;
    expect(settled).toBeDefined();
    // The Mirror commitment is what settling adds, and it arrives.
    expect(settled?.reconciliation.turns.find((turn) => turn.turnId === authority.turnId)?.mirror.state)
      .toBe("committed");
    // Everything the reader was looking at keeps its shape.
    expect(settled?.chapterDividers).toEqual(surface.chapterDividers);
    expect(settled?.agentCommentRoles).toEqual(surface.agentCommentRoles);
    expect(settled?.responseModels).toEqual(surface.responseModels);
    expect(settled?.responsePersonas).toEqual(surface.responsePersonas);
    // And its messages are the very ones on screen, so no row has a reason to be drawn again.
    expect(settled?.messages.slice(0, 3)).toEqual(surface.messages.slice(0, 3));
    settled?.messages.slice(0, 3).forEach((message, index) => {
      expect(message).toBe(surface.messages[index]);
    });
  });
});
