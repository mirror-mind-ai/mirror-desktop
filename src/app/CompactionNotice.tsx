import { compactionNoticeIsDismissible } from "./compactionNoticeLifecycle";
import { RuntimeCompaction } from "./LiveRuntimeActivity";
import type { ProjectedRuntimeOperation } from "./runtimeActivityModel";

/**
 * CR104: the Composer's own surface for a compaction the Navigator triggered. Dismissal
 * belongs here rather than in `RuntimeCompaction`, which also renders inside agent activity
 * and reconstructed turns where there is no notice to close.
 */
export function CompactionNotice({
  operation,
  onDismiss,
}: {
  operation: ProjectedRuntimeOperation;
  onDismiss: () => void;
}) {
  const dismissible = compactionNoticeIsDismissible(operation.status);

  return (
    <div className="compaction-notice" role={operation.status === "failed" ? "alert" : "status"}>
      <RuntimeCompaction operation={operation} />
      {dismissible ? (
        <button
          type="button"
          className="secondary-button compaction-notice-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss the compaction notice"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
