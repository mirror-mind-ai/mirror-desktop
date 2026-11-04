import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { nextSettingsTab, settingsTabs, SettingsTabList } from "../app/SettingsTabList";
import { ProviderConnectStep } from "../app/ProviderConnectStep";
import { CLAUDE_CODE } from "../app/ModelProvidersPanel";
import type { PiProviderStatus } from "../app/piProviders";
import type { PiInstallView } from "../app/PiInstallStep";
import appSource from "../app/App.tsx?raw";

/**
 * CR175: the tabs followed the parts of the machine (agent, connections, runtime), so models were
 * spoken of in three of them. Each tab now answers one question the person brings.
 */
const PANELS = {
  models: ["<ModelProvidersPanel", 'aria-label="Global agent defaults"', "<ModelIntentsPanel"],
  mirror: ['aria-label="Mirror home"', 'aria-label="Mirror home binding"', 'variant="settings"', "{describeLearning(mirrorLearning)}"],
  you: ['aria-label="Application appearance"', "<UserAvatarSettings"],
  voice: ['aria-label="Turn completion sound"', "<VoiceSettingsPanel"],
  // CV-012.DS-001: the bridge to extensions, a question of its own (what else the app shows).
  extensions: ["<ExtensionsSettings"],
  updates: ["<SelfUpdatePanel"],
  diagnostics: ['aria-label="Runtime channel"', 'aria-label="Current session invocation controls"'],
} as const;

const settingsWindow = appSource.slice(
  appSource.indexOf("<SettingsTabList selected"),
  appSource.indexOf("{journeyAgentProfileOpen ? ("),
);

function panel(id: string): string {
  const at = settingsWindow.indexOf(`id="settings-panel-${id}"`);
  expect(at, id).toBeGreaterThan(0);
  const next = settingsWindow.indexOf("{settingsTab === ", at);
  return settingsWindow.slice(at, next < 0 ? undefined : next);
}

describe("CR175: Settings tabs by intent", () => {
  it("offers Models, Mirror, You, Sound & Voice, Extensions, Updates and Diagnostics, in that order", () => {
    expect(settingsTabs.map((tab) => [tab.id, tab.label])).toEqual([
      ["models", "Models"],
      ["mirror", "Mirror"],
      ["you", "You"],
      ["voice", "Sound & Voice"],
      ["extensions", "Extensions"],
      ["updates", "Updates"],
      ["diagnostics", "Diagnostics"],
    ]);
    const html = renderToStaticMarkup(<SettingsTabList selected="models" onSelect={() => undefined} />);
    expect(html.match(/role="tab"/g)).toHaveLength(7);
    expect(html).toContain('aria-controls="settings-panel-diagnostics"');
  });

  it("walks the new order with the keyboard, wrapping at both ends", () => {
    expect(nextSettingsTab("models", "ArrowRight")).toBe("mirror");
    expect(nextSettingsTab("mirror", "ArrowRight")).toBe("you");
    expect(nextSettingsTab("you", "ArrowRight")).toBe("voice");
    expect(nextSettingsTab("voice", "ArrowRight")).toBe("extensions");
    expect(nextSettingsTab("extensions", "ArrowRight")).toBe("updates");
    expect(nextSettingsTab("updates", "ArrowRight")).toBe("diagnostics");
    expect(nextSettingsTab("diagnostics", "ArrowRight")).toBe("models");
    expect(nextSettingsTab("models", "ArrowLeft")).toBe("diagnostics");
    expect(nextSettingsTab("you", "Home")).toBe("models");
    expect(nextSettingsTab("you", "End")).toBe("diagnostics");
  });

  it("renders each section under the tab its intent names, and in no other", () => {
    for (const [id, markers] of Object.entries(PANELS)) {
      const own = panel(id);
      for (const marker of markers) {
        expect(own, `${marker} in ${id}`).toContain(marker);
        expect(settingsWindow.split(marker).length - 1, `${marker} once`).toBe(1);
      }
    }
    expect(settingsWindow.match(/id="settings-panel-/g)).toHaveLength(7);
  });

  it("puts the person's avatar before the app's appearance in You", () => {
    const you = panel("you");
    expect(you.indexOf("<UserAvatarSettings")).toBeLessThan(you.indexOf('aria-label="Application appearance"'));
  });

  it("opens on Models, and re-reads providers and learning when their tab is shown", () => {
    expect(appSource).toContain('useState<SettingsTab>("models")');
    expect(appSource).toContain('if (!settingsOpen || settingsTab !== "models") return;');
    expect(appSource).toContain('if (settingsTab !== "mirror") return;');
  });

  it("keeps the bound home and its database in Mirror, out of the diagnostic list", () => {
    expect(panel("mirror")).toContain("{runtimeChannel.mirrorHome}");
    expect(panel("mirror")).toContain("{runtimeChannel.dbPath}");
    expect(panel("diagnostics")).not.toContain("{runtimeChannel.mirrorHome}");
    expect(panel("diagnostics")).toContain("{runtimeChannel.bundleIdentifier}");
  });
});

describe("CR175: setup offers Claude through Claude Code", () => {
  const anthropic: PiProviderStatus = { id: "anthropic", name: "Anthropic", apiKey: true, oauth: true, stored: false, ready: null };
  const handlers = () => ({ onSignIn: vi.fn(), onAnswer: vi.fn(), onCancel: vi.fn(), onOpenAgain: vi.fn(), onContinue: vi.fn() });
  const claude = (installed: boolean, view: PiInstallView = { kind: "idle" }) => ({ installed, view, onConnect: vi.fn() });

  it("offers it first, with Connect, when it is not installed", () => {
    const html = renderToStaticMarkup(<ProviderConnectStep providers={[anthropic]} claude={claude(false)} {...handlers()} />);
    expect(html).toMatch(new RegExp(`<option value="${CLAUDE_CODE}" selected="">Claude · through Claude Code</option>`));
    expect(html.indexOf("Claude · through Claude Code")).toBeLessThan(html.indexOf(">Anthropic ·"));
    expect(html).toContain("about 135 MB");
    expect(html).toContain(">Connect</button>");
    expect(html).not.toContain(">Continue</button>");
  });

  it("counts it as connected once installed, so setup can go on without a Pi sign-in", () => {
    const html = renderToStaticMarkup(<ProviderConnectStep providers={[anthropic]} claude={claude(true)} {...handlers()} />);
    expect(html).toContain("Connected: Claude · through Claude Code.");
    expect(html).toContain(">Continue</button>");
    expect(html).not.toContain(`value="${CLAUDE_CODE}"`);
  });

  it("shows Connect's progress in place of the button", () => {
    const html = renderToStaticMarkup(<ProviderConnectStep providers={[anthropic]} {...handlers()}
      claude={claude(false, { kind: "installing", phase: "download", done: 4, total: 10 })} />);
    expect(html).toContain('<progress max="10" value="4">');
    expect(html).not.toContain(">Connect</button>");
  });

  it("is wired in the app: setup passes Claude, and an installed Claude satisfies the provider step", () => {
    const step = appSource.slice(appSource.indexOf("<ProviderConnectStep"));
    expect(step.slice(0, step.indexOf("/>"))).toContain("claude={");
    const needs = appSource.slice(appSource.indexOf("const runtimeSetupNeedsProvider ="));
    expect(needs.slice(0, needs.indexOf(";"))).toContain("runtimeChannel?.anthropicInstalled === true");
  });
});
