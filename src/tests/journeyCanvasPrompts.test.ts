import { describe, expect, it } from "vitest";

import { COMPOSER_DRAFT_MAX_CHARS } from "../domain/composerDrafts";
import { CANVAS_FILE_NAME, CANVAS_INSTRUCTIONS_FILE_NAME } from "../domain/journeyCanvas";
import {
  CANVAS_BRIEFING_EXCERPT_MAX_CHARS,
  composeCanvasRedrawPrompt,
  composeCanvasTeachingPrompt,
} from "../domain/journeyCanvasPrompts";

const briefing = "Gestao da vida economica pessoal e da PJ, com ritual mensal de conciliacao.";
const teaching = composeCanvasTeachingPrompt("vida-economica", briefing);
const redraw = composeCanvasRedrawPrompt("vida-economica", briefing);

/**
 * These prompts are prose, so a line break is as insignificant as a space. Phrase assertions run
 * against collapsed whitespace, otherwise they would fail on rewrapping and pass only by luck.
 */
const flat = (prompt: string) => prompt.replace(/\s+/g, " ");

describe("both canvas prompts", () => {
  it("name the two conventional files and nothing else", () => {
    for (const prompt of [teaching, redraw]) {
      expect(prompt).toContain(CANVAS_FILE_NAME);
      expect(prompt).toContain(CANVAS_INSTRUCTIONS_FILE_NAME);
      // The manifest is gone. A prompt that still mentions it would ask for a file the app
      // no longer reads, and the agent would dutifully write it.
      expect(prompt).not.toContain("mirror-workflow.json");
      expect(prompt).not.toMatch(/schemaVersion|manifest/i);
    }
  });

  it("keep the origin prohibitions, which were never about workflow", () => {
    for (const prompt of [teaching, redraw]) {
      expect(flat(prompt)).toMatch(/do not draw from our conversation/i);
      expect(flat(prompt)).toMatch(/memory of earlier sessions/i);
      expect(flat(prompt)).toMatch(/old transport files/i);
      expect(flat(prompt)).toMatch(/shape of the directory tree/i);
      expect(flat(prompt)).toMatch(/do not change anything else in this Journey/i);
    }
  });

  it("keep the language anchor and the prohibition on translating into English", () => {
    for (const prompt of [teaching, redraw]) {
      expect(prompt).toContain(briefing);
      expect(prompt).toMatch(/language of/i);
      expect(prompt).toMatch(/do not translate/i);
      expect(prompt).toMatch(/english/i);
    }
  });

  it("keeps a language rule when the Journey has no description", () => {
    for (const prompt of [
      composeCanvasTeachingPrompt("vida-economica"),
      composeCanvasRedrawPrompt("vida-economica"),
    ]) {
      expect(prompt).toMatch(/do not translate/i);
      expect(prompt).not.toContain("undefined");
    }
  });

  it("forbid links, because ArtifactMarkdown renders none", () => {
    for (const prompt of [teaching, redraw]) {
      expect(flat(prompt)).toMatch(/do not use links of any kind/i);
      expect(flat(prompt)).toMatch(/render as literal text/i);
    }
  });

  it("say the canvas is derived and must never be the only witness to a fact", () => {
    for (const prompt of [teaching, redraw]) {
      expect(flat(prompt)).toMatch(/never let it be the only witness to a fact/i);
      expect(flat(prompt)).toMatch(/replace canvas\.md entirely each time/i);
    }
  });

  it("stay well inside the bound at which the composer truncates silently", () => {
    const longBriefing = "Jornada de teste. ".repeat(400);
    for (const prompt of [
      teaching,
      redraw,
      composeCanvasTeachingPrompt("vida-economica", longBriefing),
      composeCanvasRedrawPrompt("vida-economica", longBriefing),
    ]) {
      expect(prompt.length).toBeGreaterThan(400);
      expect(prompt.length).toBeLessThan(COMPOSER_DRAFT_MAX_CHARS / 2);
    }
  });

  it("bounds the quoted description so it cannot push the prohibitions down the prompt", () => {
    const long = "Jornada de teste. ".repeat(400);
    const bounded = composeCanvasTeachingPrompt("vida-economica", long);
    expect(long.length).toBeGreaterThan(CANVAS_BRIEFING_EXCERPT_MAX_CHARS);
    expect(bounded).toContain(long.slice(0, 80));
    expect(bounded).not.toContain(long);
    expect(bounded).toMatch(/do not translate/i);
    expect(bounded).toMatch(/only witness/i);
  });

  it("name the Journey so the agent knows which one is being discussed", () => {
    for (const prompt of [teaching, redraw]) {
      expect(prompt).toContain("vida-economica");
    }
  });
});

describe("canvas teaching prompt", () => {
  it("captures intent before drawing anything", () => {
    expect(flat(teaching)).toMatch(/before drawing anything, ask me what belongs on it/i);
    // It should also offer its own reading, since the vida-economica agent proved that an agent
    // invited to propose proposes well.
    expect(flat(teaching)).toMatch(/tell me what you think belongs there/i);
  });

  it("asks for standing instructions, and for a pointer from context that actually loads", () => {
    expect(flat(teaching)).toMatch(/record that practice in a file named exactly/i);
    expect(teaching).toContain(CANVAS_INSTRUCTIONS_FILE_NAME);
    // Measured: only 22 of 71 Journey roots carry any loader of standing instructions, so a file
    // at the root is durable on disk and inert in practice unless loaded context points at it.
    expect(flat(teaching)).toMatch(/instructions you actually load for this Journey point at/i);
    expect(flat(teaching)).toMatch(/tell me where you put both the file and the pointer/i);
  });

  it("asks for short instructions about what and when, not a specification of form", () => {
    // The same prompt family produced a 5,884 byte contract specifying form, closed vocabulary
    // and ordered stages in vida-economica. That is the error this sentence exists to prevent.
    expect(flat(teaching)).toMatch(/keep it short/i);
    expect(flat(teaching)).toMatch(/what to draw and when to redraw/i);
    expect(teaching).not.toMatch(/closed vocabulary|ordered stages|sources of truth/i);
  });

  it("does not name a genre for the drawing", () => {
    // The pivot's whole finding: naming the genre is what made a truthful panel look wrong.
    expect(teaching).not.toMatch(/\bworkflow\b/i);
    expect(teaching).not.toMatch(/ordered steps|stages of the work/i);
  });

  it("leaves the shape to the Journey rather than prescribing sections", () => {
    expect(flat(teaching)).toMatch(/the shape is for you and me to decide, not for the app/i);
  });
});

describe("canvas redraw prompt", () => {
  it("sends the agent to the standing instructions rather than carrying them", () => {
    expect(flat(redraw)).toMatch(/read canvas-instructions\.md at the root of this Journey and follow it/i);
  });

  it("asks for a redraw of the whole drawing from the Journey's current files", () => {
    expect(flat(redraw)).toMatch(/rewrite canvas\.md entirely, from this Journey's current files/i);
  });

  it("makes no claim that the drawing is out of date", () => {
    // Without declared sources the app cannot know that, so the prompt must not assert it.
    expect(redraw).not.toMatch(/out of date|stale|no longer current/i);
  });

  it("tells the agent what to do when there are no standing instructions yet", () => {
    expect(flat(redraw)).toMatch(/if canvas-instructions\.md does not exist/i);
  });
});
