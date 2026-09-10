// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("Journey sidebar brand header", () => {
  it("groups title and version before the separated product descriptor", () => {
    const brand = appSource.slice(appSource.indexOf('<div className="brand-block">'), appSource.indexOf('className="sidebar-toggle-button"'));
    expect(brand.indexOf("<strong>Mirror Desktop")).toBeLessThan(brand.indexOf("<SelfUpdateNotification"));
    expect(brand.indexOf("<SelfUpdateNotification")).toBeLessThan(brand.indexOf("<small>{PRODUCT_DESCRIPTOR}</small>"));
    expect(cssSource).toContain("/* Journey sidebar brand hierarchy contract. */");
    expect(cssSource).toContain("align-items: flex-start;");
    expect(cssSource).toContain(".brand-copy .self-update-chip-wrap {\n  display: block;\n  margin-top: 1px;");
    expect(cssSource).toContain(".brand-copy > small {");
    expect(cssSource).toContain("border-top: 1px solid rgba(var(--ui-accent-rgb), 0.2);");
    expect(cssSource).toContain("padding-top: 5px;");
  });

  it("retains the compact sidebar contract", () => {
    expect(cssSource).toContain(".sidebar-compact .brand-block {");
    expect(cssSource).toContain("flex-direction: column;");
    expect(cssSource).toContain(".sidebar-compact .brand-copy,");
  });
});
