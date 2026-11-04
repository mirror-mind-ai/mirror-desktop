import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLAUDE_CODE, ModelProvidersPanel, claudeProgressLabel, disconnectWarning } from "../app/ModelProvidersPanel";
import { parseRuntimeChannelDiagnostic } from "../app/runtimeChannelStorage";
import type { PiProviderStatus } from "../app/piProviders";
import type { PiInstallView } from "../app/PiInstallStep";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/runtimeChannelStorage.ts?raw";
import channelSource from "../../src-tauri/src/runtime_channel.rs?raw";

// CR173: Claude through the Desktop's own copy of Claude Code is one provider among the others. To
// the person, connecting it is one act; the download is that act's progress, not a concept.

const deepseek: PiProviderStatus = { id: "deepseek", name: "DeepSeek", apiKey: true, oauth: false, stored: true, ready: { type: "api_key" } };
const mistral: PiProviderStatus = { id: "mistral", name: "Mistral", apiKey: true, oauth: false, stored: false, ready: null };
const handlers = () => ({ onSignIn: vi.fn(), onAnswer: vi.fn(), onCancel: vi.fn(), onOpenAgain: vi.fn(), onDisconnect: vi.fn(), onReload: vi.fn() });
const claude = (installed: boolean, view: PiInstallView = { kind: "idle" }) => ({ installed, view, onConnect: vi.fn() });
const validated = {
  channel: "user", productName: "Nautilus for Mirror", bundleIdentifier: "ai.mirrormind.nautilus",
  appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.nautilus",
  mirrorHome: "/Users/example/.mirror-minds/example", dbPath: "/Users/example/.mirror-minds/example/memory.db",
  status: "validated", piInstalled: true,
};

describe("Claude in Model providers", () => {
  it("is offered first among the providers to connect, saying what Connect downloads and leaves alone", () => {
    const html = renderToStaticMarkup(<ModelProvidersPanel providers={[deepseek, mistral]} state="ready" claude={claude(false)} {...handlers()} />);
    const another = html.slice(html.indexOf("Connect another provider"));
    expect(another).toMatch(new RegExp(`<option value="${CLAUDE_CODE}"( selected="")?>Claude · through Claude Code</option>`));
    expect(another.indexOf("Claude · through Claude Code")).toBeLessThan(another.indexOf(">Mistral</option>"));
    expect(another).toContain("about 135 MB");
    expect(another).toContain("Your own Claude Code, its plugins and its hooks are left alone");
    expect(another).toContain(">Connect</button>");
    expect(another).not.toContain("Use an API key");
  });

  it("shows Connect's progress in place of the buttons, and a failure with Try again", () => {
    const installing = renderToStaticMarkup(<ModelProvidersPanel providers={[deepseek]} state="ready" {...handlers()}
      claude={claude(false, { kind: "installing", phase: "download", done: 40, total: 107 })} />);
    expect(installing).toContain('<progress max="107" value="40">');
    expect(installing).toContain("Downloading Claude Code · 40 of 107 packages");
    expect(installing).not.toContain(">Connect</button>");
    expect(claudeProgressLabel({ kind: "installing", phase: "check", done: 0, total: 1 })).toBe("Checking that Claude Code starts…");
    const failed = renderToStaticMarkup(<ModelProvidersPanel providers={[deepseek]} state="ready" {...handlers()}
      claude={claude(false, { kind: "failed", message: "Claude Code could not be downloaded." })} />);
    expect(failed).toContain('role="alert">Claude Code could not be downloaded.</p>');
    expect(failed).toContain(">Try again</button>");
  });

  it("once installed, is listed as connected with the Claude sign-in on this Mac, and is no longer offered", () => {
    const html = renderToStaticMarkup(<ModelProvidersPanel providers={[deepseek, mistral]} state="ready" claude={claude(true)} {...handlers()} />);
    const list = html.slice(html.indexOf("<ul"), html.indexOf("</ul>"));
    expect(list).toContain("Claude · through Claude Code");
    expect(list).toContain("Connected · Claude sign-in on this Mac");
    expect(html.slice(html.indexOf("Connect another provider"))).not.toContain("Claude · through Claude Code");
    // It counts as a connection when the last Pi sign-in is about to go.
    expect(disconnectWarning(deepseek, [deepseek], true)).not.toContain("only connected provider");
    expect(disconnectWarning(deepseek, [deepseek], false)).toContain("only connected provider");
  });

  it("is the only Claude block: the separate panel is gone", () => {
    expect(appSource).not.toContain("ClaudeModelsPanel");
    expect(appSource).toMatch(/<ModelProvidersPanel[\s\S]*?claude=\{runtimeChannel\?\.anthropicInstalled !== undefined/);
  });
});

describe("the runtime channel says whether the Desktop's Claude Code is installed", () => {
  it("accepts it on a validated home, and nowhere else", () => {
    expect(parseRuntimeChannelDiagnostic({ ...validated, anthropicInstalled: false }).anthropicInstalled).toBe(false);
    expect(() => parseRuntimeChannelDiagnostic({ ...validated, anthropicInstalled: "yes" })).toThrow();
    expect(() => parseRuntimeChannelDiagnostic({
      channel: "user", productName: "Nautilus for Mirror", bundleIdentifier: "ai.mirrormind.nautilus",
      appDataRoot: "/x", status: "unbound", message: "Choose a home.", anthropicInstalled: true,
    })).toThrow();
    expect(channelSource).toContain("anthropic_installed: Some(self.anthropic_provider.is_some())");
  });

  it("installs through the app, listening to its own progress, and reads the models again after", () => {
    expect(storageSource).toContain('listen<PiInstallProgress>("anthropic-install-progress"');
    expect(storageSource).toContain('await invoke("install_anthropic_provider")');
    const install = appSource.slice(appSource.indexOf("async function connectClaudeCode()"));
    const body = install.slice(0, install.indexOf("\n  }\n"));
    expect(body).toContain("setRuntimeChannel(await inspectRuntimeChannel())");
    expect(body).toContain('setPiModelCatalogState("idle")');
  });
});
