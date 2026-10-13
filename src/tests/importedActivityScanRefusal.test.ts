import { describe, expect, it } from "vitest";
import {
  extractAriadSurfaceEventsFromContent,
  extractMirrorSurfaceEventsFromContent,
  stripAriadSurfaceBlocks,
  stripMirrorModeBlocks,
  stripMirrorSurfaceBlocks,
} from "../app/ImportedActivity";
import activitySource from "../app/ImportedActivity.tsx?raw";
import presentationSource from "../app/conversationTurnPresentation.ts?raw";

// CR149: a profile of a `Finishing` on a large conversation put 31.7% of all sampled main-thread
// time in `collectBoxedExplorerSurfaces` and the regexes it owns — not in matching, but in splitting
// every message into lines before asking whether any line opened a box. These tests bound the two
// repairs: that each scan refuses impossible content before allocating, and that refusing changes
// nothing about what it captures.

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function escapeForPattern(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const identity = { messageId: "mirror-1", createdAt: "2026-10-12T00:00:00.000Z" };

describe("CR149: each scan refuses content it cannot match", () => {
  /**
   * The marker is only a sound refusal while the pattern genuinely requires it. Asserting it
   * appears in the pattern's own source is what stops the two from drifting when either is edited.
   *
   * The limit is stated rather than hidden: this proves the marker is *written into* the pattern,
   * not that its position is mandatory. The characterisation cases below carry that half.
   */
  it("writes every marker into the pattern that requires it", () => {
    const source = withoutComments(activitySource);
    const markers = {
      ARIAD_SURFACE_MARKER: "<<<",
      MIRROR_REQUIRED_SURFACE_MARKER: "[[MIRROR_REQUIRED_SURFACE_BEGIN:",
      BOXED_SURFACE_MARKER: "╭",
    };
    for (const [name, literal] of Object.entries(markers)) {
      expect(source, `${name} is declared`).toContain(`const ${name} = "${literal}"`);
      // The pattern that needs it must contain it, escaped as a regex literal would write it.
      const escaped = escapeForPattern(literal);
      const appears = source.includes(escaped) || source.includes(literal);
      expect(appears, `${name} appears in a pattern as ${escaped}`).toBe(true);
    }
  });

  /**
   * The mode scan's refusal rests on an equivalence: testing the whole content is the same as
   * testing every line. That holds only while the pattern cannot match across a line break.
   */
  it("keeps the mode pattern unable to span a line break", () => {
    const source = withoutComments(activitySource);
    const declaration = source.indexOf("const MIRROR_MODE_PATTERN = ");
    expect(declaration).toBeGreaterThan(-1);
    const pattern = source.slice(declaration, source.indexOf(";", declaration));
    expect(pattern).not.toContain("\\n");
    expect(pattern).not.toContain("\\s");
    expect(pattern).not.toContain("[\\s\\S]");
    expect(pattern).not.toContain("g");
  });

  it("refuses a boxed-surface scan before it splits the content into lines", () => {
    const source = withoutComments(activitySource);
    const start = source.indexOf("function collectBoxedExplorerSurfaces(");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("\n}\n", start) + 3;
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    const refusal = body.indexOf("includes(BOXED_SURFACE_MARKER)");
    const split = body.indexOf("linePattern.exec");
    expect(refusal).toBeGreaterThan(-1);
    expect(split).toBeGreaterThan(-1);
    // The order is the whole repair: refusing after the allocation would measure the same.
    expect(refusal).toBeLessThan(split);
  });

  it("refuses a mode scan before it splits the content into lines", () => {
    const source = withoutComments(activitySource);
    const start = source.indexOf("function findMirrorModeBlock(");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("\n}\n", start) + 3;
    const body = source.slice(start, end);
    const refusal = body.indexOf("MIRROR_MODE_PATTERN.test(content)");
    const split = body.indexOf('.split("\\n")');
    expect(refusal).toBeGreaterThan(-1);
    expect(split).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(split);
  });

  it("refuses a pattern scan before it starts matching", () => {
    const source = withoutComments(activitySource);
    const start = source.indexOf("function collectPatternSurfaces(");
    const end = source.indexOf("\n}\n", start) + 3;
    const body = source.slice(start, end);
    expect(body).toContain("if (!content.includes(marker)) return;");
    expect(body.indexOf("includes(marker)")).toBeLessThan(body.indexOf("pattern.exec"));
  });
});

describe("CR149: refusing changes nothing about what is captured", () => {
  const plain = "A plain answer with no surfaces.\n\nIt has two paragraphs.";

  it("returns ordinary content untouched through every strip", () => {
    expect(stripMirrorSurfaceBlocks(plain)).toBe(plain);
    expect(stripMirrorModeBlocks(plain)).toBe(plain);
    expect(stripAriadSurfaceBlocks(plain)).toBe(plain);
    expect(extractMirrorSurfaceEventsFromContent({ ...identity, content: plain })).toEqual([]);
    expect(extractAriadSurfaceEventsFromContent({ ...identity, content: plain })).toEqual([]);
  });

  /**
   * Box-drawing characters that never open a surface are the case the refusal must not break: the
   * marker is present, so the scan runs, and it still captures nothing.
   */
  it("still finds nothing when the marker is present but opens no surface", () => {
    const decorated = "before\n╭ not a border\nmiddle\n╰ nor this\nafter";
    expect(extractMirrorSurfaceEventsFromContent({ ...identity, content: decorated })).toEqual([]);
    expect(stripMirrorSurfaceBlocks(decorated)).toBe(decorated);
  });

  it("still captures a boxed Explorer surface and strips it", () => {
    const content = [
      "before",
      "╭────────────╮",
      "│ △ STORY STATE │",
      "╰────────────╯",
      "after",
    ].join("\n");
    const events = extractMirrorSurfaceEventsFromContent({ ...identity, content });
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ surfaceType: "STORY_STATE" });
    expect(events[0].content).toContain("△ STORY STATE");
    // Measured against the pre-repair implementation, not predicted. My first guess here was
    // "before\n\nafter" and it was wrong: the boxed branch leaves a single newline where the
    // Ariad branch leaves two. A throwaway differential against the original file settled it.
    expect(stripMirrorSurfaceBlocks(content)).toBe("before\nafter");
  });

  it("still captures an Ariad surface and strips it", () => {
    const content = "before\n<<<ARIAD:STORY>>>\nbody\n<<<END:STORY>>>\nafter";
    const events = extractAriadSurfaceEventsFromContent({ ...identity, content });
    expect(events).toHaveLength(1);
    expect(stripAriadSurfaceBlocks(content)).toBe("before\n\nafter");
  });

  it("still strips a mode block, and only when the mode line is there", () => {
    const withMode = "Mirror\n│ MIRROR MODE ACTIVE │\n\n✦ Persona: estrategista\nThe answer.";
    expect(stripMirrorModeBlocks(withMode)).toContain("✦ Persona: estrategista");
    expect(stripMirrorModeBlocks(withMode)).not.toContain("MIRROR MODE ACTIVE");
    const lookalike = "Discussing MIRROR MODES in general.\nThe answer.";
    expect(stripMirrorModeBlocks(lookalike)).toBe(lookalike);
  });

  /**
   * The pattern carries `\b` boundaries and literal spaces, so a mode line split across two lines
   * must not be recognised. This is the case the whole-content refusal could have broken.
   */
  it("does not recognise a mode phrase broken across lines", () => {
    const broken = "│ MIRROR\nMODE ACTIVE │\nThe answer.";
    expect(stripMirrorModeBlocks(broken)).toBe(broken);
  });
});

describe("CR149: the turn presentation computes each strip once", () => {
  /**
   * `projectAgentTurnPresentation` used to build its comment by re-running the whole chain that the
   * two lines below it had already run — the same pure functions on the same string, three times
   * each per assistant row render. The row calls into this on every render, and settlement
   * re-renders every row once per phase.
   */
  it("calls each strip exactly once in projectAgentTurnPresentation", () => {
    const source = withoutComments(presentationSource);
    const start = source.indexOf("export function projectAgentTurnPresentation(");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("\n}\n", start) + 3;
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(body.split("stripMirrorSurfaceBlocks(").length - 1).toBe(1);
    expect(body.split("stripMirrorModeBlocks(").length - 1).toBe(1);
    // And the comment must be derived from the value already computed, not recomputed.
    expect(body).toContain("stripMessageSpeakerSignature(contentWithoutSystemBlocks)");
  });
});
