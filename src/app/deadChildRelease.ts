/**
 * CR145: letting a finished Pi release the turn it completed.
 *
 * On 2026-10-11 a Pi child exited after producing its whole answer and its lease stayed `running`
 * for 45 minutes, because the native terminal path never ran. Every surface deferred to that lease:
 * admission refused `same_workspace_occupied`, CR132's exit declined `native_execution_active`,
 * CR116's repair route declined for the same reason, and CR143's mark read `WORKING`. All of them
 * were correct given a false premise. The Navigator's only exit was a restart.
 *
 * This module does not touch any of those refusals. It reads one new fact — what the operating
 * system says about the child, measured by the native side rather than guessed from elapsed time —
 * and offers the Navigator the house terminal path when, and only when, that fact is `exited`.
 * Once the lease is terminalized, the four surfaces above work exactly as designed.
 *
 * The offer is the Navigator's to take. The app measures; it does not decide.
 */
import type { JourneyWorkspace } from "./journeyWorkspaceKey";
import {
  isActivePiInvocationLease,
  selectWorkspaceNativeLease,
  type PiInvocationLeaseInspection,
  type PiInvocationOccupancyState,
} from "./piInvocationOccupancy";

export type DeadChildReleaseReason =
  | "occupancy_unknown"
  | "no_lease"
  | "lease_not_active"
  | "liveness_unmeasured"
  | "child_absent"
  | "child_running";

export type DeadChildRelease =
  | Readonly<{ offered: false; reason: DeadChildReleaseReason }>
  | Readonly<{ offered: true; entry: PiInvocationLeaseInspection }>;

/**
 * Offered only for the selected workspace's own active lease whose child the OS reports exited.
 * Every other state declines with its reason, and the reasons are deliberately many: a running
 * child, an unmeasured one, an older build that does not measure, and no handle at all are four
 * different silences, none of which is a licence.
 */
export function deriveDeadChildRelease(
  occupancy: PiInvocationOccupancyState,
  workspace: JourneyWorkspace,
): DeadChildRelease {
  if (occupancy.status !== "known") return { offered: false, reason: "occupancy_unknown" };
  const entry = selectWorkspaceNativeLease(occupancy, workspace);
  if (!entry) return { offered: false, reason: "no_lease" };
  if (!isActivePiInvocationLease(entry)) return { offered: false, reason: "lease_not_active" };
  switch (entry.childLiveness) {
    case "exited":
      return { offered: true, entry };
    case "running":
      return { offered: false, reason: "child_running" };
    case "absent":
      return { offered: false, reason: "child_absent" };
    case "unknown":
    case undefined:
      return { offered: false, reason: "liveness_unmeasured" };
  }
}

export interface DeadChildReleaseNotice {
  title: string;
  sentence: string;
  action: string;
}

export function describeDeadChildRelease(): DeadChildReleaseNotice {
  return {
    title: "This turn's process has already ended",
    sentence: "Pi finished for this conversation, but its turn was never released, so the conversation "
      + "still reads as working. Releasing it runs the same finish every turn runs. "
      + "Nothing still running elsewhere is touched, and nothing is deleted.",
    action: "Release this turn",
  };
}
