/**
 * CR149: the clock that decides CR132's offer, kept where its output is drawn.
 *
 * CR132 put the clock in the App root, because a Journey that is doing nothing would otherwise
 * never cross the threshold on screen. That is true and the placement was the cost: the root
 * advanced state once per second so that one span of text could count the wait, which re-rendered
 * the whole application — including the Composer the Navigator was typing into.
 *
 * Only the counter needs a per-second value. `offered` changes exactly once, when the threshold is
 * crossed, and the act's own guard is evaluated when the act runs rather than when the tree
 * renders. So the clock belongs here, in the component that draws the seconds, which is the same
 * place `ComposerRuntimeStatus` keeps its own.
 *
 * The decision itself is not reimplemented. `settlementAbandonmentOffer` stays the single authority
 * on whether the exit may be offered, including the refusal while native execution is active — this
 * component only supplies it with a clock and renders what it returns.
 */
import { useEffect, useState } from "react";
import { settlementAbandonmentOffer } from "./settlementAbandonment";
import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

export const ABANDON_SETTLEMENT_CLOCK_TICK_MS = 1_000;

type SettlementAbandonmentNoticeProps = {
  ownerPhase: JourneyRuntimeOwnerPhase | undefined;
  /** `hasActiveNativeExecution` for the selected workspace. */
  nativeExecutionActive: boolean;
  occupancyKnown: boolean;
  finishingSince?: number;
  onStopWaiting: () => void;
  /** Test seam; the component keeps its own clock otherwise. */
  now?: number;
};

export function SettlementAbandonmentNotice({
  ownerPhase,
  nativeExecutionActive,
  occupancyKnown,
  finishingSince,
  onStopWaiting,
  now,
}: SettlementAbandonmentNoticeProps) {
  const [tick, setTick] = useState(() => Date.now());
  // The clock runs only while a wait could still cross the threshold, and never when a test has
  // supplied its own `now`. A Journey that is not finalizing does not need a running clock to be
  // told it has no offer.
  const watching = ownerPhase === "finalizing" && now === undefined;
  useEffect(() => {
    if (!watching) return undefined;
    setTick(Date.now());
    const handle = setInterval(() => setTick(Date.now()), ABANDON_SETTLEMENT_CLOCK_TICK_MS);
    return () => clearInterval(handle);
  }, [watching]);

  const offer = settlementAbandonmentOffer({
    ownerPhase,
    nativeExecutionActive,
    occupancyKnown,
    finishingSince,
    now: now ?? tick,
  });
  if (!offer.offered) return null;

  return (
    <section className="dedicated-turn-notice" role="status" aria-label="Finishing is taking unusually long">
      <strong>Still finishing after {Math.round(offer.waitedMs / 1000)}s</strong>
      <p>
        Your answer is saved. You can stop waiting and send a new message — anything still
        owed to Mirror is completed in the background.
      </p>
      <button type="button" onClick={onStopWaiting}>Stop waiting</button>
    </section>
  );
}
