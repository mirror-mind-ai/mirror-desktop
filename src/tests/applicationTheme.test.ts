import { describe, expect, it } from "vitest";
import { applicationThemes, parseApplicationTheme } from "../domain/applicationTheme";
import appSource from "../app/App.tsx?raw";

describe("application themes", () => {
  it("offers only the curated, named and previewable palette set", () => {
    expect(applicationThemes.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "channel", label: "Default" },
      { id: "tide", label: "Tide" },
      { id: "violet", label: "Violet" },
      { id: "ember", label: "Ember" },
      { id: "forest", label: "Forest" },
      { id: "slate", label: "Slate" },
    ]);
    expect(applicationThemes.every((theme) => theme.colors.length === 3)).toBe(true);
  });

  it("rejects arbitrary application colors", () => {
    expect(parseApplicationTheme("violet")).toBe("violet");
    expect(parseApplicationTheme("custom")).toBeUndefined();
    expect(parseApplicationTheme("#ffffff")).toBeUndefined();
  });

  it("keeps Appearance in Settings while tab construction remains outside this CR", () => {
    expect(appSource).toContain('aria-label="Application appearance"');
    expect(appSource).toContain('role="radiogroup"');
    expect(appSource).toContain('aria-label="Restore default theme"');
    expect(appSource).not.toContain("Channel default");
    expect(appSource).toContain("data-application-theme={applicationTheme}");
    expect(appSource).not.toContain('role="tablist"');
  });
});
