import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperationalWorkspaceSwitcher } from "../app/OperationalWorkspaceSwitcher";
import appSource from "../app/App.tsx?raw";
import documentationBrowserSource from "../app/JourneyDocumentationBrowser.tsx?raw";
import switcherSource from "../app/OperationalWorkspaceSwitcher.tsx?raw";

describe("Operational Journey workspace", () => {
  it("shows only functional Conversation, Context Map and Agent’s Canvas controls", () => {
    const html = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} />,
    );

    expect(html).toContain('aria-label="Operational workspace"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain("Conversation");
    // CR105: the surface shows what effectively entered the agent's context, not an artifact
    // list. The id stays `artifacts` because it is persisted selection state, not a label.
    expect(html).toContain("Context Map");
    expect(html).not.toContain(">Context<");
    // CR112: Canvas hosts the drawing the Journey's agent keeps. It is a separate surface with
    // its own persisted id, not another region inside Context.
    expect(html).toContain("Agent’s Canvas");
    expect(html).not.toContain(">Canvas<");
    expect(html).toContain('aria-controls="operational-canvas-panel"');
    // The genre is deliberately unnamed, which is the whole finding of the Canvas pivot.
    expect(html).not.toContain("Workflow");
    expect(html).not.toContain(">Artifacts<");
    expect(html).not.toContain("Ariad");
    expect(html).not.toContain(">Chat<");
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/class="selector-option-icon"/g)).toHaveLength(3);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
    expect(html).toContain('data-icon="conversation"');
    expect(html).toContain('data-icon="artifacts"');
    expect(html).toContain('data-icon="canvas"');
    expect(html).not.toContain('data-icon="ariad"');
  });

  it("keeps Operational surface switching disabled during active work", () => {
    const html = renderToStaticMarkup(
      <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} disabled />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).toContain('aria-disabled="true"');
  });

  it("takes the Navigator to the composer after a Canvas gesture pre-fills it", () => {
    // The composer section is hidden on every surface except the Conversation, so writing a draft
    // while the Navigator is still looking at Canvas changes nothing they can see and reads as a
    // button that did not work. Both Canvas gestures therefore move to the Conversation and put
    // the cursor in the composer, so the pre-filled text is where the Navigator can read and send
    // it. The prompt is still not sent: moving to the composer is the opposite of submitting.
    expect(appSource).toContain("onCompose={composeCanvasRequest}");

    const handler = appSource.slice(
      appSource.indexOf("function composeCanvasRequest"),
      appSource.indexOf("const developmentChannel"),
    );
    expect(handler).toContain("setJourneyComposerDraft(selectedJourney, message)");
    expect(handler).toContain("showConversation()");
    expect(handler).toContain("focusComposer()");
    expect(handler).not.toContain("generatePacket");
    expect(handler).not.toContain("submitActiveSteering");

    expect(appSource).toContain("textareaRef={composerInputRef}");
  });

  it("re-reads the canvas on gesture, so a drawing made during the session appears", () => {
    // Measured in the evaluation bundle: after the agent wrote the file the tab did not update,
    // and restarting was the only way to see it. The loader was keyed on Journey, registry and
    // binding, none of which change when a file is written. Selecting Canvas and asking for a
    // reload are the two gestures that re-read it. Nothing watches or polls the disk.
    expect(appSource).toContain("canvasSurfaceSelected");
    expect(appSource).toContain("journeyCanvasReadNonce");
    expect(appSource).toContain("setJourneyCanvasReadNonce((nonce) => nonce + 1)");

    const loader = appSource.slice(
      appSource.indexOf("const canvasSurfaceSelected"),
      appSource.indexOf("const journeyCanvasView"),
    );
    expect(loader).toContain("canvasSurfaceSelected, journeyCanvasReadNonce]");
    expect(loader).not.toMatch(/setInterval|setTimeout|watchImmediate|FileSystemWatcher/);

    // A re-read must not blink the panel through absence on its way back to the same content.
    expect(loader).toContain("setJourneyCanvasReloading(true)");
    expect(appSource).toContain("reloading={journeyCanvasReloading}");
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
