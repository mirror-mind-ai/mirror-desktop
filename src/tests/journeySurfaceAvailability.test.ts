import { describe, expect, it } from "vitest";
import {
  isJourneyAltitudeAvailable,
  isOperationalSurfaceAvailable,
  journeySurfaceAvailability,
  normalizeJourneySurfaceSelection,
  shouldShowJourneyAltitudeSwitcher,
} from "../app/journeySurfaceAvailability";


describe("temporary Journey surface availability", () => {
  it("keeps one explicit re-enablement policy", () => {
    expect(journeySurfaceAvailability).toEqual({
      altitude: { operational: true, tactical: false, strategic: false },
      operational: { chat: true, artifacts: true, canvas: true, ariad: false },
    });
    expect(isJourneyAltitudeAvailable("operational")).toBe(true);
    expect(isOperationalSurfaceAvailable("artifacts")).toBe(true);
    expect(isOperationalSurfaceAvailable("canvas")).toBe(true);
    expect(shouldShowJourneyAltitudeSwitcher()).toBe(false);
    expect(shouldShowJourneyAltitudeSwitcher({
      operational: true,
      tactical: true,
      strategic: false,
    })).toBe(true);
  });

  it("normalizes stale hidden selections to functional surfaces", () => {
    expect(normalizeJourneySurfaceSelection("tactical", "ariad")).toEqual({
      altitude: "operational",
      operationalSurface: "chat",
    });
    // CV-012.DS-001: the Agent Field is an extension now, so it survives only when turned on.
    expect(normalizeJourneySurfaceSelection("strategic", "artifacts", { agentField: true, agentCanvas: false })).toEqual({
      altitude: "operational",
      operationalSurface: "artifacts",
    });
    expect(normalizeJourneySurfaceSelection("strategic", "artifacts")).toEqual({
      altitude: "operational",
      operationalSurface: "chat",
    });
    expect(normalizeJourneySurfaceSelection("operational", "chat")).toEqual({
      altitude: "operational",
      operationalSurface: "chat",
    });
  });
});
