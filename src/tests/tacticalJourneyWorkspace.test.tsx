import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TacticalJourneyWorkspace } from "../app/TacticalJourneyWorkspace";
import {
  representativeJourneyPreview,
  type RepresentativeJourneyPreview,
} from "../app/journeyAltitudePreview";
import tacticalSource from "../app/TacticalJourneyWorkspace.tsx?raw";

const previewWithUnrelatedRecords = {
  ...representativeJourneyPreview,
  tactical: {
    ...representativeJourneyPreview.tactical,
    evidence: [
      ...representativeJourneyPreview.tactical.evidence,
      { id: "unrelated-evidence", label: "Unrelated evidence", detail: "Must not appear." },
    ],
    deliverables: [
      ...representativeJourneyPreview.tactical.deliverables,
      { id: "unrelated-deliverable", label: "Unrelated deliverable", state: "complete" as const },
    ],
  },
} satisfies RepresentativeJourneyPreview;

describe("TacticalJourneyWorkspace", () => {
  it("renders the mission as the directional anchor with only its related evidence and deliverables", () => {
    const html = renderToStaticMarkup(
      <TacticalJourneyWorkspace preview={previewWithUnrelatedRecords} />,
    );

    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-label="Tactical workspace"');
    expect(html).not.toContain("Tactical orientation");
    expect(html).not.toContain("Direction over activity");
    expect(html).not.toContain("Representative Journey preview");
    expect(html).not.toContain("Representative reading — not live-derived");
    expect(html).toContain("Active mission");
    expect(html).not.toMatch(/preview/i);
    expect(html).toContain(representativeJourneyPreview.tactical.mission.title);
    expect(html).toContain(representativeJourneyPreview.tactical.mission.purpose);
    expect(html).toContain("Evidence");
    expect(html).toContain("Deliverables");
    expect(html).toContain("Three-body parity accepted");
    expect(html).toContain("Conversation and Mirror context parity");
    expect(html).not.toContain("Unrelated evidence");
    expect(html).not.toContain("Unrelated deliverable");
    expect(html.match(/<ul/g)).toHaveLength(2);
  });

  it("is a read-only orientation surface rather than a workflow or invocation surface", () => {
    const html = renderToStaticMarkup(
      <TacticalJourneyWorkspace preview={representativeJourneyPreview} />,
    );

    expect(html).not.toContain("Representative reading — not live-derived");
    expect(html).not.toMatch(/<(form|input|textarea|button|select)\b/);
    expect(html).not.toMatch(/drag|drop|progress|score/i);
    expect(tacticalSource).not.toMatch(/invoke|generatePacket|AgentRun|useEffect|localStorage|sessionStorage/);
    expect(tacticalSource).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders deliverable state as descriptive metadata", () => {
    const html = renderToStaticMarkup(
      <TacticalJourneyWorkspace preview={representativeJourneyPreview} />,
    );

    expect(html).toContain("Complete");
    expect(html).toContain("Forming");
    expect(html.match(/tactical-deliverable-state/g)).toHaveLength(2);
  });
});
