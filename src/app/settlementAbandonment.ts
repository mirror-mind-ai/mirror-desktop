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

/**
 * CR155: the refusal union as a runtime list, so a guard can iterate what exists rather than what
 * its author remembered. A refusal added here without a decision in `settlementAbandonmentPresentation`
 * fails the allow-list test until it is either named or deliberately listed as silent.
 */
export const SETTLEMENT_ABANDONMENT_REFUSALS = [
  "not_finishing",
  "occupancy_unknown",
  "native_execution_active",
  "too_soon",
] as const;
export type SettlementAbandonmentRefusal = (typeof SETTLEMENT_ABANDONMENT_REFUSALS)[number];

export type SettlementAbandonmentOffer =
  | Readonly<{
    offered: false;
    reason: SettlementAbandonmentRefusal;
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

/**
 * CR155 slice 1 (RS025 Batch A): what the surface draws, derived from the offer rather than
 * re-deciding it. `settlementAbandonmentOffer` stays the single authority on whether an exit may be
 * offered; this only decides whether a refusal is *said*.
 *
 * Field, 2026-10-16, production alpha.50: a turn's journal froze at `running`, occupancy was never
 * released, and the Navigator sat in front of "Finishing" for minutes. The offer refused as
 * `native_execution_active` — correctly — and the component drew that refusal as nothing. Every
 * layer was right and the Navigator had no sentence and no exit but quitting the app.
 *
 * The naming waits exactly as long as the offer would have. A healthy turn finalizes with its native
 * lease briefly still active, and a sentence there would sit in front of every ordinary turn — the
 * negative case RS025 requires of every change in the theme.
 */
export type SettlementAbandonmentPresentation =
  | Readonly<{ kind: "offer"; waitedMs: number }>
  | Readonly<{
    kind: "refusal_named";
    reason: "occupancy_unknown" | "native_execution_active";
    waitedMs: number;
    sentence: string;
  }>
  | Readonly<{ kind: "silent"; reason: SettlementAbandonmentRefusal }>;

const NAMED_REFUSAL_SENTENCES: Readonly<Record<"occupancy_unknown" | "native_execution_active", string>> = {
  native_execution_active:
    "The application still records the agent as executing, so stopping the wait is not offered: "
    + "that would abandon a turn that may be running. Anything the agent already produced is kept in its session.",
  occupancy_unknown:
    "The application cannot tell whether the agent is still executing, so stopping the wait is not offered. "
    + "Anything the agent already produced is kept in its session.",
};

export function settlementAbandonmentPresentation(
  input: Parameters<typeof settlementAbandonmentOffer>[0],
): SettlementAbandonmentPresentation {
  const offer = settlementAbandonmentOffer(input);
  if (offer.offered) return { kind: "offer", waitedMs: offer.waitedMs };
  if (offer.reason !== "native_execution_active" && offer.reason !== "occupancy_unknown") {
    return { kind: "silent", reason: offer.reason };
  }
  // No known start means no honest count of the wait, so nothing is said yet.
  if (input.finishingSince === undefined) return { kind: "silent", reason: offer.reason };
  const waitedMs = input.now - input.finishingSince;
  const threshold = input.thresholdMs ?? ABANDON_SETTLEMENT_OFFER_AFTER_MS;
  if (!(waitedMs > threshold)) return { kind: "silent", reason: offer.reason };
  return { kind: "refusal_named", reason: offer.reason, waitedMs, sentence: NAMED_REFUSAL_SENTENCES[offer.reason] };
}
