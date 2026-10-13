import type { ProjectedRuntimeOperation } from "./runtimeActivityModel";

type CompactionStatus = ProjectedRuntimeOperation["status"];

/**
 * How long a compaction outcome may stay on the Composer surface, named by what clears it:
 *
 * - `transient` — a timer.
 * - `until-next-turn` — the Navigator, or the next turn they send.
 * - `sticky` — the Navigator, or a later compaction. Never a timer and never a turn.
 *
 * `until-next-turn` is named after its discriminating trigger rather than by another adjective,
 * because the only way to misuse it is to mistake it for `sticky`.
 */
export type CompactionNoticeLifecycle = "transient" | "until-next-turn" | "sticky";

/**
 * What the Composer is reporting. `nothingToDo` is carried separately from the status because
 * a refusal did not compact anything: reporting it as `completed` would claim a chapter was
 * closed, and reporting it as a plain failure would alarm the Navigator about a non-problem.
 */
export type CompactionNoticeState = {
  status: CompactionStatus;
  nothingToDo?: true;
};

const ACTIVE_STATUSES: CompactionStatus[] = ["preparing", "running"];

/**
 * CR104 established that a failure is a statement still true afterwards — the context was not
 * compacted, and the pressure that motivated the request is now worse — so no timer and no
 * unrelated success may clear it. That half is unchanged.
 *
 * CR150 withdraws the other half. CR104 reasoned that a success "has done its job once read, so
 * it may fade", which is sound about confirmations and wrong about which kind of thing this is: a
 * compaction result is a *measurement of how much context was reclaimed*, which the Navigator
 * reads to decide what to do next. A confirmation can fade; a measurement the next decision
 * depends on cannot. A benign refusal reclaimed nothing, so it carries no measurement and really
 * is just a confirmation — it keeps the timer.
 */
export function compactionNoticeLifecycle({ status, nothingToDo }: CompactionNoticeState): CompactionNoticeLifecycle {
  if (nothingToDo) return "transient";
  return status === "completed" ? "until-next-turn" : "sticky";
}

/** Work still in flight is not dismissable: hiding it would hide the running agent. */
export function compactionNoticeIsDismissible(notice: CompactionNoticeState): boolean {
  return compactionNoticeLifecycle(notice) !== "transient" && !ACTIVE_STATUSES.includes(notice.status);
}

/**
 * Whether the notice should interrupt a screen reader rather than be announced politely.
 *
 * This was the same expression as `compactionNoticeIsDismissible` until CR150, and `CompactionNotice`
 * read that one predicate for both the dismiss control and the ARIA role. The two coincided only
 * because a failure was the sole dismissable outcome. They are different questions: an `alert` is
 * right for "the context was not compacted" and wrong for a result the Navigator asked to keep.
 */
export function compactionNoticeIsAssertive(notice: CompactionNoticeState): boolean {
  return compactionNoticeLifecycle(notice) === "sticky" && !ACTIVE_STATUSES.includes(notice.status);
}

/**
 * CR150: the Navigator's next turn dismisses a result they are done with — "até o usuário clicar em
 * fechar ou mandar novo turno".
 *
 * Journey-scoped, because a turn in a Journey the Navigator is not looking at must not discard a
 * measurement waiting in another one. And it consults the lifecycle rather than the status, so a
 * failure survives: a turn succeeding says nothing about context that was never compacted, which is
 * precisely what made CR104's original notice look stale while its statement still held.
 */
export function clearCompactionNoticeOnNewTurn<
  T extends { journeyId: string; operation: { status: CompactionStatus }; nothingToDo?: true },
>(current: T | undefined, journeyId: string): T | undefined {
  if (!current || current.journeyId !== journeyId) return current;
  const lifecycle = compactionNoticeLifecycle({ status: current.operation.status, nothingToDo: current.nothingToDo });
  return lifecycle === "until-next-turn" ? undefined : current;
}

/**
 * The prefix our own native parser puts on an unsuccessful `compact` response, pinned on the
 * Rust side by `parse_pi_compaction_response`'s test. Matching it recognises *that Pi answered
 * a refusal* rather than that the process died; it is deliberately not a match on the reason
 * Pi worded, which would break the moment Pi rephrases it.
 */
const PI_REFUSAL_PREFIX = "Pi refused to compact:";

export type CompactionRefusalClass = "nothing_to_do" | "failed";

/**
 * CR104: both of Pi's refusals mean there was nothing to compact, not that compaction broke.
 * The class is decided by the Desktop's own structural reading of the branch, so a refusal is
 * benign only when we can confirm the same condition Pi used. A dead process stays a failure
 * even on an already compacted branch, because something really did break.
 */
export function classifyCompactionRefusal(
  message: string,
  leafIsCompaction: boolean | undefined,
): CompactionRefusalClass {
  return leafIsCompaction === true && message.startsWith(PI_REFUSAL_PREFIX) ? "nothing_to_do" : "failed";
}
