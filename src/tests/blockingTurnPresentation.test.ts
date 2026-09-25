import { describe, expect, it } from "vitest";
import { deriveBlockingTurnPresentation } from "../app/blockingTurnPresentation";
import { decideConversationRecoveryRoutes } from "../domain/conversationRecovery";
import type { ConversationAvailability } from "../domain/conversationAvailability";
import type { TurnJournalRecord, TurnPhase, TurnTerminalOutcome } from "../app/turnJournal";

function record(overrides: Partial<TurnJournalRecord> = {}): TurnJournalRecord {
  return {
    schemaVersion: "0.1.0",
    authority: {
      schemaVersion: "0.1.0",
      journeyId: "journey-a",
      runId: "run-1",
      turnId: "turn-1",
      threadId: "thread-a",
      generation: 1,
      piSessionId: "pi-a",
      mirrorConversationId: "mirror-a",
      harnessUserMessageId: "user-1",
      harnessAssistantMessageId: "assistant-1",
    },
    phase: "running",
    terminalOutcome: null,
    terminalEvidence: null,
    cancellationIntent: "none",
    recoveryDisposition: "none",
    revision: 2,
    createdAt: "2026-09-24T12:00:00.000Z",
    updatedAt: "2026-09-24T12:00:01.000Z",
    lastReceipt: null,
    ...overrides,
  };
}

const completedEvidence = {
  capturedAt: "2026-09-24T12:00:02.000Z",
  piExecution: {
    userEntryId: "pi-user-1",
    assistantEntryId: "pi-assistant-1",
    leafEntryId: "pi-assistant-1",
    entryCount: 2,
    assistantText: "answer",
    assistantTextTruncated: false,
    startedAt: "2026-09-24T12:00:00.500Z",
    committedAt: "2026-09-24T12:00:02.000Z",
  },
} satisfies TurnJournalRecord["terminalEvidence"];

const availability: ConversationAvailability = {
  condition: "ready",
  canDraft: true,
  canSend: true,
  canStartNewConversation: true,
  canResetAgentContext: true,
  recoveryActions: [],
};

const phases: TurnPhase[] = [
  "admitted", "running", "terminal_durable", "projected", "outbox_enqueued", "settled", "interrupted",
];
const outcomes: (TurnTerminalOutcome | null)[] = [null, "completed", "cancelled", "spawn_failed", "process_died"];

describe("blocking turn presentation coherence (CR088)", () => {
  // The proof that justified deleting the blocking recovery branch: across the whole finite
  // input space, a blocking record implies the exact native run is active, and no recovery
  // route is ever offered for it.
  it("only reports a blocking turn for an active run, and never offers it a route", () => {
    let blockingSeen = 0;
    for (const phase of phases) {
      for (const terminalOutcome of outcomes) {
        for (const activeNativeRunId of [undefined, "run-1", "other-run"]) {
          for (const withEvidence of [false, true]) {
            for (const mirrorSynchronization of ["none", "exact_repair_available", "legacy_gap"] as const) {
              const { record: blocking } = deriveBlockingTurnPresentation({
                journalRecords: [record({
                  phase,
                  terminalOutcome,
                  terminalEvidence: withEvidence ? completedEvidence : null,
                })],
                journeyId: "journey-a",
                activeGeneration: 1,
                threadId: "thread-a",
                activeNativeRunId,
              });
              if (!blocking) continue;
              blockingSeen += 1;
              // Coherence: a record can only exist for the exact active run.
              expect(activeNativeRunId).toBe("run-1");
              expect(decideConversationRecoveryRoutes({
                availability,
                blockingTurnActive: true,
                mirrorSynchronization,
                canCreateDesktopConversation: true,
              })).toEqual([]);
            }
          }
        }
      }
    }
    expect(blockingSeen).toBeGreaterThan(0);
  });

  it("reports the blocking turn while the exact run is active", () => {
    const { record: blocking } = deriveBlockingTurnPresentation({
      journalRecords: [record({ phase: "running" })],
      journeyId: "journey-a",
      activeGeneration: 1,
      threadId: "thread-a",
      activeNativeRunId: "run-1",
    });
    expect(blocking?.authority.runId).toBe("run-1");
  });

  it("reports no blocking turn once the exact run is no longer active", () => {
    // The cancellation window: the lease is gone while the journal record still reads running.
    expect(deriveBlockingTurnPresentation({
      journalRecords: [record({ phase: "running" })],
      journeyId: "journey-a",
      activeGeneration: 1,
      threadId: "thread-a",
      activeNativeRunId: undefined,
    })).toEqual({});
  });

  it("ignores successor-eligible, foreign-Journey and newer-generation records", () => {
    const base = {
      journeyId: "journey-a",
      activeGeneration: 1,
      threadId: "thread-a",
      activeNativeRunId: "run-1",
    };
    expect(deriveBlockingTurnPresentation({ ...base, journalRecords: [record({ phase: "settled" })] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, journalRecords: [record({ phase: "interrupted" })] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, journeyId: "journey-b", journalRecords: [record()] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, activeGeneration: 0, journalRecords: [record()] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, threadId: "other", journalRecords: [record()] })).toEqual({});
  });
});
