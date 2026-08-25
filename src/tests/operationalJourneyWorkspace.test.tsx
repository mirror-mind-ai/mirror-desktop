import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAltitudePlaceholder } from "../app/JourneyAltitudePlaceholder";
import { OperationalArtifactsPreview } from "../app/OperationalArtifactsPreview";
import { OperationalWorkspaceSwitcher } from "../app/OperationalWorkspaceSwitcher";
import { representativeJourneyPreview } from "../app/journeyAltitudePreview";
import appSource from "../app/App.tsx?raw";

describe("Operational Journey workspace", () => {
  it("switches between full-width Chat and Artifacts surfaces", () => {
    const html = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} />,
    );

    expect(html).toContain('aria-label="Operational workspace"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain("Conversation");
    expect(html).toContain("Artifacts");
    expect(html).not.toContain(">Chat<");
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/class="selector-option-icon"/g)).toHaveLength(2);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(html).toContain('data-icon="conversation"');
    expect(html).toContain('data-icon="artifacts"');
  });

  it("keeps Operational surface switching disabled during active work", () => {
    const html = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} disabled />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('aria-disabled="true"');
  });

  it("renders representative artifacts without file authority", () => {
    const html = renderToStaticMarkup(
      <OperationalArtifactsPreview artifacts={representativeJourneyPreview.artifacts} />,
    );

    expect(html).toContain('class="operational-artifacts-workspace"');
    expect(html).toContain("Workspace structure");
    expect(html).toContain("Artifact detail area");
    expect(html).toContain("docs/project/roadmap/index.md");
    expect(html).not.toContain("Journey artifacts");
    expect(html).not.toContain("Nautilus Harness");
    expect(html).not.toContain("Representative preview");
    expect(html).not.toContain("Live workspace reading comes later");
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
    expect(appSource).toContain("setSelectedOperationalSurface");
    expect(appSource).toContain("<JourneyAltitudeSwitcher");
    expect(appSource).toContain("<OperationalWorkspaceSwitcher");
    expect(appSource).toContain('selectedAltitude === "operational"');
    expect(appSource).toContain('selectedOperationalSurface === "chat"');
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
    expect(appSource).toContain("useState<OperationalSurface>(\"chat\")");
    expect(appSource).toContain("useState(true)");
    expect(appSource).toContain("void generatePacket(\"live\")");
    expect(appSource).not.toContain("dangerouslySetInnerHTML");
  });

});
