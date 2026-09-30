import type { ProjectedRuntimeOperation } from "./runtimeActivityModel";

type CompactionStatus = ProjectedRuntimeOperation["status"];

/** How long a compaction outcome may stay on the Composer surface. */
export type CompactionNoticeLifecycle = "transient" | "sticky";

const ACTIVE_STATUSES: CompactionStatus[] = ["preparing", "running"];

/**
 * CR104: a success is a confirmation and has done its job once it has been read, so it may
 * fade. A failure is a statement that is still true afterwards — the context was not
 * compacted — so no timer and no unrelated success may clear it. Only the Navigator or a
 * later compaction may.
 */
export function compactionNoticeLifecycle(status: CompactionStatus): CompactionNoticeLifecycle {
  return status === "completed" ? "transient" : "sticky";
}

/** Work still in flight is not dismissable: hiding it would hide the running agent. */
export function compactionNoticeIsDismissible(status: CompactionStatus): boolean {
  return compactionNoticeLifecycle(status) === "sticky" && !ACTIVE_STATUSES.includes(status);
}
