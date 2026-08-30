// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"))?.[1] ?? "";
}

describe("rendered message width containment", () => {
  it("allows flex message boundaries to shrink inside the conversation", () => {
    expect(rule(".message-cluster")).toContain("min-width: 0");
    expect(rule(".message-cluster")).toContain("max-width: 100%");
    expect(rule(".message")).toContain("box-sizing: border-box");
    expect(rule(".message")).toContain("max-width: min(900px, 100%)");
    expect(rule(".message")).toContain("min-width: 0");
  });

  it("wraps prose, uninterrupted tokens, paths, and URLs", () => {
    expect(rule(".message-content")).toContain("min-width: 0");
    expect(rule(".message-content")).toContain("overflow-wrap: anywhere");
    expect(rule(".message p")).toContain("overflow-wrap: anywhere");
    expect(rule(".inline-link")).toContain("overflow-wrap: anywhere");
  });

  it("keeps fenced code scrolling inside its own bounded block", () => {
    expect(rule(".message-code-block")).toContain("max-width: 100%");
    expect(rule(".message-code-block")).toContain("overflow: auto");
    expect(rule(".message-code-block code")).toContain("white-space: pre");
  });
});
