import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAltitudePlaceholder } from "../app/JourneyAltitudePlaceholder";
import { OperationalArtifactsPreview } from "../app/OperationalArtifactsPreview";
import { representativeJourneyPreview } from "../app/journeyAltitudePreview";
import appSource from "../app/App.tsx?raw";
import appStyles from "../styles/app.css?raw";

describe("Operational Journey workspace", () => {
  it("renders representative artifacts without file authority", () => {
    const html = renderToStaticMarkup(
      <OperationalArtifactsPreview
        journeyName="Nautilus Harness"
        artifacts={representativeJourneyPreview.artifacts}
      />,
    );

    expect(html).toContain("Journey artifacts");
    expect(html).toContain("Representative preview");
    expect(html).toContain("Live workspace reading comes later");
    expect(html).toContain("docs/project/roadmap/index.md");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("Open file");
  });

  it.each(["tactical", "strategic"] as const)(
    "renders an honest %s placeholder without derived semantics or actions",
    (altitude) => {
      const html = renderToStaticMarkup(<JourneyAltitudePlaceholder altitude={altitude} />);

      expect(html).toContain(`${altitude === "tactical" ? "Tactical" : "Strategic"} altitude`);
      expect(html).toContain("GUI experiment");
      expect(html).toContain(altitude === "tactical" ? "US-2" : "US-3");
      expect(html).not.toMatch(/Mission|Evidence|Deliverable|Realization|Impact|Value/);
      expect(html).not.toContain("button");
      expect(html).not.toContain("textarea");
    },
  );

  it("simplifies the header and keeps altitude state separate from runtime ownership", () => {
    expect(appSource).toContain("defaultJourneyAltitude");
    expect(appSource).toContain("setSelectedAltitude");
    expect(appSource).toContain("<JourneyAltitudeSwitcher");
    expect(appSource).toContain('selectedAltitude === "operational"');
    expect(appSource).toContain("isJourneyReloading");
    expect(appSource).toContain('agentRun.status === "running"');
    expect(appSource).not.toContain('className="journey-status-rail"');
    expect(appSource).not.toContain('className="status-pill');
    expect(appSource).not.toContain('className="present-map-summary"');
    expect(appSource).not.toContain('className="present-map-avatars"');
    expect(appSource).not.toContain("presentMapCounters");
    expect(appSource).not.toContain("currentDeliveryTitle");
    expect(appSource).toContain('className="active-journey-title"');
    expect(appSource).toContain('className="journey-moment-summary"');
    expect(appSource).toContain("void generatePacket(\"live\")");
    expect(appSource).not.toContain("dangerouslySetInnerHTML");
  });

  it("removes styles owned only by the former semantic header summaries", () => {
    expect(appStyles).not.toContain(".journey-status-rail");
    expect(appStyles).not.toContain(".status-pill");
    expect(appStyles).not.toContain(".present-map-summary");
    expect(appStyles).not.toContain(".present-map-avatars");
  });
});
