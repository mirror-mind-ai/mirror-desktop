// CR088: the blocking turn record and the occupancy it is judged against must come from
// one snapshot. Holding the record as independently aged state let the app render a state
// that cannot exist at any instant — a record that only exists while the exact native run
// is active, judged by routes that require that same run to be inactive — which surfaced
// the `Resolve the preserved attempt` panel as a flicker after cancellation.
import type { BlockingTurnRecoveryEvidence } from "../domain/conversationRecovery";
import {
  findBlockingTurnJournalRecord,
  hasFreshCompleteTurnJournalEvidence,
  type TurnJournalRecord,
} from "./turnJournal";

const RECOVERABLE_PHASES = ["admitted", "running", "terminal_durable", "projected"] as const;

export type BlockingTurnPresentation = {
  record?: TurnJournalRecord;
  evidence?: BlockingTurnRecoveryEvidence;
};

export function deriveBlockingTurnPresentation(input: {
  journalRecords: readonly TurnJournalRecord[];
  journeyId: string;
  activeGeneration: number;
  threadId?: string;
  /** Run id of the exact active native lease, absent when no run is active. */
  activeNativeRunId?: string;
  occupancyKnown: boolean;
  runtimeBusy: boolean;
}): BlockingTurnPresentation {
  const record = findBlockingTurnJournalRecord(
    { records: [...input.journalRecords] },
    input.journeyId,
    input.activeGeneration,
    input.threadId,
    input.activeNativeRunId,
  );
  if (!record) return {};
  if (!RECOVERABLE_PHASES.includes(record.phase as (typeof RECOVERABLE_PHASES)[number])) {
    return { record };
  }
  return {
    record,
    evidence: {
      phase: record.phase as (typeof RECOVERABLE_PHASES)[number],
      terminalOutcome: record.terminalOutcome,
      hasFreshCompletePiEvidence: hasFreshCompleteTurnJournalEvidence(record),
      // Judged against the same lease input that produced the record, never against a
      // separately read occupancy snapshot.
      exactRunInactive: input.occupancyKnown && !input.activeNativeRunId && !input.runtimeBusy,
    },
  };
}
