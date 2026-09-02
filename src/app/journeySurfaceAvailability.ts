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
