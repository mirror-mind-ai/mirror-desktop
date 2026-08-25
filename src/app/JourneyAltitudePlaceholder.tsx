import type { JourneyAltitude } from "./journeyAltitudePreview";

type PendingJourneyAltitude = Exclude<JourneyAltitude, "operational">;

type JourneyAltitudePlaceholderProps = {
  altitude: PendingJourneyAltitude;
};

const placeholderCopy: Record<PendingJourneyAltitude, { label: string; story: string; description: string }> = {
  tactical: {
    label: "Tactical",
    story: "US-2",
    description: "This distance will take shape after the Operational workspace is felt and accepted.",
  },
  strategic: {
    label: "Strategic",
    story: "US-3",
    description: "This wider distance will take shape after the Tactical composition is understood.",
  },
};

export function JourneyAltitudePlaceholder({ altitude }: JourneyAltitudePlaceholderProps) {
  const copy = placeholderCopy[altitude];

  return (
    <section
      id={`journey-altitude-${altitude}-panel`}
      className={`journey-altitude-placeholder altitude-${altitude}`}
      role="tabpanel"
      aria-label={`${copy.label} altitude preview`}
    >
      <span className="preview-badge">GUI experiment</span>
      <p className="eyebrow">{copy.label} altitude</p>
      <h2>Another distance over the same Journey</h2>
      <p>{copy.description}</p>
      <small>Visual composition planned for {copy.story}.</small>
    </section>
  );
}
