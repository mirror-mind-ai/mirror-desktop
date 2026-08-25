import type { JourneyAltitude } from "./journeyAltitudePreview";

type PendingJourneyAltitude = Exclude<JourneyAltitude, "operational">;

type JourneyAltitudePlaceholderProps = {
  altitude: PendingJourneyAltitude;
};

const placeholderCopy: Record<PendingJourneyAltitude, { label: string; story: string; description: string }> = {
  tactical: {
    label: "Tactical",
    story: "US-2",
    description: "This durable tactical workspace awaits its mission, evidence, and deliverable composition.",
  },
  strategic: {
    label: "Strategic",
    story: "US-3",
    description: "This durable strategic workspace awaits its realization, impact, and value composition.",
  },
};

export function JourneyAltitudePlaceholder({ altitude }: JourneyAltitudePlaceholderProps) {
  const copy = placeholderCopy[altitude];

  return (
    <section
      id={`journey-altitude-${altitude}-panel`}
      className={`journey-altitude-placeholder altitude-${altitude}`}
      role="tabpanel"
      aria-label={`${copy.label} workspace shell`}
    >
      <span className="preview-badge">Foundation shell</span>
      <p className="eyebrow">{copy.label} altitude</p>
      <h2>Another distance over the same Journey</h2>
      <p>{copy.description}</p>
      <small>Visual composition planned for {copy.story}.</small>
    </section>
  );
}
