import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import {
  applicationThemeGroups,
  applicationThemes,
  lightApplicationThemes,
  parseApplicationTheme,
} from "../domain/applicationTheme";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
} from "../domain/journeyPreferencePersistence";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(left: string, right: string): number {
  const [bright, dark] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}

describe("application themes", () => {
  it("offers only curated named dark and daytime-light palette groups", () => {
    expect(applicationThemes.map(({ id, label, family }) => ({ id, label, family }))).toEqual([
      { id: "channel", label: "Default", family: "dark" },
      { id: "tide", label: "Tide", family: "dark" },
      { id: "violet", label: "Violet", family: "dark" },
      { id: "ember", label: "Ember", family: "dark" },
      { id: "forest", label: "Forest", family: "dark" },
      { id: "slate", label: "Slate", family: "dark" },
      { id: "daylight", label: "Daylight", family: "light" },
      { id: "mist", label: "Mist", family: "light" },
      { id: "parchment", label: "Parchment", family: "light" },
    ]);
    expect(applicationThemes.every((theme) => theme.colors.length === 3)).toBe(true);
    expect(applicationThemeGroups.map(({ family, label, themes }) => ({
      family,
      label,
      themeIds: themes.map(({ id }) => id),
    }))).toEqual([
      { family: "dark", label: "Dark", themeIds: ["channel", "tide", "violet", "ember", "forest", "slate"] },
      { family: "light", label: "Light", themeIds: ["daylight", "mist", "parchment"] },
    ]);
  });

  it("declares accessible light-theme semantic contrast on actual surfaces", () => {
    expect(lightApplicationThemes.map(({ id }) => id)).toEqual(["daylight", "mist", "parchment"]);
    expect(lightApplicationThemes.find(({ id }) => id === "daylight")?.tokens).toEqual({
      canvas: "#f6f7f9",
      surface: "#ffffff",
      raisedSurface: "#f0f2f5",
      primaryText: "#1f2937",
      mutedText: "#667085",
      accentText: "#2563eb",
    });
    for (const theme of lightApplicationThemes) {
      expect(contrast(theme.tokens.primaryText, theme.tokens.surface), theme.id).toBeGreaterThanOrEqual(7);
      expect(contrast(theme.tokens.mutedText, theme.tokens.surface), theme.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, theme.tokens.surface), theme.id).toBeGreaterThanOrEqual(4.5);
      expect(cssSource).toContain(`[data-application-theme="${theme.id}"]`);
    }
    expect(cssSource).toContain("--light-surface");
    expect(cssSource).toContain('.app-shell[data-application-theme="daylight"] :where(.accent-teal, .accent-green)');
    expect(cssSource).toContain(".message-copy-ready-block");
    expect(cssSource).toContain(".operational-artifacts-browser");
    expect(cssSource).toContain(".settings-window");
  });

  it("keeps user, agent, and persona glyphs legible inside light-theme avatars", () => {
    expect(contrast("#ffffff", "#344054")).toBeGreaterThanOrEqual(7);
    expect(contrast("#ffffff", "#6941c6")).toBeGreaterThanOrEqual(4.5);
    expect(cssSource).toContain(".message.speaker-user .message-avatar");
    expect(cssSource).toContain(".message.speaker-agent .message-avatar");
    expect(cssSource).toContain(".message.speaker-persona .message-avatar");
  });

  it("round-trips each light theme through bounded channel-local preferences", () => {
    for (const theme of lightApplicationThemes) {
      const payload = createPersistedJourneyPreferences({
        ...defaultJourneyPreferenceState,
        applicationTheme: theme.id,
      }, new Date("2026-09-03T12:00:00.000Z"));
      expect(parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(payload)))?.preferences.applicationTheme).toBe(theme.id);
    }
  });

  it("rejects arbitrary application colors", () => {
    expect(parseApplicationTheme("violet")).toBe("violet");
    expect(parseApplicationTheme("daylight")).toBe("daylight");
    expect(parseApplicationTheme("custom")).toBeUndefined();
    expect(parseApplicationTheme("#ffffff")).toBeUndefined();
  });

  it("keeps grouped Appearance in Settings while tab construction remains outside this CR", () => {
    expect(appSource).toContain('aria-label="Application appearance"');
    expect(appSource).toContain('aria-label={`${group.label} themes`}');
    expect(appSource).toContain('role="radiogroup"');
    expect(appSource).toContain('aria-label="Restore default theme"');
    expect(appSource).not.toContain("Channel default");
    expect(appSource).toContain("data-application-theme={applicationTheme}");
    expect(appSource).not.toContain('role="tablist"');
  });
});
