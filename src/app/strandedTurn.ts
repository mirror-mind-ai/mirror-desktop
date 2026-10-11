import type { TurnJournalRecord } from "./turnJournal";

/**
 * CR142: the renderer believes a turn is still streaming and the turn journal says it finished.
 *
 * The journal is durable and already correct. What was missing is any way for the renderer to ask
 * it, because every path that would notice is downstream of the `done` event that went missing:
 * `reconcilePiInvocationOccupancy` runs on mount, inside the rehydrate handler on `done`, and
 * twice inside the send and settlement paths. With the event lost, the renderer's view of the
 * world freezes and nothing ever looks again. One observed instance sat that way for seventy
 * minutes with no file written in the final forty.
 *
 * The mechanism of the loss is **not established** and this predicate deliberately does not depend
 * on it. Two candidates remain and both are silent by construction: a `deliver` rejection into an
 * in-memory quarantine a release build cannot read, and a dropped fire-and-forget `app.emit`.
 */
export type StrandedTurnReason =
  /** The renderer is not claiming a live turn. CR115's idle loop cannot reopen through here. */
  | "not_streaming"
  /** Streaming, but with no live run authority to compare the journal against. */
  | "no_believed_run"
  /** The journal has no record for the run the renderer believes is live. */
  | "no_record"
  /** The journal agrees the run is still going. The ordinary case, and a long turn's case. */
  | "journal_agrees"
  /** The journal has just turned terminal and settlement may still be in flight. */
  | "settling";

export type StrandedTurn =
  | { readonly stranded: true; readonly record: TurnJournalRecord }
  | { readonly stranded: false; readonly reason: StrandedTurnReason };

/**
 * Derived from measurement rather than chosen: settlement took 1.6 s, 1.9 s, 2.2 s, 2.5 s, 2.7 s,
 * 2.9 s and 3.0 s across the runs recorded on 2026-10-10 and 2026-10-11. Ten seconds is more than
 * three times the slowest observed, and far below anything a Navigator would experience as waiting.
 *
 * This is **not** CR132's threshold, and the difference matters. CR132's sixty seconds encodes a
 * judgement — *this wait has gone on too long* — because nothing durable could settle the question.
 * This one encodes a fact: *this is not an in-flight transition*. The native side writes
 * `terminal_durable` and then emits `done`, so there is a legitimate window in which both the
 * journal is terminal and the renderer is streaming. Without this grace the predicate would call
 * that window a defect.
 *
 * Falsifier: a settlement observed taking longer than ten seconds while healthy. Raise it, and
 * record the measurement that forced the change.
 */
export const STRANDED_SETTLEMENT_GRACE_MS = 10_000;

/**
 * How often the renderer re-reads the journal **while it believes a turn is streaming**, and never
 * otherwise. Nothing is derived from this number's exactness: it only bounds how long a Navigator
 * can sit in front of a surface that is wrong. Fifteen seconds is short enough that the wrong
 * state is brief and long enough that the read costs nothing next to a turn measured in tens of
 * seconds. CR115's loop ran continuously and reconciled occupancy on every pass; this reads one
 * file and touches no occupancy at all.
 */
export const STRANDED_TURN_POLL_MS = 15_000;

/** The phases that mean the native turn is over, whatever the renderer still believes. */
const TERMINAL_PHASES: ReadonlySet<string> = new Set([
  "terminal_durable",
  "projected",
  "outbox_enqueued",
  "settled",
  "interrupted",
]);

export type BelievedRun = {
  readonly journeyId: string;
  readonly threadId: string;
  readonly generation: number;
  readonly runId: string;
};

/**
 * Total by construction: every path returns either `stranded: true` or a named reason, so a state
 * this does not yet consider becomes a visible reason rather than a silent `false`.
 */
export function deriveStrandedTurn(input: {
  readonly journalRecords: readonly TurnJournalRecord[];
  readonly believedRun?: BelievedRun;
  readonly believedStreaming: boolean;
  readonly now: number;
}): StrandedTurn {
  // The gate that keeps CR115's idle post-terminal loop closed: an idle Journey has no streaming
  // turn, so nothing here can fire while nothing is believed to be running.
  if (!input.believedStreaming) return { stranded: false, reason: "not_streaming" };
  const run = input.believedRun;
  if (!run) return { stranded: false, reason: "no_believed_run" };

  const record = [...input.journalRecords].reverse().find((candidate) => (
    candidate.authority.journeyId === run.journeyId
    && candidate.authority.threadId === run.threadId
    && candidate.authority.generation === run.generation
    && candidate.authority.runId === run.runId
  ));
  if (!record) return { stranded: false, reason: "no_record" };
  if (!TERMINAL_PHASES.has(record.phase)) return { stranded: false, reason: "journal_agrees" };

  const settledFor = input.now - Date.parse(record.updatedAt);
  // A record whose timestamp cannot be read is treated as in flight rather than as stranded:
  // raising a notice on an unparseable date would be claiming more than is known.
  if (!Number.isFinite(settledFor) || settledFor < STRANDED_SETTLEMENT_GRACE_MS) {
    return { stranded: false, reason: "settling" };
  }
  return { stranded: true, record };
}

/**
 * What the surface says. The turn is not lost and the sentence must not imply that it is — the one
 * observed instance recovered intact on the next launch, and the answer was durable the whole time.
 */
export function describeStrandedTurn(record: TurnJournalRecord): { title: string; sentence: string } {
  const finished = record.terminalOutcome === "completed"
    ? "The agent finished this turn and the answer is saved"
    : "The agent stopped this turn and the record is saved";
  return {
    title: "This turn has already finished",
    sentence: `${finished}, but this conversation never received it. Nothing is lost. Recovering brings the answer back into the conversation.`,
  };
}
