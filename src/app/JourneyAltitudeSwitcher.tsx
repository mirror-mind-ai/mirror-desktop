import {
  journeyAltitudeDescriptors,
  type JourneyAltitude,
} from "./journeyAltitudePreview";
import {
  isJourneyAltitudeAvailable,
  shouldShowJourneyAltitudeSwitcher,
} from "./journeySurfaceAvailability";

type JourneyAltitudeSwitcherProps = {
  value: JourneyAltitude;
  onChange: (altitude: JourneyAltitude) => void;
  disabled?: boolean;
};

const altitudeIcons = {
  operational: "◎",
  tactical: "◇",
  strategic: "✦",
} as const satisfies Record<JourneyAltitude, string>;

export function JourneyAltitudeSwitcher({ value, onChange, disabled = false }: JourneyAltitudeSwitcherProps) {
  if (!shouldShowJourneyAltitudeSwitcher()) return null;
  const selectedValue = isJourneyAltitudeAvailable(value) ? value : "operational";
  return (
    <div className="journey-altitude-switcher" role="tablist" aria-label="Journey altitude">
      {journeyAltitudeDescriptors.filter(({ id }) => isJourneyAltitudeAvailable(id)).map((altitude) => {
        const selected = altitude.id === selectedValue;

        return (
          <button
            key={altitude.id}
            className={`journey-altitude-option ${selected ? "selected" : ""}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={disabled}
            aria-controls={`journey-altitude-${altitude.id}-panel`}
            disabled={disabled}
            tabIndex={selected ? 0 : -1}
            data-altitude={altitude.id}
            onClick={() => onChange(altitude.id)}
          >
            <span
              className="selector-option-icon"
              data-icon={altitude.id}
              aria-hidden="true"
            >
              {altitudeIcons[altitude.id]}
            </span>
            <span>{altitude.label}</span>
          </button>
        );
      })}
    </div>
  );
}
