import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { nextSettingsTab, SettingsTabList } from "../app/SettingsTabList";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("Settings tabs", () => {
  it("renders four owned, accessible tabs with roving focus", () => {
    const html = renderToStaticMarkup(<SettingsTabList selected="appearance" onSelect={() => undefined} />);
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toContain("User Profile");
    expect(html).toContain('aria-controls="settings-panel-appearance"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("wraps arrow navigation and supports Home and End", () => {
    expect(nextSettingsTab("appearance", "ArrowLeft")).toBe("runtime");
    expect(nextSettingsTab("runtime", "ArrowRight")).toBe("appearance");
    expect(nextSettingsTab("appearance", "ArrowRight")).toBe("user-profile");
    expect(nextSettingsTab("user-profile", "ArrowRight")).toBe("agent");
    expect(nextSettingsTab("runtime", "Home")).toBe("appearance");
    expect(nextSettingsTab("appearance", "End")).toBe("runtime");
    expect(nextSettingsTab("agent", "Enter")).toBe("agent");
  });

  it("keeps each existing Settings concern in one explicit panel", () => {
    expect(appSource).toContain('settingsTab === "appearance"');
    expect(appSource).toContain('settingsTab === "user-profile"');
    expect(appSource).toContain('settingsTab === "agent"');
    expect(appSource).toContain('settingsTab === "runtime"');
    expect(appSource).toContain('id="settings-panel-appearance"');
    expect(appSource).toContain('id="settings-panel-user-profile"');
    expect(appSource).toContain('id="settings-panel-agent"');
    expect(appSource).toContain('id="settings-panel-runtime"');
  });

  it("gives light-theme tabs explicit readable default, interactive, and selected colors", () => {
    expect(cssSource).toContain("/* Light-theme Settings tab contrast contract. */");
    expect(cssSource).toContain("color: var(--light-text);");
    expect(cssSource).toContain("color: var(--light-accent);");
    expect(cssSource).toContain("outline: 2px solid var(--light-accent)");
  });
});
