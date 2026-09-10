// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("Journey sidebar brand header", () => {
  it("keeps only the aligned product title and version before sidebar controls", () => {
    const brand = appSource.slice(appSource.indexOf('<div className="brand-block">'), appSource.indexOf('className="sidebar-toggle-button"'));
    expect(brand.indexOf("<strong>Mirror Desktop")).toBeLessThan(brand.indexOf("<SelfUpdateNotification"));
    expect(brand).not.toContain('className="development-badge"');
    expect(brand).not.toContain("Journey Navigation");
    expect(brand).not.toContain("PRODUCT_DESCRIPTOR");
    expect(brand).toContain('<span className="sr-only">Development channel</span>');
    expect(appSource.indexOf('className="brand-block"')).toBeLessThan(appSource.indexOf("<JourneySearchControl"));
    expect(cssSource).toContain("/* Journey sidebar brand hierarchy contract. */");
    expect(cssSource).toContain("align-items: flex-start;");
    expect(cssSource).toContain("margin: 2px 4px 12px;");
    expect(cssSource).toContain(".brand-copy .self-update-chip-wrap {\n  display: block;\n  margin-top: 1px;");
    expect(cssSource).not.toContain(".brand-copy > small {");
  });

  it("retains the compact sidebar contract", () => {
    expect(cssSource).toContain(".sidebar-compact .brand-block {");
    expect(cssSource).toContain("flex-direction: column;");
    expect(cssSource).toContain(".sidebar-compact .brand-copy,");
  });
});
