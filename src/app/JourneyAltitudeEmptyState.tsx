import type { JourneyAltitude } from "./journeyAltitudePreview";

type EmptyAltitude = Exclude<JourneyAltitude, "operational">;

type JourneyAltitudeEmptyStateProps = {
  altitude: EmptyAltitude;
  journeyName: string;
};

const emptyStateCopy = {
  tactical: {
    label: "Tactical",
    title: "No tactical reading yet",
    detail: (journeyName: string) =>
      `No mission, evidence, or deliverables have been derived for ${journeyName}.`,
  },
  strategic: {
    label: "Strategic",
    title: "No strategic reading yet",
    detail: (journeyName: string) =>
      `No realizations, impacts, or value readings have been derived for ${journeyName}.`,
  },
} as const;

export function JourneyAltitudeEmptyState({
  altitude,
  journeyName,
}: JourneyAltitudeEmptyStateProps) {
  const copy = emptyStateCopy[altitude];

  return (
    <section
      id={`journey-altitude-${altitude}-panel`}
      className={`journey-altitude-empty-state altitude-${altitude}`}
      role="tabpanel"
      aria-label={`${copy.label} workspace`}
    >
      <span className="journey-altitude-empty-icon" aria-hidden="true">
        {altitude === "tactical" ? "◇" : "✦"}
      </span>
      <p className="eyebrow">{copy.label}</p>
      <h2>{copy.title}</h2>
      <p>{copy.detail(journeyName)}</p>
    </section>
  );
}
