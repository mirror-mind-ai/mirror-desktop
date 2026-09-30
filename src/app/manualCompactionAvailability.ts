export type ManualCompactionConditions = {
  canSend: boolean;
  safeTestMode: boolean;
  /** Undefined while no inspection has reported the branch state. */
  leafIsCompaction?: boolean;
};

export type ManualCompactionAvailability = {
  canCompact: boolean;
  unavailableReason?: string;
};

/**
 * CR104: Pi refuses a manual compaction when the branch already ends in a compaction entry,
 * and it does so before calling any model. That condition is structural, so the menu can
 * explain it up front instead of spending a refusal the Navigator then has to read.
 *
 * Ordered by how blocking each reason is. An unknown branch state never forbids the action:
 * letting Pi refuse costs a moment, while wrongly forbidding removes a working action.
 */
export function manualCompactionAvailability({
  canSend,
  safeTestMode,
  leafIsCompaction,
}: ManualCompactionConditions): ManualCompactionAvailability {
  if (safeTestMode) {
    return { canCompact: false, unavailableReason: "Compaction is unavailable in safe test mode." };
  }
  if (!canSend) {
    return { canCompact: false, unavailableReason: "Available once the conversation is idle and ready to send." };
  }
  if (leafIsCompaction === true) {
    return { canCompact: false, unavailableReason: "Already compacted. There is nothing new to close into a chapter." };
  }
  return { canCompact: true };
}
