import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JourneyCanvasSurface } from "../app/JourneyCanvasSurface";
import { CANVAS_FILE_NAME, CANVAS_INSTRUCTIONS_FILE_NAME, type JourneyCanvasViewState } from "../domain/journeyCanvas";
import canvasSurfaceSource from "../app/JourneyCanvasSurface.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const stylesheet: string = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

const BRIEFING = "Gestao da vida economica pessoal e da PJ.";

const paths = {
  relativePath: CANVAS_FILE_NAME,
  instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME,
  instructionsPresent: true,
};

const drawnView: JourneyCanvasViewState = {
  ...paths,
  status: "drawn",
  content: "# Ritual mensal\n\nCiclo corrente de setembro.\n",
  drawnAt: Date.UTC(2026, 9, 1, 23, 38),
};

function render(canvas: JourneyCanvasViewState, onCompose = () => undefined, onReload = () => undefined) {
  return renderToStaticMarkup(
    <JourneyCanvasSurface
      journeyName="vida-economica"
      journeyBriefing={BRIEFING}
      canvas={canvas}
      onCompose={onCompose}
      onReload={onReload}
      reloading={false}
    />,
  );
}

describe("JourneyCanvasSurface", () => {
  it("renders the drawing and says when it was drawn", () => {
    const html = render(drawnView);
    expect(html).toContain("Ritual mensal");
    expect(html).toContain("Ciclo corrente de setembro");
    expect(html).toMatch(/drawn/i);
  });

  /**
   * The app has no declared sources, so it cannot know whether a drawing is current. Saying or
   * implying that it is would be the one dishonest thing this surface could do.
   */
  it("makes no claim that the drawing is current", () => {
    const html = render(drawnView);
    expect(html).not.toMatch(/up to date|current as of|fresh|in sync|stale/i);
  });

  it("offers a redraw gesture and promises nothing is sent", () => {
    const html = render(drawnView);
    expect(html).toMatch(/redraw/i);
    expect(html).toMatch(/nothing is sent until you decide/i);
  });

  it("shows honest absence and offers the teaching gesture when nothing is drawn", () => {
    const html = render({ ...paths, instructionsPresent: false, status: "undrawn" });
    expect(html).toContain(CANVAS_FILE_NAME);
    expect(html).toMatch(/has not drawn/i);
    expect(html).toMatch(/teach/i);
  });

  it("offers both gestures when a drawing exists without standing instructions", () => {
    const html = render({ ...drawnView, instructionsPresent: false });
    expect(html).toMatch(/teach/i);
    expect(html).toMatch(/redraw/i);
    expect(html).toContain(CANVAS_INSTRUCTIONS_FILE_NAME);
  });

  it("does not mention the instructions file when it already exists", () => {
    const html = render(drawnView);
    expect(html).not.toMatch(/teach/i);
  });

  it("names the reason for absence and renders nothing in its place", () => {
    for (const [reason, expected] of [
      ["symlink", /symbolic link/i],
      ["oversized", /larger than/i],
      ["invalid_utf8", /UTF-8/i],
      ["unsupported_type", /not a readable text document/i],
      ["unreadable", /could not be opened/i],
    ] as const) {
      const html = render({ ...paths, instructionsPresent: false, status: "unavailable", reason });
      expect(html).toMatch(expected);
      expect(html).not.toContain("Ritual mensal");
    }
  });

  it("keeps the last good drawing on screen while a re-read is in flight", () => {
    const html = renderToStaticMarkup(
      <JourneyCanvasSurface
        journeyName="vida-economica"
        canvas={drawnView}
        onCompose={() => undefined}
        onReload={() => undefined}
        reloading
      />,
    );
    expect(html).toContain("Ritual mensal");
    expect(html).toMatch(/re-?reading/i);
  });

  it("carries a reload control, which is how disk change is noticed without watching", () => {
    expect(canvasSurfaceSource).toContain("onReload");
    expect(canvasSurfaceSource).toMatch(/aria-label="Reload the canvas"/);
    expect(canvasSurfaceSource).not.toMatch(/setInterval|setTimeout|watch/i);
  });

  it("carries the Journey's description into both prompts without displaying it", () => {
    expect(canvasSurfaceSource).toContain("composeCanvasTeachingPrompt(journeyName, journeyBriefing)");
    expect(canvasSurfaceSource).toContain("composeCanvasRedrawPrompt(journeyName, journeyBriefing)");
    expect(render(drawnView)).not.toContain(BRIEFING);
    expect(render({ ...paths, instructionsPresent: false, status: "undrawn" })).not.toContain(BRIEFING);
  });

  it("introduces no invocation, hidden state or side effect", () => {
    for (const forbidden of ["invoke", "useEffect", "useState", "localStorage", "sessionStorage", "dangerouslySetInnerHTML"]) {
      expect(canvasSurfaceSource).not.toContain(forbidden);
    }
  });

  it("reuses a button class already exempt from the light catch-all", () => {
    // CR105's defect was readable ink on the dark shell and white ink on a white surface. A new
    // transparent text button would repeat it; .secondary-button already has a measured light
    // treatment and is already named in the opt-out list.
    expect(render(drawnView)).toContain('class="secondary-button"');
    expect(render({ ...paths, instructionsPresent: false, status: "undrawn" }))
      .toContain('class="secondary-button"');

    const optOut = stylesheet
      .split("\n")
      .find((line: string) => line.includes(":where(button:not(") && line.includes(".secondary-button"));
    expect(optOut).toBeTruthy();
  });

  it("gives the reload control the light treatment already measured for Context's reload", () => {
    // The reload control is a bare button and is not in the catch-all's opt-out list, so in the
    // light families it would be painted white on a white surface, which is CR105's defect. The
    // mechanism that saves `.artifact-tree-reload` is a dedicated light-family rule carrying
    // higher specificity than the catch-all. This control joins that same rule rather than
    // inventing a treatment that would have to be measured again.
    expect(stylesheet).toContain(".journey-canvas-reload");

    const sharedRule = stylesheet
      .split("}")
      .find((block: string) => block.includes(".journey-canvas-reload")
        && block.includes(".artifact-tree-reload")
        && block.includes('[data-application-theme="daylight"]')
        && block.includes('[data-application-theme="mist"]')
        && block.includes('[data-application-theme="parchment"]'));
    expect(sharedRule).toBeTruthy();
    expect(sharedRule).toContain("var(--light-accent)");

    // And it must not be left to the catch-all by being absent from both places.
    const catchAll = stylesheet
      .split("\n")
      .find((line: string) => line.includes(":where(button:not("));
    expect(catchAll).toBeTruthy();
    expect(catchAll).not.toContain(".journey-canvas-reload");
  });

  it("is one tab panel with its own id", () => {
    const html = render(drawnView);
    expect(html).toContain('id="operational-canvas-panel"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-label="Canvas"');
  });
});
