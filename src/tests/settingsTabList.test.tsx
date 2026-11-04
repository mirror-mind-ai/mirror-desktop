import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { nextSettingsTab, SettingsTabList } from "../app/SettingsTabList";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("Settings tabs", () => {
  // CR175 regrouped the tabs by intent; `cr175SettingsByIntent.test.tsx` holds what each one contains.
  it("renders seven owned, accessible tabs with roving focus", () => {
    const html = renderToStaticMarkup(<SettingsTabList selected="models" onSelect={() => undefined} />);
    expect(html).toContain('role="tablist"');
    // CV-012.DS-001 added Extensions: six became seven.
    expect(html.match(/role="tab"/g)).toHaveLength(7);
    expect(html).toContain("Sound &amp; Voice");
    expect(html).toContain("Diagnostics");
    expect(html).toContain('aria-controls="settings-panel-models"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("wraps arrow navigation and supports Home and End", () => {
    expect(nextSettingsTab("models", "ArrowLeft")).toBe("diagnostics");
    expect(nextSettingsTab("diagnostics", "ArrowRight")).toBe("models");
    expect(nextSettingsTab("voice", "ArrowRight")).toBe("extensions");
    expect(nextSettingsTab("you", "Home")).toBe("models");
    expect(nextSettingsTab("mirror", "End")).toBe("diagnostics");
    expect(nextSettingsTab("mirror", "Enter")).toBe("mirror");
  });

  it("keeps each Settings concern in one explicit panel", () => {
    for (const id of ["models", "mirror", "you", "voice", "extensions", "updates", "diagnostics"]) {
      expect(appSource).toContain(`settingsTab === "${id}"`);
      expect(appSource).toContain(`id="settings-panel-${id}"`);
    }
  });

  it("gives light-theme tabs explicit readable default, interactive, and selected colors", () => {
    expect(cssSource).toContain("/* Light-theme Settings tab contrast contract. */");
    expect(cssSource).toContain("color: var(--light-text);");
    expect(cssSource).toContain("color: var(--light-accent);");
    expect(cssSource).toContain("outline: 2px solid var(--light-accent)");
  });
});
