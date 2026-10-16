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

/**
 * CR160: the branch leaf of the Pi session, read from the file's tail by `inspect_pi_session_leaf`.
 * The last entry is the leaf by construction, so this needs no branch projection.
 */
export type PiSessionLeaf = {
  readonly entryId: string | null;
  readonly entryType: string;
  readonly role: string | null;
  readonly stopReason: string | null;
  readonly timestamp: string | null;
};

/**
 * Two ways a turn can be stranded, which need two sentences and share one exit.
 *
 * `journal_terminal` is CR142's: the journal finished and the renderer never heard. `journal_never_heard`
 * is CR160's, one step earlier: the agent finished and the **journal** never heard — the record froze at
 * `running` while the session holds the answer. Both are recovered by the same route, because
 * `attribute_stale_pi_record` now attributes the frozen record to its own request.
 */
export type StrandedShape = "journal_terminal" | "journal_never_heard";

export type StrandedTurn =
  | { readonly stranded: true; readonly record: TurnJournalRecord; readonly shape: StrandedShape }
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
  /** CR160: supplied only while the journal says the newest turn is still running. */
  readonly piLeaf?: PiSessionLeaf | null;
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
  if (!TERMINAL_PHASES.has(record.phase)) {
    // CR160: using the journal alone, a frozen `running` is indistinguishable from a long turn —
    // this is exactly the case the comment on `journal_agrees` calls "a long turn's case". The
    // session leaf is the durable fact that tells them apart: a long turn's leaf is a tool call, a
    // user entry or a streaming assistant; a finished turn's leaf is an assistant `stop | length`
    // timestamped after this record was admitted. The same grace applies, because the native side
    // writes `terminal_durable` within milliseconds of that leaf when it is healthy.
    const finishedAt = terminalLeafAfterAdmission(input.piLeaf, record);
    if (finishedAt === undefined) return { stranded: false, reason: "journal_agrees" };
    const finishedFor = input.now - finishedAt;
    if (!Number.isFinite(finishedFor) || finishedFor < STRANDED_SETTLEMENT_GRACE_MS) {
      return { stranded: false, reason: "settling" };
    }
    return { stranded: true, record, shape: "journal_never_heard" };
  }

  const settledFor = input.now - Date.parse(record.updatedAt);
  // A record whose timestamp cannot be read is treated as in flight rather than as stranded:
  // raising a notice on an unparseable date would be claiming more than is known.
  if (!Number.isFinite(settledFor) || settledFor < STRANDED_SETTLEMENT_GRACE_MS) {
    return { stranded: false, reason: "settling" };
  }
  return { stranded: true, record, shape: "journal_terminal" };
}

/** The leaf's commit time when it is a terminal assistant entry admitted-after this record; else nothing. */
function terminalLeafAfterAdmission(leaf: PiSessionLeaf | null | undefined, record: TurnJournalRecord): number | undefined {
  if (!leaf || leaf.entryType !== "message" || leaf.role !== "assistant") return undefined;
  if (leaf.stopReason !== "stop" && leaf.stopReason !== "length") return undefined;
  if (!leaf.timestamp) return undefined;
  const finishedAt = Date.parse(leaf.timestamp);
  const admittedAt = Date.parse(record.createdAt);
  if (!Number.isFinite(finishedAt) || !Number.isFinite(admittedAt)) return undefined;
  // The previous turn's answer is also a terminal leaf; only one committed after this admission counts.
  return finishedAt >= admittedAt ? finishedAt : undefined;
}

/** The newest record for one thread, so the poll can ask whether the journal still says running. */
export function newestJournalRecordForThread(
  records: readonly TurnJournalRecord[],
  threadId: string,
): TurnJournalRecord | undefined {
  let newest: TurnJournalRecord | undefined;
  for (const candidate of records) {
    if (candidate.authority.threadId !== threadId) continue;
    if (!newest || candidate.createdAt > newest.createdAt) newest = candidate;
  }
  return newest;
}

/**
 * What the surface says. The turn is not lost and the sentence must not imply that it is — the one
 * observed instance recovered intact on the next launch, and the answer was durable the whole time.
 */
export function describeStrandedTurn(
  record: TurnJournalRecord,
  shape: StrandedShape = "journal_terminal",
): { title: string; sentence: string } {
  if (shape === "journal_never_heard") {
    // CR160: the answer is in the agent's session; the turn's own record is what never heard it end.
    return {
      title: "This turn has already finished",
      sentence: "The agent finished this turn and the answer is in its session, but the turn's own record never heard it end, so this conversation never received it. Nothing is lost. Recovering brings the answer back into the conversation.",
    };
  }
  const finished = record.terminalOutcome === "completed"
    ? "The agent finished this turn and the answer is saved"
    : "The agent stopped this turn and the record is saved";
  return {
    title: "This turn has already finished",
    sentence: `${finished}, but this conversation never received it. Nothing is lost. Recovering brings the answer back into the conversation.`,
  };
}
