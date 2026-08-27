import type { NautilusJourneyThreadReadiness, NautilusThreadReasonCode } from "../domain/nautilusJourneyThread";

export type JourneyThreadDisplayState = NautilusJourneyThreadReadiness | { kind: "loading" };

type Props = {
  journeyName: string;
  state: Exclude<JourneyThreadDisplayState, { kind: "ready" }>;
  starting?: boolean;
  startingPhase?: string;
  error?: string;
  onStart?: () => void;
};

export function JourneyThreadState({ journeyName, state, starting = false, startingPhase, error, onStart }: Props) {
  if (state.kind === "loading") {
    return <section className="journey-thread-state" role="status"><p className="eyebrow">Nautilus conversation</p><h2>Checking Journey conversation…</h2></section>;
  }
  if (state.kind === "inconsistent") {
    return (
      <section className="journey-thread-state" role="alert">
        <p className="eyebrow">Nautilus conversation</p>
        <h2>This Journey conversation needs recovery</h2>
        <p>Nautilus found incomplete or contradictory dedicated-thread authority for {journeyName}. Conversation remains unavailable and no repair will run automatically.</p>
        <small>{reasonLabel(state.reasonCodes)}</small>
      </section>
    );
  }
  if (starting) {
    return (
      <section className="journey-thread-state" role="status" aria-live="polite">
        <p className="eyebrow">Starting {journeyName}</p>
        <h2>{provisioningPhaseLabel(startingPhase)}</h2>
        <p>Preparing one dedicated native pair for this Journey. No model is being invoked.</p>
        <div className="journey-thread-progress" aria-hidden="true"><span /></div>
      </section>
    );
  }
  return (
    <section className="journey-thread-state" role="status">
      <p className="eyebrow">Nautilus conversation</p>
      <h2>This Journey has not started in Nautilus</h2>
      <p>{journeyName} does not yet have a dedicated Nautilus conversation.</p>
      {error ? <p className="journey-thread-error">Start did not complete: {error}</p> : null}
      {onStart ? <button type="button" className="journey-thread-start" onClick={onStart}>{error ? "Retry starting this Journey" : "Start this Journey"}</button> : null}
    </section>
  );
}

function provisioningPhaseLabel(phase?: string) {
  switch (phase) {
    case "reserving_operation": return "Reserving dedicated generation…";
    case "creating_pi_session": return "Creating native Pi session…";
    case "creating_mirror_conversation": return "Creating Mirror conversation…";
    case "activating_journey_context": return "Activating Journey context…";
    case "verifying_authority": return "Verifying dedicated authority…";
    case "publishing_ready_thread": return "Opening situated conversation…";
    default: return "Creating dedicated conversation…";
  }
}

function reasonLabel(reasons: NautilusThreadReasonCode[]) {
  return `Recovery reason: ${reasons.join(", ")}`;
}
