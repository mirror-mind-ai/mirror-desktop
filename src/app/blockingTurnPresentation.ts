// CR088: the blocking turn record and the occupancy it is judged against must come from
// one snapshot. Holding the record as independently aged state let the app render a state
// that cannot exist at any instant — a record that only exists while the exact native run
// is active, judged by routes that required that same run to be inactive — which surfaced
// the `Resolve the preserved attempt` panel as a flicker after cancellation.
import { findBlockingTurnJournalRecord, type TurnJournalRecord } from "./turnJournal";

export type BlockingTurnPresentation = {
  record?: TurnJournalRecord;
};

export function deriveBlockingTurnPresentation(input: {
  journalRecords: readonly TurnJournalRecord[];
  journeyId: string;
  activeGeneration: number;
  threadId?: string;
  /** Run id of the exact active native lease, absent when no run is active. */
  activeNativeRunId?: string;
}): BlockingTurnPresentation {
  const record = findBlockingTurnJournalRecord(
    { records: [...input.journalRecords] },
    input.journeyId,
    input.activeGeneration,
    input.threadId,
    input.activeNativeRunId,
  );
  return record ? { record } : {};
}
