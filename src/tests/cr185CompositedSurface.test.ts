import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/**
 * CR185: without the Screenshots instrument, a turn drew 35 frames per second with scripts under
 * 1% of the main thread, while the layer-tree flush took about 9 ms of every frame. The frames are
 * driven by the infinite indicator animations, and each flush walked every row of the chapter.
 */
// The first rule whose selector list names `selector`, grouped or alone.
function rule(selector: string): string {
  const match = new RegExp(`(^|\\n)${selector.replace(/[.*]/g, "\\$&")}(,\\n[^{]*)? \\{`).exec(cssSource);
  expect(match, selector).not.toBeNull();
  return cssSource.slice(match!.index, cssSource.indexOf("}", match!.index));
}

// Shown only while the Navigator dictates, never during a turn.
const OUTSIDE_A_TURN = new Set(["voice-recording-pulse"]);

function keyframes(name: string): string {
  const at = cssSource.indexOf(`@keyframes ${name} {`);
  expect(at, name).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = cssSource.indexOf("{", at); index < cssSource.length; index += 1) {
    if (cssSource[index] === "{") depth += 1;
    if (cssSource[index] === "}") { depth -= 1; if (depth === 0) return cssSource.slice(at, index + 1); }
  }
  throw new Error(`unterminated @keyframes ${name}`);
}

describe("CR185: the page does less on every frame of a turn", () => {
  it("animates only opacity and transform in every infinite animation, so none repaints a frame", () => {
    const names = [...cssSource.matchAll(/animation:\s*([a-z0-9-]+)[^;]*\binfinite\b/g)].map((match) => match[1]!);
    expect(names).toContain("journey-agent-working");
    for (const name of new Set(names.filter((name) => !OUTSIDE_A_TURN.has(name)))) {
      const properties = [...keyframes(name).matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
      expect(properties.filter((property) => property !== "opacity" && property !== "transform"), name)
        .toEqual([]);
    }
  });

  it("keeps the Working glow, carried by a layer that only fades", () => {
    for (const host of [".journey-agent-status.working", ".focused-conversation-work.working"]) {
      const glow = rule(`${host}::after`);
      expect(glow).toContain("animation: journey-agent-working");
      expect(glow).toContain("box-shadow:");
      expect(rule(host)).not.toContain("animation:");
    }
    const reduced = cssSource.slice(cssSource.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced.slice(0, reduced.indexOf("}\n}"))).toContain(".journey-agent-status.working::after");
  });

  it("lets the transcript skip rows that are off screen", () => {
    expect(rule(".conversation-row")).toContain("content-visibility: auto");
    expect(rule(".conversation-row")).toContain("contain-intrinsic-size: auto");
    expect(transcriptSource.match(/className=\{?[`"]conversation-row/g)).toHaveLength(2);
  });
});
