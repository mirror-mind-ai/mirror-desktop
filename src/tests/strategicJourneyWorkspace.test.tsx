import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StrategicJourneyWorkspace } from "../app/StrategicJourneyWorkspace";
import {
  representativeJourneyPreview,
  type RepresentativeJourneyPreview,
} from "../app/journeyAltitudePreview";
import strategicSource from "../app/StrategicJourneyWorkspace.tsx?raw";

const previewWithUnrelatedImpact = {
  ...representativeJourneyPreview,
  strategic: {
    ...representativeJourneyPreview.strategic,
    impacts: [
      ...representativeJourneyPreview.strategic.impacts,
      { id: "unrelated-impact", label: "Unrelated impact must not appear." },
    ],
  },
} satisfies RepresentativeJourneyPreview;

describe("StrategicJourneyWorkspace", () => {
  it("renders one realization with only its related observed impacts", () => {
    const html = renderToStaticMarkup(
      <StrategicJourneyWorkspace preview={previewWithUnrelatedImpact} />,
    );
    const realization = representativeJourneyPreview.strategic.realizations[0];

    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-label="Strategic workspace"');
    expect(html).toContain("Realization");
    expect(html).toContain(realization.title);
    expect(html).toContain("Observed impacts");
    expect(html).toContain("Conversation continuation is observable and recoverable.");
    expect(html).toContain("The desktop body is ready to experiment with the Nautilus method.");
    expect(html).not.toContain("Unrelated impact must not appear.");
    expect(html.match(/<ul/g)).toHaveLength(1);
  });

  it("presents pragmatic and integrative value as equal complementary lenses", () => {
    const html = renderToStaticMarkup(
      <StrategicJourneyWorkspace preview={representativeJourneyPreview} />,
    );
    const realization = representativeJourneyPreview.strategic.realizations[0];

    expect(html).toContain("Pragmatic value");
    expect(html).toContain("Integrative value");
    expect(html).toContain(realization.pragmaticValue);
    expect(html).toContain(realization.integrativeValue);
    expect(html.match(/class="strategic-value-lens"/g)).toHaveLength(2);
  });

  it("remains an inert meaning surface rather than a report or workflow", () => {
    const html = renderToStaticMarkup(
      <StrategicJourneyWorkspace preview={representativeJourneyPreview} />,
    );

    expect(html).not.toMatch(/preview|score|ranking|metric|kpi|progress|dashboard/i);
    expect(html).not.toMatch(/<(button|form|input|textarea|select|canvas)\b/);
    expect(strategicSource).not.toMatch(/invoke|generatePacket|AgentRun|useEffect|localStorage|sessionStorage/);
    expect(strategicSource).not.toContain("dangerouslySetInnerHTML");
  });
});
