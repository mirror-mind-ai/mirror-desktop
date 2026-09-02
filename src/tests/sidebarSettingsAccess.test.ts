import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("global sidebar actions", () => {
  it("keeps icon-only Settings and New Journey actions in the persistent footer", () => {
    expect(appSource).toContain('className="sidebar-footer"');
    expect(appSource).toContain('className="sidebar-action-button"');
    expect(appSource).toContain('onClick={() => setSettingsOpen(true)}');
    expect(appSource).toContain('aria-label="Open settings"');
    expect(appSource).toContain('aria-label="Create new Journey"');
    expect(appSource).toContain("defaultNewJourneyParentId(journeyListOrder, pinnedOnly, selectedJourney)");
  });

  it("exposes a persistent compact rail toggle", () => {
    expect(appSource).toContain('className="sidebar-toggle-button"');
    expect(appSource).toContain("sidebarToggleLabel(sidebarCompact)");
    expect(appSource).toContain('sidebarCompact ? "sidebar-compact" : ""');
  });
});
