import type { JourneyAltitude } from "./journeyAltitudePreview";
import type { OperationalSurface } from "./OperationalWorkspaceSwitcher";
import { DEFAULT_APP_EXTENSIONS, type AppExtensions } from "../domain/appExtensions";

export const journeySurfaceAvailability = Object.freeze({
  altitude: {
    operational: true,
    tactical: false,
    strategic: false,
  },
  operational: {
    chat: true,
    artifacts: true,
    canvas: true,
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

/**
 * CV-012.DS-001: a surface is shown when it is available and, for the two that became extensions,
 * when the person turned it on in Settings › Extensions.
 */
export function isOperationalSurfaceShown(
  surface: OperationalSurface,
  extensions: Readonly<AppExtensions> = DEFAULT_APP_EXTENSIONS,
): boolean {
  if (!isOperationalSurfaceAvailable(surface)) return false;
  if (surface === "artifacts") return extensions.agentField;
  if (surface === "canvas") return extensions.agentCanvas;
  return true;
}

export function normalizeJourneySurfaceSelection(
  altitude: JourneyAltitude,
  operationalSurface: OperationalSurface,
  extensions: Readonly<AppExtensions> = DEFAULT_APP_EXTENSIONS,
): { altitude: JourneyAltitude; operationalSurface: OperationalSurface } {
  return {
    altitude: isJourneyAltitudeAvailable(altitude) ? altitude : "operational",
    operationalSurface: isOperationalSurfaceShown(operationalSurface, extensions) ? operationalSurface : "chat",
  };
}
