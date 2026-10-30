import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ModelProvidersPanel, disconnectWarning } from "../app/ModelProvidersPanel";
import { OpenRouterKeyPanel, WITHOUT_CONTEXT } from "../app/OpenRouterKeyPanel";
import { describeLastCheck, type OpenRouterKeyStatus } from "../app/openRouterKey";
import type { PiProviderStatus } from "../app/piProviders";
import appSource from "../app/App.tsx?raw";
import keySource from "../../src-tauri/src/openrouter_key.rs?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";
import providersPanelSource from "../app/ModelProvidersPanel.tsx?raw";

// CV-010.DS-005 slice 3c-2: Settings' Connections (model providers, with Disconnect) and the
// OpenRouter key for Mirror's context, asked for in setup after the provider and kept in the Keychain.

const providers: PiProviderStatus[] = [
  { id: "anthropic", name: "Anthropic", apiKey: true, oauth: true, oauthName: "Claude Pro/Max", stored: true, ready: { type: "oauth" } },
  { id: "google", name: "Google", apiKey: true, oauth: false, stored: false, ready: { type: "api_key", source: "GEMINI_API_KEY" } },
  { id: "deepseek", name: "DeepSeek", apiKey: true, oauth: false, stored: false, ready: null },
];
const panel = () => ({ onSignIn: vi.fn(), onAnswer: vi.fn(), onCancel: vi.fn(), onOpenAgain: vi.fn(), onDisconnect: vi.fn(), onReload: vi.fn() });
const keyPanel = () => ({ onSave: vi.fn(), onTest: vi.fn(), onRemove: vi.fn(), onDecline: vi.fn(), onReload: vi.fn() });
const kept = (outcome?: "worked" | "refused" | "unreachable"): OpenRouterKeyStatus => ({ configured: true, lastCheck: outcome ? { atMs: Date.UTC(2026, 9, 30, 12), outcome } : null, declined: false });
const none: OpenRouterKeyStatus = { configured: false, lastCheck: null, declined: false };

describe("model providers in Settings", () => {
  it("lists the connected ones; only a sign-in Pi holds can be disconnected", () => {
    const html = renderToStaticMarkup(<ModelProvidersPanel providers={providers} state="ready" {...panel()} />);
    expect(html).toContain("<h3>Model providers</h3>");
    const anthropic = html.slice(html.indexOf(">Anthropic<"), html.indexOf(">Google<"));
    expect(anthropic).toContain("Connected · signed in");
    expect(anthropic).toContain(">Disconnect</button>");
    const google = html.slice(html.indexOf(">Google<"), html.indexOf("</ul>"));
    expect(google).toContain("Connected · from your environment");
    expect(google).not.toContain("Disconnect");
    const another = html.slice(html.indexOf("Connect another provider"));
    expect(another).toContain(">DeepSeek</option>");
    expect(another).not.toContain(">Anthropic</option>");
    expect(another).toContain(">Use an API key</button>");
  });

  it("asks before disconnecting, says Pi in a terminal forgets it too, and warns about the last provider", () => {
    const html = renderToStaticMarkup(<ModelProvidersPanel providers={providers} state="ready" {...panel()} initialConfirming="anthropic" />);
    expect(html).toContain("Pi forgets this sign-in, in Mirror Desktop and in Pi in a terminal.");
    expect(html).toContain(">Keep</button>");
    // The first click only asks; Disconnect is called from the confirmation alone.
    expect(providersPanelSource).toContain("onClick={() => setConfirming(provider.id)}");
    expect(providersPanelSource.split("onDisconnect(provider)").length).toBe(2);
    expect(providersPanelSource.indexOf("onDisconnect(provider)")).toBeGreaterThan(providersPanelSource.indexOf("confirming === provider.id ? ("));
    expect(providersPanelSource.indexOf("onDisconnect(provider)")).toBeLessThan(providersPanelSource.indexOf(") : (\n                  <button className=\"secondary-button\" type=\"button\" disabled={busy !== undefined} onClick={() => setConfirming"));
    expect(disconnectWarning(providers[0], providers)).not.toContain("only connected provider");
    expect(disconnectWarning(providers[0], [providers[0], providers[2]])).toContain("It is your only connected provider");
  });

  it("shows a sign-in started here in place of the list", () => {
    const html = renderToStaticMarkup(<ModelProvidersPanel providers={providers} state="ready" {...panel()}
      login={{ session: 1, origin: "settings", provider: "deepseek", providerName: "DeepSeek", prompts: [{ id: "p1", kind: "secret", message: "Enter DeepSeek API key" }], notes: [] }} />);
    expect(html).toContain("<h3>Connecting DeepSeek</h3>");
    expect(html).toContain('type="password"');
    expect(html).not.toContain("<h3>Model providers</h3>");
  });
});

