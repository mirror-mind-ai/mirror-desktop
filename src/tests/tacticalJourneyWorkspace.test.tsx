import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TacticalJourneyWorkspace } from "../app/TacticalJourneyWorkspace";
import type { TacticalProjection } from "../domain/journeyProjections";
import tacticalSource from "../app/TacticalJourneyWorkspace.tsx?raw";

const projection: TacticalProjection = {
  journeyId: "journey-a", snapshotId: "ta-current", sourceRevision: "sha256:ta",
  sourceSnapshots: [{ namespace: "ariad", projection: "operational", snapshotId: "op-current" }],
  content: {
    mission: { id: "mission", title: "Published mission", purpose: "Orient the selected Journey.", sourceReferences: ["mission-source"] },
    evidence: [{ id: "evidence", title: "Published evidence", summary: "A grounded signal.", sourceReferences: ["evidence-source"] }],
    deliverables: [{ id: "delivery", title: "Published delivery", summary: "A concrete available form.", evidenceIds: ["evidence"], sourceReferences: ["deliverable-source"] }],
    ambiguities: [{ id: "ambiguity", title: "Open tactical tension", summary: "Evidence supports two possible missions.", sourceReferences: ["ambiguity-source"] }],
  },
};

describe("TacticalJourneyWorkspace", () => {
  it("renders published mission, evidence and deliverables", () => {
    const html = renderToStaticMarkup(<TacticalJourneyWorkspace projection={projection} />);
    expect(html).toContain('aria-label="Tactical workspace"');
    expect(html).toContain("Published mission");
    expect(html).toContain("Orient the selected Journey.");
    expect(html).toContain("Published evidence");
    expect(html).toContain("A grounded signal.");
    expect(html).toContain("Published delivery");
    expect(html).toContain("A concrete available form.");
    expect(html).toContain("Mission sources");
    expect(html).toContain("evidence-source");
    expect(html).toContain("deliverable-source");
    expect(html).toContain("Open tactical tension");
    expect(html).not.toMatch(/preview/i);
  });

  it("shows staleness without adding workflow or invocation controls", () => {
    const html = renderToStaticMarkup(<TacticalJourneyWorkspace projection={projection} stale />);
    expect(html).toContain("earlier published source");
    expect(html).not.toMatch(/<(form|input|textarea|button|select)\b/);
    expect(tacticalSource).not.toMatch(/invoke|generatePacket|AgentRun|useEffect|localStorage|sessionStorage/);
    expect(tacticalSource).not.toContain("dangerouslySetInnerHTML");
  });
});
