import { describe, expect, it } from "vitest";

import {
  CANVAS_FILE_NAME,
  CANVAS_INSTRUCTIONS_FILE_NAME,
  deriveJourneyCanvasView,
  normalizeJourneyCanvas,
} from "../domain/journeyCanvas";

const drawnPayload = {
  status: "drawn",
  relativePath: CANVAS_FILE_NAME,
  instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME,
  instructionsPresent: true,
  content: "# Ritual mensal\n\nCiclo corrente.\n",
  sizeBytes: 34,
  modifiedAt: 1790905146571,
};

describe("journey canvas transport", () => {
  it("accepts a drawing with its facts", () => {
    const canvas = normalizeJourneyCanvas(drawnPayload);
    expect(canvas.status).toBe("drawn");
    if (canvas.status !== "drawn") throw new Error("unreachable");
    expect(canvas.content).toBe("# Ritual mensal\n\nCiclo corrente.\n");
    expect(canvas.modifiedAt).toBe(1790905146571);
    expect(canvas.instructionsPresent).toBe(true);
  });

  it("accepts a Journey whose agent has drawn nothing", () => {
    const canvas = normalizeJourneyCanvas({
      status: "undrawn",
      relativePath: CANVAS_FILE_NAME,
      instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME,
      instructionsPresent: false,
    });
    expect(canvas.status).toBe("undrawn");
  });

  it("accepts absence carrying a reason", () => {
    const canvas = normalizeJourneyCanvas({
      status: "unavailable",
      relativePath: CANVAS_FILE_NAME,
      instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME,
      instructionsPresent: false,
      reason: "oversized",
    });
    expect(canvas.status).toBe("unavailable");
    if (canvas.status !== "unavailable") throw new Error("unreachable");
    expect(canvas.reason).toBe("oversized");
  });

  it("rejects a payload that is not one of the three transport states", () => {
    for (const payload of [
      undefined,
      null,
      "drawn",
      { status: "ready", relativePath: CANVAS_FILE_NAME },
      { ...drawnPayload, status: "possibly_stale" },
      { ...drawnPayload, instructionsPresent: "yes" },
      { ...drawnPayload, content: 42 },
      { ...drawnPayload, modifiedAt: -1 },
      { ...drawnPayload, relativePath: "../canvas.md" },
      { ...drawnPayload, relativePath: ".canvas.md" },
      { ...drawnPayload, relativePath: "/etc/canvas.md" },
      { status: "unavailable", relativePath: CANVAS_FILE_NAME, instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME, instructionsPresent: false },
    ]) {
      expect(() => normalizeJourneyCanvas(payload)).toThrow();
    }
  });

  it("rejects a drawing that claims to be drawn without content", () => {
    const { content: _content, ...withoutContent } = drawnPayload;
    expect(() => normalizeJourneyCanvas(withoutContent)).toThrow();
  });
});

describe("journey canvas view", () => {
  it("renders a drawing and says when it was drawn", () => {
    const view = deriveJourneyCanvasView(normalizeJourneyCanvas(drawnPayload));
    expect(view.status).toBe("drawn");
    if (view.status !== "drawn") throw new Error("unreachable");
    expect(view.content).toBe("# Ritual mensal\n\nCiclo corrente.\n");
    expect(view.drawnAt).toBe(1790905146571);
    expect(view.instructionsPresent).toBe(true);
  });

  /**
   * The superseded design could prove a declared source had changed. It could never prove nothing
   * relevant had changed. Canvas declares no sources, so there is no freshness to derive and the
   * view must carry no field that could be read as one.
   */
  it("derives no freshness at all", () => {
    const view = deriveJourneyCanvasView(normalizeJourneyCanvas(drawnPayload));
    const keys = Object.keys(view);
    for (const forbidden of ["stale", "possiblyStale", "fresh", "current", "changedInputs", "missingInputs", "sourcePaths"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(view)).not.toMatch(/stale|fresh|up to date/i);
  });

  it("offers the teaching gesture when a drawing exists without standing instructions", () => {
    const view = deriveJourneyCanvasView(
      normalizeJourneyCanvas({ ...drawnPayload, instructionsPresent: false }),
    );
    if (view.status !== "drawn") throw new Error("unreachable");
    expect(view.instructionsPresent).toBe(false);
  });

  it("carries absence through with its reason and nothing partial", () => {
    const view = deriveJourneyCanvasView({
      status: "unavailable",
      relativePath: CANVAS_FILE_NAME,
      instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME,
      instructionsPresent: false,
      reason: "invalid_utf8",
    });
    expect(view.status).toBe("unavailable");
    if (view.status !== "unavailable") throw new Error("unreachable");
    expect(view.reason).toBe("invalid_utf8");
    expect(JSON.stringify(view)).not.toContain("content");
  });

  it("carries the undrawn state with both conventional paths", () => {
    const view = deriveJourneyCanvasView({
      status: "undrawn",
      relativePath: CANVAS_FILE_NAME,
      instructionsRelativePath: CANVAS_INSTRUCTIONS_FILE_NAME,
      instructionsPresent: false,
    });
    expect(view.status).toBe("undrawn");
    if (view.status !== "undrawn") throw new Error("unreachable");
    expect(view.relativePath).toBe("canvas.md");
    expect(view.instructionsRelativePath).toBe("canvas-instructions.md");
  });

  it("keeps the conventional names fixed, since the prompts tell the agent exactly these", () => {
    expect(CANVAS_FILE_NAME).toBe("canvas.md");
    expect(CANVAS_INSTRUCTIONS_FILE_NAME).toBe("canvas-instructions.md");
    for (const name of [CANVAS_FILE_NAME, CANVAS_INSTRUCTIONS_FILE_NAME]) {
      expect(name.startsWith(".")).toBe(false);
      expect(name).not.toContain("/");
    }
  });
});
