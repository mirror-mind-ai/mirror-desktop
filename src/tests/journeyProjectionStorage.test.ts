import { describe, expect, it } from "vitest";
import storageSource from "../app/journeyProjectionStorage.ts?raw";
import appSource from "../app/App.tsx?raw";

describe("Journey projection storage boundary", () => {
  it("supplies only Journey identity to the fixed Tauri inspection command", () => {
    expect(storageSource).toContain('"load_journey_projections"');
    expect(storageSource).toContain("{ journeyId }");
    for (const forbidden of ["journeyRoot", "projectPath", "namespace:", "projection:", "setInterval", "publish", "piProcessStream"]) {
      expect(storageSource).not.toContain(forbidden);
    }
  });

  it("clears readings per Journey and never falls back to representative production content", () => {
    expect(appSource).toContain("setJourneyProjections(undefined)");
    expect(appSource).toContain("cancelled || bundle.journeyId !== selectedJourney");
    expect(appSource).not.toContain("representativeJourneyPreviewForJourney");
    expect(appSource).not.toContain("contextualJourneyPreview");
  });
});
