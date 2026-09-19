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

function mixHex(foreground: string, background: string, foregroundWeight: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const front = Number.parseInt(foreground.slice(offset, offset + 2), 16);
    const back = Number.parseInt(background.slice(offset, offset + 2), 16);
    return Math.round(front * foregroundWeight + back * (1 - foregroundWeight)).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
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
    expect(cssSource).toContain(") .restart-assurances {");
  });

  it("keeps Mist cool-blue and Parchment warm while making Journey ordering readable", () => {
    const mist = lightApplicationThemes.find(({ id }) => id === "mist")!;
    const parchment = lightApplicationThemes.find(({ id }) => id === "parchment")!;
    expect(mist.tokens.accentText).toBe("#285d91");
    expect(parchment.tokens.accentText).toBe("#6e4d25");

    for (const theme of [mist, parchment]) {
      const selectedSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.11);
      expect(contrast(theme.tokens.mutedText, theme.tokens.surface), `${theme.id} unselected`)
        .toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, selectedSurface), `${theme.id} selected`)
        .toBeGreaterThanOrEqual(4.5);
    }

    expect(cssSource).toContain("/* Mist and Parchment semantic chroma contract. */");
    expect(cssSource).toContain('[data-application-theme="mist"] :where(.accent-teal, .accent-green)');
    expect(cssSource).toContain('[data-application-theme="parchment"] :where(.accent-teal, .accent-green)');
    expect(cssSource).toContain("/* Light Journey ordering contrast contract. */");
    expect(cssSource).toContain(".journey-order-control button:not(.selected):hover");
    expect(cssSource).toContain(".journey-order-control button.selected");
    expect(cssSource).toContain("inset 0 -3px 0 var(--light-accent)");
    expect(cssSource).toContain(".journey-order-control button:focus-visible");
    expect(cssSource).toContain(".composer-active-mode span");
  });

  it("keeps user, agent, persona, and activity badges legible in light themes", () => {
    for (const theme of lightApplicationThemes) {
      expect(contrast("#ffffff", theme.tokens.accentText), theme.id).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(theme.tokens.accentText, mixHex(theme.tokens.accentText, theme.tokens.surface, 0.08)),
        theme.id,
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("#ffffff", "#344054")).toBeGreaterThanOrEqual(7);
    expect(contrast("#ffffff", "#6941c6")).toBeGreaterThanOrEqual(4.5);
    expect(cssSource).toContain(".message.speaker-user .message-avatar");
    expect(cssSource).toContain(".conversation-turn-panel .message-avatar:not(.has-custom-user-avatar)");
    expect(cssSource).toContain(".message.speaker-agent .message-avatar");
    expect(cssSource).toContain(".message.speaker-persona .message-avatar");
  });

  it("gives light-theme workspace tabs structural and textual contrast", () => {
    for (const theme of lightApplicationThemes) {
      const selectedSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.09);
      expect(contrast(theme.tokens.accentText, selectedSurface), theme.id).toBeGreaterThanOrEqual(4.5);
    }
    expect(cssSource).toContain("/* Light workspace tab contrast contract. */");
    expect(cssSource).toContain(".operational-workspace-option.selected");
    expect(cssSource).toContain("inset 0 -3px 0 var(--light-accent)");
    expect(cssSource).toContain(".operational-workspace-option:focus-visible");
    expect(cssSource).toContain("outline: 3px solid var(--light-accent)");
    expect(cssSource).toContain(".operational-workspace-option:disabled");
  });

  it("keeps post-start Journey suggestion labels legible in light themes", () => {
    for (const theme of lightApplicationThemes) {
      const idleSurface = mixHex(theme.tokens.raisedSurface, theme.tokens.surface, 0.72);
      const interactiveSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.08);
      expect(contrast(theme.tokens.primaryText, idleSurface), `${theme.id} idle`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, interactiveSurface), `${theme.id} interactive`).toBeGreaterThanOrEqual(4.5);
    }
    expect(cssSource).toContain("/* Light Journey arrival suggestion contrast contract. */");
    expect(cssSource).toContain(") .journey-arrival-suggestions button {");
    expect(cssSource).toContain("color: var(--light-text);");
    expect(cssSource).toContain(") .journey-arrival-suggestions button:hover,");
    expect(cssSource).toContain("color: var(--light-accent);");
  });

  it("keeps Journey search, sidebar collapse, and pending-file interactions legible in light themes", () => {
    for (const theme of lightApplicationThemes) {
      const searchSummarySurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.08);
      const pendingFileSurface = mixHex(theme.tokens.raisedSurface, theme.tokens.surface, 0.72);
      expect(contrast(theme.tokens.primaryText, theme.tokens.surface), `${theme.id} active search`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.primaryText, searchSummarySurface), `${theme.id} search summary`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, searchSummarySurface), `${theme.id} search clear`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, theme.tokens.raisedSurface), `${theme.id} collapse control`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.primaryText, pendingFileSurface), `${theme.id} attachment title`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.mutedText, pendingFileSurface), `${theme.id} attachment metadata`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, pendingFileSurface), `${theme.id} attachment action`).toBeGreaterThanOrEqual(4.5);
    }
    expect(cssSource).toContain("/* Light search and pending-file interaction contrast contract. */");
    expect(cssSource).toContain(") .journey-search-control.is-active .sidebar-search {");
    expect(cssSource).toContain(") .journey-search-summary button {");
    expect(cssSource).toContain(") .sidebar-toggle-button {");
    expect(cssSource).toContain(") .pending-files {");
    expect(cssSource).toContain(") :is(.pending-files > header button, .remove-file-button) {");
    expect(cssSource).toContain(") .file-path-button {");
  });

  it("keeps the Journey Conversation expansion arrow visible in light themes", () => {
    for (const theme of lightApplicationThemes) {
      const interactiveSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.08);
      expect(contrast(theme.tokens.accentText, theme.tokens.raisedSurface), `${theme.id} idle expansion arrow`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, interactiveSurface), `${theme.id} active expansion arrow`).toBeGreaterThanOrEqual(4.5);
    }
    expect(cssSource).toContain("/* Light Journey Conversation expansion contrast contract. */");
    expect(cssSource).toContain(") .journey-conversation-toggle {");
    expect(cssSource).toContain("background: var(--light-raised);");
    expect(cssSource).toContain("color: var(--light-accent);");
    expect(cssSource).toContain(") .journey-conversation-toggle[aria-expanded=\"true\"] {");
    expect(cssSource).toContain("box-shadow: inset 0 -2px 0 var(--light-accent);");
    expect(cssSource).toContain(") .journey-conversation-toggle:is(:hover, :focus-visible) {");
    expect(cssSource).toContain("outline: 2px solid var(--light-accent);");
    expect(cssSource).toContain(") .journey-conversation-toggle:disabled {");
    expect(cssSource).toContain("border-style: dashed;");
  });

  it("keeps expanded focused Conversation lists legible in light themes", () => {
    for (const theme of lightApplicationThemes) {
      const listSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.06);
      const selectedSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.09);
      const createSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.09);
      const createHoverSurface = mixHex(theme.tokens.accentText, theme.tokens.surface, 0.08);
      expect(contrast(theme.tokens.primaryText, listSurface), `${theme.id} conversation list title`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.mutedText, listSurface), `${theme.id} conversation list metadata`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.primaryText, selectedSurface), `${theme.id} selected conversation title`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, createSurface), `${theme.id} new conversation action`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.tokens.accentText, createHoverSurface), `${theme.id} new conversation hover`).toBeGreaterThanOrEqual(4.5);
    }
    expect(cssSource).toContain(".focused-conversation-entry, .focused-conversation-create, .focused-conversation-more" );
    expect(cssSource).toContain("/* Light focused Conversation list contrast contract. */");
    expect(cssSource).toContain(") .focused-conversation-sidebar {");
    expect(cssSource).toContain("color: var(--light-text);");
    expect(cssSource).toContain(") .focused-conversation-entry small,");
    expect(cssSource).toContain(") .focused-conversation-entry.selected {");
    expect(cssSource).toContain("box-shadow: inset 3px 0 0 var(--light-accent);");
    expect(cssSource).toContain(") button.focused-conversation-create {");
    expect(cssSource).toContain(") .focused-conversation-create span {");
    expect(cssSource).toContain(") button.focused-conversation-create:is(:hover, :focus-visible) {");
  });

  it("keeps generation-ready notices legible in light themes", () => {
    for (const theme of lightApplicationThemes) {
      const noticeSurface = mixHex(theme.tokens.accentText, theme.tokens.canvas, 0.1);
      expect(contrast(theme.tokens.primaryText, noticeSurface), `${theme.id} generation-ready notice`)
        .toBeGreaterThanOrEqual(4.5);
    }
    expect(cssSource).toContain("/* Light generation-ready notice contrast contract. */");
    expect(cssSource).toContain(") .journey-reload-status {");
    expect(cssSource).toContain("color: var(--light-text);");
  });

  it("keeps the completed composer status legible in light themes", () => {
    expect(cssSource).toContain("/* Light composer status contrast contract. */");
    expect(cssSource).toContain(".composer-runtime-status.is-finishing");
    expect(cssSource).toContain("box-shadow: inset 3px 0 0 var(--light-accent)");
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