describe("the OpenRouter key", () => {
  it("is asked for in setup with a way to go on without it, said plainly", () => {
    const html = renderToStaticMarkup(<OpenRouterKeyPanel variant="setup" status={none} busy={false} {...keyPanel()} />);
    expect(html).toContain("<h1>Mirror&#x27;s context · OpenRouter</h1>");
    expect(html).toContain('type="password"');
    expect(html).toContain(">Check and keep</button>");
    expect(html).toContain(">Not now</button>");
    expect(html).toContain(WITHOUT_CONTEXT.replaceAll("'", "&#x27;"));
  });

  it("in Settings, a kept key is tested, replaced or removed and never shown", () => {
    const html = renderToStaticMarkup(<OpenRouterKeyPanel variant="settings" status={kept("worked")} busy={false} {...keyPanel()} />);
    expect(html).toContain("<h3>");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("Not now");
    for (const action of [">Test</button>", ">Replace</button>", ">Remove</button>"]) expect(html).toContain(action);
    const empty = renderToStaticMarkup(<OpenRouterKeyPanel variant="settings" status={none} busy={false} {...keyPanel()} />);
    expect(empty).toContain('type="password"');
    expect(empty).not.toContain("Not now");
    const replacing = renderToStaticMarkup(<OpenRouterKeyPanel variant="settings" status={kept()} busy={false} {...keyPanel()} initialReplacing />);
    expect(replacing).toContain("New OpenRouter key");
    expect(replacing).toContain('type="password"');
    expect(replacing).not.toContain(">Remove</button>");
    const removing = renderToStaticMarkup(<OpenRouterKeyPanel variant="settings" status={kept()} busy={false} {...keyPanel()} initialConfirmingRemove />);
    expect(removing).toContain("Remove the key?");
    expect(removing).toContain(">Keep</button>");
  });

  it("says when the kept key last worked, was refused, or could not be checked", () => {
    expect(describeLastCheck(none)).toBe("No key is kept.");
    expect(describeLastCheck(kept())).toContain("has not been checked yet");
    expect(describeLastCheck(kept("worked"), "en-US")).toMatch(/It worked on Oct 30, 2026/);
    expect(describeLastCheck(kept("refused"))).toContain("OpenRouter refused it");
    expect(describeLastCheck(kept("unreachable"))).toContain("could not be reached");
  });

  it("offers Try again, and in setup Not now, when the Keychain could not be read", () => {
    const html = renderToStaticMarkup(<OpenRouterKeyPanel variant="setup" message="The Keychain could not be read (-25308)." busy={false} {...keyPanel()} />);
    expect(html).toContain('class="provider-error"');
    expect(html).toContain(">Try again</button>");
    expect(html).toContain(">Not now</button>");
  });

  it("is never a command's answer: only the host's calls in slice 3d read it", () => {
    const reader = keySource.slice(0, keySource.indexOf("pub(crate) fn kept_key"));
    expect(reader.trimEnd().endsWith("#[tauri::command]")).toBe(false);
    expect(mainSource).not.toContain("openrouter_key::kept_key");
    expect(keySource).toContain("fn present(&self)");
    expect(keySource).toContain(".load_attributes(true)");
  });
});

describe("the setup sequence and Settings", () => {
  it("asks for the key after the provider and before the model, until one is kept or declined", () => {
    expect(appSource).toContain("const runtimeSetupNeedsOpenRouter = !runtimeSetupNeedsConnection && runtimeChannel?.piInstalled === true && !runtimeSetupNeedsProvider");
    expect(appSource).toContain("&& !openRouterSkipped && (!openRouterKey || (!openRouterKey.configured && !openRouterKey.declined));");
    expect(appSource).toMatch(/\|\| runtimeSetupNeedsProvider\n\s+\|\| runtimeSetupNeedsOpenRouter/);
    const provider = appSource.indexOf("<ProviderConnectStep");
    const key = appSource.indexOf('variant="setup"');
    expect(provider).toBeLessThan(key);
    expect(key).toBeLessThan(appSource.indexOf("<h1>Choose your model</h1>"));
    const decline = appSource.slice(appSource.indexOf("function declineOpenRouter() {"));
    expect(decline.slice(0, decline.indexOf("\n  }\n"))).toContain("setOpenRouterSkipped(true);");
  });

  it("a sign-in from Settings never brings setup back; a reload keeps the list shown", () => {
    expect(appSource).toContain('(providerStepOpen || piLogin?.origin === "setup" || !piProvidersLoadedOnce ||');
    expect(appSource).toContain('login={piLogin?.origin === "settings" ? piLogin : undefined}');
    expect(appSource).toContain('onSignIn={(provider, loginType) => void signInToProvider(provider, loginType, "settings")}');
    expect(appSource).toContain('if (!settingsOpen || settingsTab !== "connections") return;');
  });

  it("after a disconnect, reads Pi's providers and models again", () => {
    const body = appSource.slice(appSource.indexOf("async function disconnectProvider("));
    const own = body.slice(0, body.indexOf("\n  }\n"));
    expect(own).toContain('setPiModelCatalogState("idle");');
    expect(own).toContain('setPiProvidersState("idle");');
    expect(own).toContain("still connected through your environment");
  });
});
