import { describe, expect, it } from "vitest";
import {
  isJourneyAltitudeAvailable,
  isOperationalSurfaceAvailable,
  journeySurfaceAvailability,
  normalizeJourneySurfaceSelection,
} from "../app/journeySurfaceAvailability";


describe("temporary Journey surface availability", () => {
  it("keeps one explicit re-enablement policy", () => {
    expect(journeySurfaceAvailability).toEqual({
      altitude: { operational: true, tactical: false, strategic: false },
      operational: { chat: true, artifacts: true, ariad: false },
    });
    expect(isJourneyAltitudeAvailable("operational")).toBe(true);
    expect(isOperationalSurfaceAvailable("artifacts")).toBe(true);
  });

  it("normalizes stale hidden selections to functional surfaces", () => {
    expect(normalizeJourneySurfaceSelection("tactical", "ariad")).toEqual({
      altitude: "operational",
      operationalSurface: "chat",
    });
    expect(normalizeJourneySurfaceSelection("strategic", "artifacts")).toEqual({
      altitude: "operational",
      operationalSurface: "artifacts",
    });
    expect(normalizeJourneySurfaceSelection("operational", "chat")).toEqual({
      altitude: "operational",
      operationalSurface: "chat",
    });
  });
});
