import { invoke } from "@tauri-apps/api/core";
import type { JourneySettlementAuthority } from "../domain/journeySettlementAuthority";

export type TurnPhase = "admitted" | "running" | "terminal_durable" | "projected" | "outbox_enqueued" | "settled" | "interrupted";
export type TurnTerminalOutcome = "completed" | "cancelled" | "spawn_failed" | "process_died";

export interface TurnJournalRecord {
  schemaVersion: "0.1.0";
  authority: {
    schemaVersion: "0.1.0";
    journeyId: string;
    runId: string;
    turnId: string;
    threadId: string;
    generation: number;
    piSessionId: string;
    mirrorConversationId: string;
    harnessUserMessageId: string;
    harnessAssistantMessageId: string;
  };
  phase: TurnPhase;
  terminalOutcome: TurnTerminalOutcome | null;
  terminalEvidence: {
    capturedAt: string;
    piExecution: {
      userEntryId: string;
      assistantEntryId: string;
      leafEntryId: string;
      entryCount: number;
      assistantText: string;
      assistantTextTruncated: boolean;
      startedAt: string;
      committedAt: string;
    } | null;
  } | null;
  cancellationIntent: "none" | "requested";
  recoveryDisposition: "none" | "resume_execution" | "resume_projection" | "resume_outbox" | "complete" | "interrupted";
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastReceipt: unknown | null;
}

export interface TurnJournalDocument {
  schemaVersion: "0.1.0";
  records: TurnJournalRecord[];
  savedAt: string;
}

const phases: TurnPhase[] = [
  "admitted", "running", "terminal_durable", "projected", "outbox_enqueued", "settled", "interrupted",
];

export function requireExactTurnJournalRecord(
  document: TurnJournalDocument,
  authority: JourneySettlementAuthority,
): TurnJournalRecord {
  const record = document.records.find((candidate) => candidate.authority.runId === authority.runId);
  if (!record
    || record.authority.journeyId !== authority.journeyId
    || record.authority.turnId !== authority.turnId
    || record.authority.threadId !== authority.threadId
    || record.authority.generation !== authority.generation
    || record.authority.piSessionId !== authority.piSessionId
    || record.authority.mirrorConversationId !== authority.mirrorConversationId
    || record.authority.harnessUserMessageId !== authority.harnessUserMessageId
    || record.authority.harnessAssistantMessageId !== authority.harnessAssistantMessageId) {
    throw new Error("turn_journal_authority_mismatch");
  }
  return record;
}

export async function loadTurnJournal(journeyId: string): Promise<TurnJournalDocument> {
  return invoke<TurnJournalDocument>("list_turn_journal", { journeyId });
}

export async function advanceTurnJournal(
  authority: JourneySettlementAuthority,
  expectedPhase: TurnPhase | readonly TurnPhase[],
  nextPhase: TurnPhase,
): Promise<TurnJournalRecord> {
  const document = await loadTurnJournal(authority.journeyId);
  const record = requireExactTurnJournalRecord(document, authority);
  if (record.phase === nextPhase || (nextPhase === "settled" && record.phase === "settled")) return record;
  const expectedPhases = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
  if (!expectedPhases.includes(record.phase)) {
    throw new Error(`turn_journal_shadow_divergence:${record.phase}:${expectedPhases.join("|")}`);
  }
  return invoke<TurnJournalRecord>("transition_turn_journal", {
    runAuthority: authority.runAuthority,
    request: {
      expectedRevision: record.revision,
      expectedPhase: record.phase,
      nextPhase,
      receiptId: `${nextPhase}-${authority.runId}`,
      terminalOutcome: null,
      cancellationIntent: null,
      recoveryDisposition: nextPhase === "projected"
        ? "resume_outbox"
        : nextPhase === "outbox_enqueued" || nextPhase === "settled"
          ? "complete"
          : nextPhase === "interrupted" ? "interrupted" : null,
    },
  });
}

export type TurnJournalTerminalDecision = "completed" | "cancelled" | "failed";
export type TurnJournalRecoveryDecision =
  | "interrupt"
  | "project_completed"
  | "project_cancelled"
  | "project_failed"
  | "resume_outbox"
  | "complete";

export function decideTurnJournalTerminal(record: TurnJournalRecord): TurnJournalTerminalDecision {
  if (!["terminal_durable", "projected", "outbox_enqueued", "settled", "interrupted"].includes(record.phase)
    || record.terminalOutcome === null) {
    throw new Error("turn_journal_terminal_not_durable");
  }
  if (record.terminalOutcome === "completed") {
    if (!record.terminalEvidence?.piExecution) throw new Error("turn_journal_completed_evidence_missing");
    return "completed";
  }
  if (record.terminalOutcome === "cancelled") return "cancelled";
  return "failed";
}

export function decideTurnJournalRecovery(record: TurnJournalRecord): TurnJournalRecoveryDecision {
  if (record.phase === "admitted" || record.phase === "running" || record.phase === "interrupted") {
    return "interrupt";
  }
  if (record.phase === "projected") return "resume_outbox";
  if (record.phase === "outbox_enqueued" || record.phase === "settled") return "complete";
  const terminal = decideTurnJournalTerminal(record);
  return terminal === "completed"
    ? "project_completed"
    : terminal === "cancelled" ? "project_cancelled" : "project_failed";
}

export function isTurnJournalSuccessorEligible(record: TurnJournalRecord): boolean {
  return ["outbox_enqueued", "settled", "interrupted"].includes(record.phase);
}

export function isTurnJournalPhase(value: string): value is TurnPhase {
  return phases.includes(value as TurnPhase);
}
