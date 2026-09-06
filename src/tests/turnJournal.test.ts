import { describe, expect, it } from "vitest";
import type { JourneySettlementAuthority } from "../domain/journeySettlementAuthority";
import {
  decideTurnJournalRecovery,
  decideTurnJournalTerminal,
  findBlockingTurnJournalRecord,
  findExactTurnJournalRecord,
  isTurnJournalSuccessorEligible,
  requireExactTurnJournalRecord,
  type TurnJournalDocument,
  type TurnJournalRecord,
} from "../app/turnJournal";

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
    phase: "terminal_durable",
    terminalOutcome: "completed",
    terminalEvidence: {
      capturedAt: "2026-09-01T20:00:00.000Z",
      piExecution: {
        userEntryId: "pi-user-1",
        assistantEntryId: "pi-assistant-1",
        leafEntryId: "pi-assistant-1",
        entryCount: 2,
        assistantText: "answer",
        assistantTextTruncated: false,
        startedAt: "2026-09-01T19:59:59.000Z",
        committedAt: "2026-09-01T20:00:00.000Z",
      },
    },
    cancellationIntent: "none",
    recoveryDisposition: "resume_projection",
    revision: 3,
    createdAt: "2026-09-01T19:59:58.000Z",
    updatedAt: "2026-09-01T20:00:00.000Z",
    lastReceipt: null,
    ...overrides,
  };
}

function authority(overrides: Partial<JourneySettlementAuthority> = {}): JourneySettlementAuthority {
  return {
    schemaVersion: "0.1.0",
    runAuthority: {} as JourneySettlementAuthority["runAuthority"],
    journeyId: "journey-a",
    runId: "run-1",
    turnId: "turn-1",
    threadId: "thread-a",
    generation: 1,
    piSessionId: "pi-a",
    piSessionFile: "/private/pi-a.jsonl",
    mirrorConversationId: "mirror-a",
    harnessUserMessageId: "user-1",
    harnessAssistantMessageId: "assistant-1",
    ...overrides,
  };
}

function document(item: TurnJournalRecord): TurnJournalDocument {
  return {
    schemaVersion: "0.1.0",
    records: [item],
    savedAt: item.updatedAt,
  };
}

describe("durable turn journal authority", () => {
  it("requires every exact authority coordinate instead of selected-Journey identity", () => {
    const exact = record();
    expect(findExactTurnJournalRecord(document(exact), authority())).toBe(exact);
    expect(findExactTurnJournalRecord({ ...document(exact), records: [] }, authority())).toBeUndefined();
    expect(requireExactTurnJournalRecord(document(exact), authority())).toBe(exact);
    expect(() => requireExactTurnJournalRecord(document(exact), authority({ runId: "replacement" })))
      .toThrow("turn_journal_authority_mismatch");
    expect(() => requireExactTurnJournalRecord(document(exact), authority({ generation: 2 })))
      .toThrow("turn_journal_authority_mismatch");
  });

  it("chooses terminal settlement only from durable journal outcome and evidence", () => {
    expect(decideTurnJournalTerminal(record())).toBe("completed");
    expect(decideTurnJournalTerminal(record({ terminalOutcome: "cancelled" }))).toBe("cancelled");
    expect(decideTurnJournalTerminal(record({ terminalOutcome: "process_died" }))).toBe("failed");
    expect(() => decideTurnJournalTerminal(record({ phase: "running", terminalOutcome: null, terminalEvidence: null })))
      .toThrow("turn_journal_terminal_not_durable");
    expect(() => decideTurnJournalTerminal(record({ terminalEvidence: null })))
      .toThrow("turn_journal_completed_evidence_missing");
  });

  it("chooses restart work from the durable phase without transcript or lease inference", () => {
    expect(decideTurnJournalRecovery(record({ phase: "admitted", terminalOutcome: null, terminalEvidence: null }))).toBe("interrupt");
    expect(decideTurnJournalRecovery(record({ phase: "running", terminalOutcome: null, terminalEvidence: null }))).toBe("interrupt");
    expect(decideTurnJournalRecovery(record({ phase: "terminal_durable" }))).toBe("project_completed");
    expect(decideTurnJournalRecovery(record({ phase: "projected" }))).toBe("resume_outbox");
    expect(decideTurnJournalRecovery(record({ phase: "outbox_enqueued" }))).toBe("complete");
    expect(decideTurnJournalRecovery(record({ phase: "interrupted", terminalOutcome: null, terminalEvidence: null }))).toBe("interrupt");
  });

  it("surfaces blocking records from the active or a prior generation", () => {
    const prior = record({ phase: "running", terminalOutcome: null, terminalEvidence: null });
    expect(findBlockingTurnJournalRecord(document(prior), "journey-a", 2)).toBe(prior);
    expect(findBlockingTurnJournalRecord(document(prior), "journey-a", 1)).toBe(prior);
    expect(findBlockingTurnJournalRecord(document(prior), "journey-a", 0)).toBeUndefined();
    expect(findBlockingTurnJournalRecord(document({ ...prior, phase: "interrupted" }), "journey-a", 2)).toBeUndefined();
    expect(findBlockingTurnJournalRecord(document(prior), "journey-b", 2)).toBeUndefined();
  });

  it("permits a successor only after local outbox durability or honest interruption", () => {
    expect(isTurnJournalSuccessorEligible(record({ phase: "terminal_durable" }))).toBe(false);
    expect(isTurnJournalSuccessorEligible(record({ phase: "projected" }))).toBe(false);
    expect(isTurnJournalSuccessorEligible(record({ phase: "outbox_enqueued" }))).toBe(true);
    expect(isTurnJournalSuccessorEligible(record({ phase: "settled" }))).toBe(true);
    expect(isTurnJournalSuccessorEligible(record({ phase: "interrupted", terminalOutcome: null, terminalEvidence: null }))).toBe(true);
  });
});
