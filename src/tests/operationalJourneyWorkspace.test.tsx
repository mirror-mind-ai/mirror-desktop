import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperationalWorkspaceSwitcher } from "../app/OperationalWorkspaceSwitcher";
import appSource from "../app/App.tsx?raw";
import documentationBrowserSource from "../app/JourneyDocumentationBrowser.tsx?raw";
import switcherSource from "../app/OperationalWorkspaceSwitcher.tsx?raw";

describe("Operational Journey workspace", () => {
  it("shows only functional Conversation, Context and Workflow controls", () => {
    const html = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} />,
    );

    expect(html).toContain('aria-label="Operational workspace"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain("Conversation");
    // CR105: the surface shows what effectively entered the agent's context, not an artifact
    // list. The id stays `artifacts` because it is persisted selection state, not a label.
    expect(html).toContain("Context");
    // CR112: Workflow hosts what the Journey declares about its own work. It is a separate
    // surface with its own persisted id, not another region inside Context.
    expect(html).toContain("Workflow");
    expect(html).toContain('aria-controls="operational-workflow-panel"');
    expect(html).not.toContain(">Artifacts<");
    expect(html).not.toContain("Ariad");
    expect(html).not.toContain(">Chat<");
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/class="selector-option-icon"/g)).toHaveLength(3);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
    expect(html).toContain('data-icon="conversation"');
    expect(html).toContain('data-icon="artifacts"');
    expect(html).toContain('data-icon="workflow"');
    expect(html).not.toContain('data-icon="ariad"');
  });

  it("keeps Operational surface switching disabled during active work", () => {
    const html = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} disabled />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).toContain('aria-disabled="true"');
  });

  it("takes the Navigator to the composer after a Workflow gesture pre-fills it", () => {
    // The composer section is hidden on every surface except the Conversation, so writing a draft
    // while the Navigator is still looking at Workflow changes nothing they can see and reads as a
    // button that did not work. Both Workflow gestures therefore move to the Conversation and put
    // the cursor in the composer, so the pre-filled text is where the Navigator can read and send
    // it. The prompt is still not sent: moving to the composer is the opposite of submitting.
    expect(appSource).toContain("onCompose={composeWorkflowRequest}");

    const handler = appSource.slice(
      appSource.indexOf("function composeWorkflowRequest"),
      appSource.indexOf("const developmentChannel"),
    );
    expect(handler).toContain("setJourneyComposerDraft(selectedJourney, message)");
    expect(handler).toContain("showConversation()");
    expect(handler).toContain("focusComposer()");
    expect(handler).not.toContain("generatePacket");
    expect(handler).not.toContain("submitActiveSteering");

    expect(appSource).toContain("ref={composerInputRef}");
  });

  it("wires the Context surface to the selected Journey documentation boundary", () => {
    expect(appSource).toContain("<JourneyDocumentationBrowser");
    expect(appSource).toContain("journeyId={selectedJourneyItem.id}");
    expect(appSource).toContain("journeyName={selectedJourneyItem.name}");
    expect(appSource).not.toContain("journeyRoot={selectedJourneyItem.projectPath}");
    expect(appSource).not.toContain("representativeJourneyPreview.artifacts");
    expect(documentationBrowserSource).not.toContain("open_local_reference");
    expect(documentationBrowserSource).not.toContain("href=");
  });

  it("mounts published Journey projections or an honest empty surface", () => {
    expect(appSource).toContain("loadJourneyProjections(selectedJourney)");
    expect(appSource).toContain("<AriadOperationalObservatory");
    expect(appSource).toContain("projection={journeyProjections?.operational}");
    expect(appSource).toContain("<TacticalJourneyWorkspace");
    expect(appSource).toContain("<StrategicJourneyWorkspace");
    expect(appSource).toContain("projection={journeyProjections.tactical}");
    expect(appSource).toContain("projection={journeyProjections.strategic}");
    expect(appSource).toContain('altitude="tactical"');
    expect(appSource).toContain('altitude="strategic"');
    expect(appSource).toContain("journeyName={selectedJourneyItem.name}");
    expect(appSource).not.toContain("<JourneyAltitudePlaceholder");
    expect(appSource).not.toContain("representativeJourneyPreviewForJourney");
  });

  it("simplifies the header and keeps altitude state separate from runtime ownership", () => {
    expect(appSource).toContain("defaultJourneyAltitude");
    expect(appSource).toContain("setSelectedAltitude");
    expect(appSource).toContain("setSelectedOperationalSurface");
    expect(appSource).toContain("<JourneyAltitudeSwitcher");
    expect(appSource).toContain("<OperationalWorkspaceSwitcher");
    expect(appSource).toContain('presentedAltitude === "operational"');
    expect(appSource).toContain('presentedOperationalSurface === "chat"');
    expect(appSource).toContain("isJourneyReloading");
    expect(appSource).toContain("navigationPresentation.cancelVisible");
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
    expect(appSource).not.toContain("headerExpanded");
    expect(appSource).not.toContain("rightPanelCollapsed");
    expect(appSource).toContain('aria-label="Search active conversation"');
    expect(appSource).toContain('aria-label="Navigate active conversation turns"');
    expect(appSource).toContain("void generatePacket(\"live\")");
    expect(appSource).not.toContain("dangerouslySetInnerHTML");
  });

  // Field and territory are Nautilus method vocabulary (Agentic Field, Human Territory). The
  // product borrowed them while the surface was being designed and gives them back here, so the
  // concepts stay in the method and the product speaks only about what it can actually show.
  it("keeps retired method vocabulary out of the operational surface copy", () => {
    const switcher = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="artifacts" onChange={() => undefined} />,
    );

    for (const retired of ["Field", "field", "Territor", "territor"]) {
      expect(switcher).not.toContain(retired);
    }
    expect(switcherSource).not.toContain("Agent\u2019s Field");
  });

});
