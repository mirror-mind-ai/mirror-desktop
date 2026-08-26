import type { NautilusJourneyThreadReadiness, NautilusThreadReasonCode } from "../domain/nautilusJourneyThread";

export type JourneyThreadDisplayState = NautilusJourneyThreadReadiness | { kind: "loading" };

type Props = { journeyName: string; state: Exclude<JourneyThreadDisplayState, { kind: "ready" }> };

export function JourneyThreadState({ journeyName, state }: Props) {
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
  return (
    <section className="journey-thread-state" role="status">
      <p className="eyebrow">Nautilus conversation</p>
      <h2>This Journey has not started in Nautilus</h2>
      <p>{journeyName} does not yet have a dedicated Nautilus conversation. Starting it will become available in the next delivery.</p>
      {state.legacyStatePresent ? <small>Existing conversations remain preserved as legacy history and will not be adopted automatically.</small> : null}
    </section>
  );
}

function reasonLabel(reasons: NautilusThreadReasonCode[]) {
  return `Recovery reason: ${reasons.join(", ")}`;
}
