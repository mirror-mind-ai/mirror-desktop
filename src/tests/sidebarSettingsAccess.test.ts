import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("global settings access", () => {
  it("keeps settings in the persistent Journey sidebar footer", () => {
    expect(appSource).toContain('className="sidebar-footer"');
    expect(appSource).toContain('className="sidebar-settings-button"');
    expect(appSource).toContain('onClick={() => setSettingsOpen(true)}');
    expect(appSource).toContain('aria-label="Open settings"');
  });
});
