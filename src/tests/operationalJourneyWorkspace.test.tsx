import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAltitudePlaceholder } from "../app/JourneyAltitudePlaceholder";
import { OperationalWorkspaceSwitcher } from "../app/OperationalWorkspaceSwitcher";
import appSource from "../app/App.tsx?raw";
import documentationBrowserSource from "../app/JourneyDocumentationBrowser.tsx?raw";

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

  it("wires Artifacts to the selected Journey documentation boundary", () => {
    expect(appSource).toContain("<JourneyDocumentationBrowser");
    expect(appSource).toContain("journeyId={selectedJourneyItem.id}");
    expect(appSource).toContain("journeyName={selectedJourneyItem.name}");
    expect(appSource).not.toContain("journeyRoot={selectedJourneyItem.projectPath}");
    expect(appSource).not.toContain("representativeJourneyPreview.artifacts");
    expect(documentationBrowserSource).not.toContain("open_local_reference");
    expect(documentationBrowserSource).not.toContain("href=");
  });

  it("keeps Strategic as an honest placeholder without derived semantics or actions", () => {
    const html = renderToStaticMarkup(<JourneyAltitudePlaceholder altitude="strategic" />);

    expect(html).toContain("Strategic altitude");
    expect(html).toContain("Foundation shell");
    expect(html).not.toContain("GUI experiment");
    expect(html).toContain("US-3");
    expect(html).not.toMatch(/Mission|Evidence|Deliverable|Realization|Impact|Value/);
    expect(html).not.toContain("button");
    expect(html).not.toContain("textarea");
  });

  it("mounts Tactical as a dedicated representative workspace while preserving the other altitude branches", () => {
    expect(appSource).toContain("<TacticalJourneyWorkspace");
    expect(appSource).toContain("preview={representativeJourneyPreview}");
    expect(appSource).toContain('selectedAltitude === "tactical"');
    expect(appSource).toContain('selectedAltitude === "strategic"');
    expect(appSource).toContain('<JourneyAltitudePlaceholder altitude="strategic" />');
  });

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
    expect(appSource).not.toContain('className="journey-moment-summary"');
    expect(appSource).not.toContain("currentSituationDescription");
    expect(appSource).not.toContain("situationDescription");
    expect(appSource).toContain("useState<OperationalSurface>(\"chat\")");
    expect(appSource).toContain("useState(true)");
    expect(appSource).toContain("void generatePacket(\"live\")");
    expect(appSource).not.toContain("dangerouslySetInnerHTML");
  });

});
