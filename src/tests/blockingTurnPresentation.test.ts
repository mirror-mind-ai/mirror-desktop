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
  // The proof: across the whole finite input space, a blocking record and an inactive exact
  // run can never hold together, so the blocking recovery branch can never produce routes.
  it("never yields recovery routes for a blocking turn, across the whole input space", () => {
    let blockingSeen = 0;
    let inactiveSeen = 0;
    for (const phase of phases) {
      for (const terminalOutcome of outcomes) {
        for (const activeNativeRunId of [undefined, "run-1"]) {
          for (const occupancyKnown of [false, true]) {
            for (const runtimeBusy of [false, true]) {
              for (const withEvidence of [false, true]) {
                const { record: blocking, evidence } = deriveBlockingTurnPresentation({
                  journalRecords: [record({
                    phase,
                    terminalOutcome,
                    terminalEvidence: withEvidence ? completedEvidence : null,
                  })],
                  journeyId: "journey-a",
                  activeGeneration: 1,
                  threadId: "thread-a",
                  activeNativeRunId,
                  occupancyKnown,
                  runtimeBusy,
                });
                if (!blocking) continue;
                blockingSeen += 1;
                // A record exists only while the exact run is active, so it can never be inactive.
                expect(evidence?.exactRunInactive ?? false).toBe(false);
                const routes = decideConversationRecoveryRoutes({
                  availability,
                  blockingTurn: evidence,
                  mirrorSynchronization: "none",
                  canCreateDesktopConversation: true,
                });
                expect(routes).toEqual([]);
                if (occupancyKnown && !runtimeBusy) inactiveSeen += 1;
              }
            }
          }
        }
      }
    }
    // The space really did exercise blocking records, including the occupancy shape that
    // would have produced routes under the previous cross-time derivation.
    expect(blockingSeen).toBeGreaterThan(0);
    expect(inactiveSeen).toBeGreaterThan(0);
  });

  it("keeps the still-finishing status for the exact active run", () => {
    const { record: blocking, evidence } = deriveBlockingTurnPresentation({
      journalRecords: [record({ phase: "running" })],
      journeyId: "journey-a",
      activeGeneration: 1,
      threadId: "thread-a",
      activeNativeRunId: "run-1",
      occupancyKnown: true,
      runtimeBusy: true,
    });
    expect(blocking?.authority.runId).toBe("run-1");
    expect(evidence).toMatchObject({ phase: "running", exactRunInactive: false });
  });

  it("reports no blocking turn once the exact run is no longer active", () => {
    // The cancellation window: the lease is gone while the journal record still reads running.
    expect(deriveBlockingTurnPresentation({
      journalRecords: [record({ phase: "running" })],
      journeyId: "journey-a",
      activeGeneration: 1,
      threadId: "thread-a",
      activeNativeRunId: undefined,
      occupancyKnown: true,
      runtimeBusy: false,
    })).toEqual({});
  });

  it("ignores successor-eligible, foreign-Journey and newer-generation records", () => {
    const base = {
      journeyId: "journey-a",
      activeGeneration: 1,
      threadId: "thread-a",
      activeNativeRunId: "run-1",
      occupancyKnown: true,
      runtimeBusy: true,
    };
    expect(deriveBlockingTurnPresentation({ ...base, journalRecords: [record({ phase: "settled" })] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, journalRecords: [record({ phase: "interrupted" })] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, journeyId: "journey-b", journalRecords: [record()] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, activeGeneration: 0, journalRecords: [record()] })).toEqual({});
    expect(deriveBlockingTurnPresentation({ ...base, threadId: "other", journalRecords: [record()] })).toEqual({});
  });
});
