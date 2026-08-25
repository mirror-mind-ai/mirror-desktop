import {
  journeyAltitudeDescriptors,
  type JourneyAltitude,
} from "./journeyAltitudePreview";

type JourneyAltitudeSwitcherProps = {
  value: JourneyAltitude;
  onChange: (altitude: JourneyAltitude) => void;
};

export function JourneyAltitudeSwitcher({ value, onChange }: JourneyAltitudeSwitcherProps) {
  return (
    <div className="journey-altitude-switcher" role="tablist" aria-label="Journey altitude">
      {journeyAltitudeDescriptors.map((altitude) => {
        const selected = altitude.id === value;

        return (
          <button
            key={altitude.id}
            className={`journey-altitude-option ${selected ? "selected" : ""}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`journey-altitude-${altitude.id}-panel`}
            tabIndex={selected ? 0 : -1}
            data-altitude={altitude.id}
            onClick={() => onChange(altitude.id)}
          >
            {altitude.label}
          </button>
        );
      })}
    </div>
  );
}
