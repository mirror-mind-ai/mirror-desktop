import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";
import { settingsTabs } from "../app/SettingsTabList";
import { OperationalWorkspaceSwitcher } from "../app/OperationalWorkspaceSwitcher";
import { ExtensionsSettings } from "../app/ExtensionsSettings";
import { normalizeJourneySurfaceSelection } from "../app/journeySurfaceAvailability";
import { DEFAULT_APP_EXTENSIONS, parseAppExtensions } from "../domain/appExtensions";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
} from "../domain/journeyPreferencePersistence";

/**
 * CV-012.DS-001 (Navigator, 2026-11-04): the app launches with only its canonical set. The Agent
 * Field (until now the Context Map) and the Agent Canvas become the first extensions, off by
 * default and turned on in Settings › Extensions, which bridges what exists to the extension
 * mechanism still being built.
 */
describe("CV-012.DS-001 the extensions a person can turn on", () => {
  it("are both off by default", () => {
    expect(DEFAULT_APP_EXTENSIONS).toEqual({ agentField: false, agentCanvas: false });
    expect(defaultJourneyPreferenceState.extensions).toEqual({ agentField: false, agentCanvas: false });
  });

  it("degrade to off one by one, and a bad value costs nothing else", () => {
    expect(parseAppExtensions({ agentField: true, agentCanvas: "yes" })).toEqual({ agentField: true, agentCanvas: false });
    expect(parseAppExtensions(undefined)).toEqual(DEFAULT_APP_EXTENSIONS);
    const saved = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState, extensions: { agentField: true, agentCanvas: true }, sidebarCompact: true });
    expect(parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(saved)))?.preferences.extensions)
      .toEqual({ agentField: true, agentCanvas: true });
    const broken = { ...saved, preferences: { ...saved.preferences, extensions: 7 } };
    const parsed = parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(broken)));
    expect(parsed?.preferences.sidebarCompact).toBe(true);
    expect(parsed?.preferences.extensions).toEqual(DEFAULT_APP_EXTENSIONS);
  });
});

describe("CV-012.DS-001 the tabs beside Conversation", () => {
  const render = (extensions: { agentField: boolean; agentCanvas: boolean }) => renderToStaticMarkup(
    <OperationalWorkspaceSwitcher value="chat" onChange={() => undefined} extensions={extensions} />,
  );

  it("are named Agent Field and Agent Canvas, and shown only when turned on", () => {
    const both = render({ agentField: true, agentCanvas: true });
    expect(both).toContain("Agent Field");
    expect(both).toContain("Agent Canvas");
    expect(both).not.toContain("Context Map");
    expect(both).not.toContain("Agent’s Canvas");

    const field = render({ agentField: true, agentCanvas: false });
    expect(field).toContain("Agent Field");
    expect(field).not.toContain("Agent Canvas");
  });

  it("disappear with the switcher when only Conversation is left", () => {
    expect(render(DEFAULT_APP_EXTENSIONS)).toBe("");
  });

  it("send a remembered selection of a turned-off extension back to Conversation", () => {
    expect(normalizeJourneySurfaceSelection("operational", "canvas", DEFAULT_APP_EXTENSIONS).operationalSurface).toBe("chat");
    expect(normalizeJourneySurfaceSelection("operational", "artifacts", { agentField: true, agentCanvas: false }).operationalSurface).toBe("artifacts");
    expect(normalizeJourneySurfaceSelection("operational", "canvas", { agentField: true, agentCanvas: false }).operationalSurface).toBe("chat");
  });

  it("are wired to the person's extensions, and the Canvas is read only while it is shown", () => {
    expect(appSource).toContain("normalizeJourneySurfaceSelection(selectedAltitude, selectedOperationalSurface, extensions)");
    expect(appSource).toMatch(/<OperationalWorkspaceSwitcher[\s\S]{0,200}extensions=\{extensions\}/);
    expect(appSource).toMatch(/const canvasSurfaceSelected = presentedAltitude === "operational"\s*&& presentedOperationalSurface === "canvas";/);
  });

  it("open a Journey document outside the app when the Agent Field is off", () => {
    const handler = appSource.slice(appSource.indexOf("const handleChatLocalPath = useCallback("), appSource.indexOf("await openExternalChatLocalReference(path, ownerBasePath);"));
    expect(handler).toMatch(/disposition\.kind === "journey_document" && extensionsRef\.current\.agentField/);
  });
});

describe("CV-012.DS-001 Settings › Extensions", () => {
  it("is a tab of Settings", () => {
    expect(settingsTabs.map((tab) => tab.label)).toContain("Extensions");
    const panel = appSource.slice(appSource.indexOf('id="settings-panel-extensions"'), appSource.indexOf('settingsTab === "updates"'));
    expect(panel).toContain("<ExtensionsSettings");
  });

  it("says extensions are being built and that these options bridge to them, and toggles each one", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<ExtensionsSettings value={{ agentField: true, agentCanvas: false }} onChange={onChange} />);
    expect(html).toContain("still being built");
    expect(html).toContain("bridge");
    expect(html).toContain("Agent Field");
    expect(html).toContain("Agent Canvas");
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(1);
  });
});
