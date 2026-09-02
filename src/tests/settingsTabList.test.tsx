import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { nextSettingsTab, SettingsTabList } from "../app/SettingsTabList";
import appSource from "../app/App.tsx?raw";

describe("Settings tabs", () => {
  it("renders three owned, accessible tabs with roving focus", () => {
    const html = renderToStaticMarkup(<SettingsTabList selected="appearance" onSelect={() => undefined} />);
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain('aria-controls="settings-panel-appearance"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("wraps arrow navigation and supports Home and End", () => {
    expect(nextSettingsTab("appearance", "ArrowLeft")).toBe("runtime");
    expect(nextSettingsTab("runtime", "ArrowRight")).toBe("appearance");
    expect(nextSettingsTab("runtime", "Home")).toBe("appearance");
    expect(nextSettingsTab("appearance", "End")).toBe("runtime");
    expect(nextSettingsTab("agent", "Enter")).toBe("agent");
  });

  it("keeps each existing Settings concern in one explicit panel", () => {
    expect(appSource).toContain('settingsTab === "appearance"');
    expect(appSource).toContain('settingsTab === "agent"');
    expect(appSource).toContain('settingsTab === "runtime"');
    expect(appSource).toContain('id="settings-panel-appearance"');
    expect(appSource).toContain('id="settings-panel-agent"');
    expect(appSource).toContain('id="settings-panel-runtime"');
  });
});
