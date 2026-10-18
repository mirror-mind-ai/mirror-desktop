import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource: string = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/**
 * CR162. Field, 2026-10-18: the Canvas's `Estado` column painted over the `Progresso` column —
 * progress bars and counts were covered by the text of the cell to their left.
 *
 * The cause is one pair of declarations repeated in two rules: `max-width: 32rem` with
 * `white-space: nowrap` and no overflow handling. A cell that cannot wrap and cannot grow does not
 * shrink either; it escapes its own box and paints over its neighbour. This is a rendering defect
 * rather than a content one, because no cell length makes it correct — it fires for any cell wider
 * than the cap.
 *
 * Both markdown table renderers carried it. `ArtifactMarkdown` serves the Canvas and the
 * documentation browser; `.message-table-scroll` serves chat messages.
 */
const CELL_RULES = [
  ".artifact-markdown-table-scroll th,\n.artifact-markdown-table-scroll td",
  ".message-table-scroll th,\n.message-table-scroll td",
] as const;

const CODE_RULES = [
  ".artifact-markdown-table-scroll :is(th, td) code",
  ".message-table-scroll :is(th, td) code",
] as const;

/** The declarations of one rule, found by its exact selector text so a sibling rule cannot answer. */
function declarationsOf(selector: string): Record<string, string> {
  const at = cssSource.indexOf(`${selector} {`);
  expect(at, `rule not found: ${selector}`).toBeGreaterThan(-1);
  const open = cssSource.indexOf("{", at);
  const close = cssSource.indexOf("}", open);
  expect(close).toBeGreaterThan(open);
  const entries = cssSource.slice(open + 1, close)
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()] as const;
    });
  return Object.fromEntries(entries);
}

describe("CR162: a markdown table cell wraps instead of painting over its neighbour", () => {
  it("never leaves a capped cell unable to wrap, in either renderer", () => {
    for (const selector of CELL_RULES) {
      const rule = declarationsOf(selector);
      // The defect, stated as the thing that must not come back.
      expect(rule["white-space"], selector).not.toBe("nowrap");
      expect(rule["white-space"], selector).toBe("normal");
      // A single unbreakable token is the case wrapping alone does not solve.
      expect(rule["overflow-wrap"], selector).toBe("break-word");
    }
  });

  /**
   * The negative case. Removing the cap would also stop the collision, by letting the table grow
   * without bound — and the Canvas would become a horizontal scroll with one row per screen. The
   * cap is what makes the column readable; wrapping is what makes it honest.
   */
  it("keeps the column bounded, so the fix is wrapping rather than unbounded growth", () => {
    for (const selector of CELL_RULES) {
      expect(declarationsOf(selector)["max-width"], selector).toBe("32rem");
    }
  });

  /**
   * A progress bar broken across two lines reads as two bars, and a branch name broken mid-token
   * reads as two names. Code spans wrap only when a single token genuinely cannot fit, and keep
   * their own spacing when they do.
   */
  it("keeps a code span from being broken by the new wrapping", () => {
    for (const selector of CODE_RULES) {
      const rule = declarationsOf(selector);
      expect(rule["white-space"], selector).toBe("pre-wrap");
      expect(rule["overflow-wrap"], selector).toBe("break-word");
    }
  });

  /**
   * The theme overrides for these tables change colour only. If one ever sets `white-space`, the
   * repair above would be silently undone for three of the seven themes.
   */
  it("is not undone by a light-theme override", () => {
    for (const scroll of [".artifact-markdown-table-scroll", ".message-table-scroll"]) {
      const overrides = cssSource.split(`) ${scroll}`).slice(1);
      expect(overrides.length, scroll).toBeGreaterThan(0);
      for (const chunk of overrides) {
        const block = chunk.slice(chunk.indexOf("{") + 1, chunk.indexOf("}"));
        expect(block, `${scroll} override`).not.toContain("white-space");
        expect(block, `${scroll} override`).not.toContain("max-width");
      }
    }
  });
});
