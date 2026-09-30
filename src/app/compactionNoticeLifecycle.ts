import type { ProjectedRuntimeOperation } from "./runtimeActivityModel";

type CompactionStatus = ProjectedRuntimeOperation["status"];

/** How long a compaction outcome may stay on the Composer surface. */
export type CompactionNoticeLifecycle = "transient" | "sticky";

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
 * CR104: a success and a benign refusal are both confirmations and have done their job once
 * read, so they may fade. A failure is a statement that is still true afterwards — the
 * context was not compacted, and the pressure that motivated the request is now worse — so
 * no timer and no unrelated success may clear it. Only the Navigator or a later compaction may.
 */
export function compactionNoticeLifecycle({ status, nothingToDo }: CompactionNoticeState): CompactionNoticeLifecycle {
  return nothingToDo || status === "completed" ? "transient" : "sticky";
}

/** Work still in flight is not dismissable: hiding it would hide the running agent. */
export function compactionNoticeIsDismissible(notice: CompactionNoticeState): boolean {
  return compactionNoticeLifecycle(notice) === "sticky" && !ACTIVE_STATUSES.includes(notice.status);
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
