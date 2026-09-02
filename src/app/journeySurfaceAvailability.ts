import type { JourneyAltitude } from "./journeyAltitudePreview";
import type { OperationalSurface } from "./OperationalWorkspaceSwitcher";

export const journeySurfaceAvailability = Object.freeze({
  altitude: {
    operational: true,
    tactical: false,
    strategic: false,
  },
  operational: {
    chat: true,
    artifacts: true,
    ariad: false,
  },
} as const satisfies {
  altitude: Record<JourneyAltitude, boolean>;
  operational: Record<OperationalSurface, boolean>;
});

export function isJourneyAltitudeAvailable(altitude: JourneyAltitude): boolean {
  return journeySurfaceAvailability.altitude[altitude];
}

export function shouldShowJourneyAltitudeSwitcher(
  availability: Readonly<Record<JourneyAltitude, boolean>> = journeySurfaceAvailability.altitude,
): boolean {
  return Object.values(availability).filter(Boolean).length > 1;
}

export function isOperationalSurfaceAvailable(surface: OperationalSurface): boolean {
  return journeySurfaceAvailability.operational[surface];
}

export function normalizeJourneySurfaceSelection(
  altitude: JourneyAltitude,
  operationalSurface: OperationalSurface,
): { altitude: JourneyAltitude; operationalSurface: OperationalSurface } {
  return {
    altitude: isJourneyAltitudeAvailable(altitude) ? altitude : "operational",
    operationalSurface: isOperationalSurfaceAvailable(operationalSurface) ? operationalSurface : "chat",
  };
}
