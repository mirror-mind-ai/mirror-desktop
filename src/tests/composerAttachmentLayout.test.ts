// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"))?.[1] ?? "";
}

describe("composer bottom layout", () => {
  it("keeps metadata and actions in a dedicated row outside the textarea", () => {
    expect(rule(".composer-input-footer")).toContain("display: flex");
    expect(rule(".composer-runtime-footer")).not.toContain("position: absolute");
    expect(rule(".composer-inline-actions")).not.toContain("position: absolute");
    expect(rule(".composer-input-wrap textarea")).toContain("padding: 18px");
  });

  it("gives the active runtime status its own conversation-boundary surface", () => {
    expect(rule(".composer-runtime-status")).toContain("border-radius");
    expect(rule(".composer-runtime-status")).toContain("min-height");
  });
});
