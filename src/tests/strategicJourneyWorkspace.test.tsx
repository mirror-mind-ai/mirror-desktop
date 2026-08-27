import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StrategicJourneyWorkspace } from "../app/StrategicJourneyWorkspace";
import type { StrategicProjection } from "../domain/journeyProjections";
import strategicSource from "../app/StrategicJourneyWorkspace.tsx?raw";

const projection: StrategicProjection = {
  journeyId: "journey-a", snapshotId: "st-current", sourceRevision: "sha256:st",
  sourceSnapshots: [{ namespace: "ariad", projection: "operational", snapshotId: "op-current" }],
  content: {
    impacts: [
      { id: "related", title: "Related impact", summary: "Something happened after availability.", sourceReferences: ["impact-source"] },
      { id: "unrelated", title: "Unrelated impact", summary: "Must not appear.", sourceReferences: ["other"] },
    ],
    realizations: [{
      id: "realization", title: "Published realization", summary: "Value became available.", impactIds: ["related"],
      pragmaticValue: { summary: "Useful capacity became available.", sourceReferences: ["operational-source"] },
      integrativeValue: { summary: "The wider field gained coherence.", sourceReferences: ["tactical-source"] },
      sourceReferences: ["realization-source"],
    }],
    meaningCheckpoints: [{ id: "checkpoint", title: "Strategic meaning accepted", summary: "The realization is explicit synthesis, not a live inference.", state: "consolidated", sourceReferences: ["checkpoint-source"], correctionBoundary: "Corrections append review without rewriting original evidence." }],
  },
};

describe("StrategicJourneyWorkspace", () => {
  it("renders one realization with only related impacts", () => {
    const html = renderToStaticMarkup(<StrategicJourneyWorkspace projection={projection} />);
    expect(html).toContain("Published realization");
    expect(html).toContain("Value became available.");
    expect(html).toContain("Related impact");
    expect(html).toContain("Realization sources");
    expect(html).toContain("realization-source");
    expect(html).toContain("Impact sources");
    expect(html).toContain("impact-source");
    expect(html).toContain("Meaning checkpoints");
    expect(html).toContain("Consolidated checkpoint");
    expect(html).toContain("Strategic meaning accepted");
    expect(html).toContain("Correction boundary");
    expect(html).toContain("without rewriting original evidence");
    expect(html).toContain("checkpoint-source");
    expect(html).not.toContain("Unrelated impact");
  });

  it("presents equal value lenses and inert staleness", () => {
    const html = renderToStaticMarkup(<StrategicJourneyWorkspace projection={projection} stale />);
    expect(html).toContain("Pragmatic value");
    expect(html).toContain("Integrative value");
    expect(html).toContain("Useful capacity became available.");
    expect(html).toContain("The wider field gained coherence.");
    expect(html).toContain("Pragmatic value sources");
    expect(html).toContain("operational-source");
    expect(html).toContain("Integrative value sources");
    expect(html).toContain("tactical-source");
    expect(html).toContain("earlier published source");
    expect(html.match(/class="strategic-value-lens"/g)).toHaveLength(2);
    expect(html).not.toMatch(/<(button|form|input|textarea|select|canvas)\b/);
    expect(strategicSource).not.toMatch(/invoke|generatePacket|AgentRun|useEffect|localStorage|sessionStorage/);
    expect(strategicSource).not.toContain("dangerouslySetInnerHTML");
  });
});
