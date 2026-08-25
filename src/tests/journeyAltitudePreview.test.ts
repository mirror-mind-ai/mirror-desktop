import { describe, expect, it } from "vitest";
import {
  defaultJourneyAltitude,
  journeyAltitudeDescriptors,
  representativeJourneyPreview,
  type JourneyAltitude,
} from "../app/journeyAltitudePreview";

function ids(items: readonly { id: string }[]) {
  return new Set(items.map((item) => item.id));
}

describe("journey altitude preview contract", () => {
  it("defines exactly three ordered altitudes with Operational as the default", () => {
    expect(journeyAltitudeDescriptors.map(({ id }) => id)).toEqual([
      "operational",
      "tactical",
      "strategic",
    ] satisfies JourneyAltitude[]);
    expect(journeyAltitudeDescriptors.map(({ label }) => label)).toEqual([
      "Operational",
      "Tactical",
      "Strategic",
    ]);
    expect(defaultJourneyAltitude).toBe("operational");
  });

  it("keeps one coherent representative thread across all three altitudes", () => {
    const preview = representativeJourneyPreview;
    const evidenceIds = ids(preview.tactical.evidence);
    const deliverableIds = ids(preview.tactical.deliverables);
    const impactIds = ids(preview.strategic.impacts);

    expect(preview.kind).toBe("representative_preview");
    expect(preview.previewLabel).toMatch(/preview/i);
    expect(preview.artifacts.previewStatus).toBe("representative");
    expect(preview.tactical.previewStatus).toBe("representative");
    expect(preview.strategic.previewStatus).toBe("representative");
    expect(preview.tactical.mission.evidenceIds.every((id) => evidenceIds.has(id))).toBe(true);
    expect(preview.tactical.mission.deliverableIds.every((id) => deliverableIds.has(id))).toBe(true);

    const realization = preview.strategic.realizations[0];
    expect(realization.relatedMissionId).toBe(preview.tactical.mission.id);
    expect(realization.relatedDeliverableIds.every((id) => deliverableIds.has(id))).toBe(true);
    expect(realization.impactIds.every((id) => impactIds.has(id))).toBe(true);
    expect(realization.pragmaticValue).toBeTruthy();
    expect(realization.integrativeValue).toBeTruthy();
  });

  it("contains only sanitized relative artifact paths", () => {
    for (const artifact of representativeJourneyPreview.artifacts.items) {
      expect(artifact.path.startsWith("/")).toBe(false);
      expect(artifact.path).not.toMatch(/Users|private|prompt|response/i);
      expect(artifact.path).not.toContain("..");
    }
  });
});
