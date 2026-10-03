import type { SteeringEvidence } from "../domain/journeyConversation";

/**
 * CR117: these say what the evidence establishes and no more. `delivered` means the correction
 * reached the model's input, which is what Pi's queue departure proves — not that the model read
 * or followed it, which nothing here can observe.
 */
const labels: Record<SteeringEvidence["status"], string> = {
  pending: "Sending correction",
  accepted: "Correction queued",
  delivered: "Correction reached the agent",
  applied: "Correction applied",
  rejected: "Correction rejected",
  terminally_unconsumed: "Correction not applied",
};

const marks: Partial<Record<SteeringEvidence["status"], string>> = {
  delivered: "✓",
  applied: "✓✓",
};

export function SteeringMessages({ evidence }: { evidence: SteeringEvidence[] }) {
  if (!evidence.length) return null;
  return (
    <section className="steering-messages user-addenda" aria-label="Corrections sent during response">
      {evidence.map((item) => (
        <article className={`steering-message is-${item.status}`} key={item.requestId}>
          <header>
            <strong><span aria-hidden="true">↳</span> Correction during response</strong>
            <span role="status">
              {marks[item.status] ? (
                <span className="steering-mark" aria-hidden="true">{marks[item.status]}</span>
              ) : null}
              {labels[item.status]}
            </span>
          </header>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
  );
}
