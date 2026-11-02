import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ClaudeModelsPanel, claudeModelsProgressLabel } from "../app/ClaudeModelsPanel";
import { parseRuntimeChannelDiagnostic } from "../app/runtimeChannelStorage";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/runtimeChannelStorage.ts?raw";
import channelSource from "../../src-tauri/src/runtime_channel.rs?raw";

// CR173: Claude models are the Desktop's own, installed on demand from Settings: the app's copy of
// Claude Code, with the person's own Claude Code, its plugins and its hooks left out of its turns.

const validated = {
  channel: "user",
  productName: "Mirror Desktop TS",
  bundleIdentifier: "ai.mirrormind.desktop.ts",
  appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.desktop.ts",
  mirrorHome: "/Users/example/.mirror-minds/example",
  dbPath: "/Users/example/.mirror-minds/example/memory.db",
  status: "validated",
  piInstalled: true,
};

describe("the Claude models panel", () => {
  it("offers to install, says what it downloads and what it leaves alone", () => {
    const html = renderToStaticMarkup(<ClaudeModelsPanel installed={false} view={{ kind: "idle" }} onInstall={vi.fn()} />);
    expect(html).toContain("<h3>Claude models</h3>");
    expect(html).toContain("about 135 MB");
    expect(html).toContain("Your own Claude Code, its plugins and its hooks are left alone");
    expect(html).toContain("the Claude sign-in already on this Mac");
    expect(html).toContain(">Install Claude models</button>");
  });

  it("shows progress instead of the button while installing", () => {
    const html = renderToStaticMarkup(<ClaudeModelsPanel installed={false} view={{ kind: "installing", phase: "download", done: 40, total: 107 }} onInstall={vi.fn()} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('<progress max="107" value="40">');
    expect(html).toContain("Downloading Claude models · 40 of 107 packages");
    expect(html).not.toContain("<button");
    expect(claudeModelsProgressLabel({ kind: "installing", phase: "check", done: 0, total: 1 })).toBe("Checking that Claude Code starts…");
  });

  it("names a failure and offers to try again", () => {
    const html = renderToStaticMarkup(<ClaudeModelsPanel installed={false} view={{ kind: "failed", message: "Claude models could not be downloaded." }} onInstall={vi.fn()} />);
    expect(html).toContain('role="alert">Claude models could not be downloaded.</p>');
    expect(html).toContain(">Try again</button>");
  });

  it("says they are installed, with nothing to press", () => {
    const html = renderToStaticMarkup(<ClaudeModelsPanel installed view={{ kind: "idle" }} onInstall={vi.fn()} />);
    expect(html).toContain("Installed");
    expect(html).not.toContain("<button");
  });
});

describe("the runtime channel says whether Claude models are installed", () => {
  it("accepts it on a validated home, and nowhere else", () => {
    expect(parseRuntimeChannelDiagnostic({ ...validated, anthropicInstalled: false }).anthropicInstalled).toBe(false);
    expect(() => parseRuntimeChannelDiagnostic({ ...validated, anthropicInstalled: "yes" })).toThrow();
    expect(() => parseRuntimeChannelDiagnostic({
      channel: "user", productName: "Mirror Desktop TS", bundleIdentifier: "ai.mirrormind.desktop.ts",
      appDataRoot: "/x", status: "unbound", message: "Choose a home.", anthropicInstalled: true,
    })).toThrow();
    expect(channelSource).toContain("anthropic_installed: Some(self.anthropic_provider.is_some())");
  });

  it("installs through the app, listening to its own progress, and reads the models again after", () => {
    expect(storageSource).toContain('listen<PiInstallProgress>("anthropic-install-progress"');
    expect(storageSource).toContain('await invoke("install_anthropic_provider")');
    const install = appSource.slice(appSource.indexOf("async function installClaudeModels()"));
    const body = install.slice(0, install.indexOf("\n  }\n"));
    expect(body).toContain("setRuntimeChannel(await inspectRuntimeChannel())");
    expect(body).toContain('setPiModelCatalogState("idle")');
    expect(appSource).toContain("<ClaudeModelsPanel");
  });
});
