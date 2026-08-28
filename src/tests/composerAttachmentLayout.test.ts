// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

 describe("composer attachment action layout", () => {
  it("reserves footer width for both context and send controls", () => {
    const footer = css.match(/\.composer-runtime-footer\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(footer).toContain("right: 104px");
    expect(css).toContain(".composer-inline-actions");
    expect(css).toContain("gap: 8px");
  });
});
