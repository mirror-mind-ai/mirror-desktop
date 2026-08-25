import {
  journeyAltitudeDescriptors,
  type JourneyAltitude,
} from "./journeyAltitudePreview";

type JourneyAltitudeSwitcherProps = {
  value: JourneyAltitude;
  onChange: (altitude: JourneyAltitude) => void;
  disabled?: boolean;
};

export function JourneyAltitudeSwitcher({ value, onChange, disabled = false }: JourneyAltitudeSwitcherProps) {
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
            aria-disabled={disabled}
            aria-controls={`journey-altitude-${altitude.id}-panel`}
            disabled={disabled}
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
