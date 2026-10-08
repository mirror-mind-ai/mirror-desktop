/**
 * CR132: ending a `Finishing` that will not end.
 *
 * `Finishing` is displayed exactly when the run is neither running nor streaming, and
 * `cancelVisible` requires the run to be running, so the label and a visible Cancel are mutually
 * exclusive by construction — while `sendBlocked` is true for the same state. The Navigator is
 * locked out in both directions and the only exit was restarting the app.
 *
 * The exit this module gates is deliberately small. It does not cancel a run: by the time
 * `Finishing` shows, the run has terminalized, `cancelExactJourneyRun` would throw, and the child
 * process the native command kills no longer exists. It does not repair durable state either.
 * What it ends is the *wait* — the renderer's `isFinalizingTurn` flag, which only the settlement
 * block's `finally` clears, and which therefore stays set forever when the settlement's `await`
 * never returns.
 *
 * The offer is withheld while native execution is active, and that is the load-bearing condition.
 * `derivePiInvocationAdmission` and `hasActiveNativeExecution` share one predicate,
 * `isActivePiInvocationLease`, so an active lease means both that the composer is blocked by
 * occupancy and that CR115's and CR116's repair route must refuse. Offering an exit there would
 * either do nothing or require releasing a lease while Pi may really be executing. Withholding it
 * keeps this act confined to the state where the flag is stale by construction and the repair
 * route is already free to converge.
 */
import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

/**
 * Derived rather than chosen. CR119 names the settlement phase after 3 s, which is the right delay
 * for a label and the wrong one for an exit: this Journey's median settlement is 4,976 ms, so a
 * control offered then would sit in front of every healthy turn. The longest settlement ever
 * recorded here is 41,741 ms, and this waits past it with margin.
 *
 * Falsifiable on purpose. If a legitimate settlement is ever recorded above this, the constant
 * moves and the record says why.
 */
export const ABANDON_SETTLEMENT_OFFER_AFTER_MS = 60_000;

export type SettlementAbandonmentOffer =
  | Readonly<{
    offered: false;
    reason: "not_finishing" | "occupancy_unknown" | "native_execution_active" | "too_soon";
  }>
  | Readonly<{ offered: true; waitedMs: number }>;

export function settlementAbandonmentOffer(input: {
  ownerPhase: JourneyRuntimeOwnerPhase | undefined;
  /** `hasActiveNativeExecution` for this Journey. */
  nativeExecutionActive: boolean;
  occupancyKnown: boolean;
  /** When this turn's finalization began, as the finishing-phase presentation records it. */
  finishingSince?: number;
  now: number;
  thresholdMs?: number;
}): SettlementAbandonmentOffer {
  if (input.ownerPhase !== "finalizing") return { offered: false, reason: "not_finishing" };
  // Unknown occupancy is not an absent lease. CR107 already refuses admission on it; so does this.
  if (!input.occupancyKnown) return { offered: false, reason: "occupancy_unknown" };
  if (input.nativeExecutionActive) return { offered: false, reason: "native_execution_active" };
  const threshold = input.thresholdMs ?? ABANDON_SETTLEMENT_OFFER_AFTER_MS;
  if (input.finishingSince === undefined) return { offered: false, reason: "too_soon" };
  const waitedMs = input.now - input.finishingSince;
  return waitedMs > threshold ? { offered: true, waitedMs } : { offered: false, reason: "too_soon" };
}
