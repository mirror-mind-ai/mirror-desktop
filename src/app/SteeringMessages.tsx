import type { SteeringEvidence } from "../domain/journeyConversation";

const labels: Record<SteeringEvidence["status"], string> = {
  pending: "Sending correction",
  accepted: "Correction queued",
  applied: "Correction applied",
  rejected: "Correction rejected",
  terminally_unconsumed: "Correction not applied",
};

export function SteeringMessages({ evidence }: { evidence: SteeringEvidence[] }) {
  if (!evidence.length) return null;
  return (
    <section className="steering-messages user-addenda" aria-label="Corrections sent during response">
      {evidence.map((item) => (
        <article className={`steering-message is-${item.status}`} key={item.requestId}>
          <header>
            <strong><span aria-hidden="true">↳</span> Correction during response</strong>
            <span role="status">{labels[item.status]}</span>
          </header>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
  );
}
