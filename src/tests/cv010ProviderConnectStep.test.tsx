import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProviderConnectStep, orderedProviders, readinessLabel } from "../app/ProviderConnectStep";
import { applyPiLoginEvent, withoutPrompt, type PiLoginView, type PiProviderStatus } from "../app/piProviders";
import appSource from "../app/App.tsx?raw";
import authSource from "../../src-tauri/src/pi_auth.rs?raw";

// CV-010.DS-005 slice 3c-1: after Pi is installed, setup connects a model provider through Pi's own
// sign-in before the model is chosen, and a connected provider is never asked for again.

const providers: PiProviderStatus[] = [
  { id: "deepseek", name: "DeepSeek", apiKey: true, oauth: false, ready: null },
  { id: "anthropic", name: "Anthropic", apiKey: true, oauth: true, oauthName: "Anthropic (Claude Pro/Max)", ready: null },
  { id: "openai-codex", name: "OpenAI Codex", apiKey: false, oauth: true, ready: { type: "oauth", source: "stored credential" } },
];
const handlers = () => ({ onSignIn: vi.fn(), onAnswer: vi.fn(), onCancel: vi.fn(), onOpenAgain: vi.fn(), onContinue: vi.fn() });
const login = (extra: Partial<PiLoginView> = {}): PiLoginView => ({ session: 3, provider: "anthropic", providerName: "Anthropic", prompts: [], notes: [], ...extra });

describe("choosing a provider", () => {
  it("lists connected providers first, then by name, each with its state", () => {
    expect(orderedProviders(providers).map((provider) => provider.id)).toEqual(["openai-codex", "anthropic", "deepseek"]);
    expect(readinessLabel(providers[0])).toBe("Not connected");
    expect(readinessLabel(providers[2])).toBe("Connected · signed in");
    expect(readinessLabel({ ...providers[0], ready: { type: "api_key" } })).toBe("Connected · API key");
  });

  it("offers the sign-ins the chosen provider has, and Continue once one is connected", () => {
    const anthropic = renderToStaticMarkup(<ProviderConnectStep providers={providers} {...handlers()} initialChoice="anthropic" />);
    expect(anthropic).toContain("<h1>Connect a model provider</h1>");
    expect(anthropic).toContain("Sign in · Anthropic (Claude Pro/Max)</button>");
    expect(anthropic).toContain(">Use an API key</button>");
    expect(anthropic).toContain("Connected: OpenAI Codex.");
    expect(anthropic).toContain(">Continue</button>");
    const deepseek = renderToStaticMarkup(<ProviderConnectStep providers={providers} {...handlers()} initialChoice="deepseek" />);
    expect(deepseek).not.toContain(">Sign in");
    const none = renderToStaticMarkup(<ProviderConnectStep providers={providers.slice(0, 2)} {...handlers()} />);
    expect(none).not.toContain(">Continue</button>");
    expect(none).not.toContain("Connected:");
  });

  it("asks for an API key in a password field, and paste-a-code in a plain one", () => {
    const secret = renderToStaticMarkup(<ProviderConnectStep providers={providers} {...handlers()} login={login({ prompts: [{ id: "p1", kind: "secret", message: "Enter DeepSeek API key" }] })} />);
    expect(secret).toContain('type="password"');
    expect(secret).toMatch(/autocomplete="off"/i);
    expect(secret).toContain("Enter DeepSeek API key");
    const page = renderToStaticMarkup(<ProviderConnectStep providers={providers} {...handlers()} login={login({
      authUrl: "https://claude.ai/oauth/authorize?x=1",
      prompts: [{ id: "p2", kind: "manual_code", message: "paste", placeholder: "http://localhost:53692/callback" }],
    })} />);
    expect(page).toContain("<h1>Connecting Anthropic</h1>");
    expect(page).toContain("Your browser opened claude.ai.");
    expect(page).toContain('type="text"');
    expect(page).toContain("Or paste the code or the final address here");
    expect(page).toContain(">Open the sign-in page again</button>");
    expect(page).toContain(">Cancel</button>");
  });
});

describe("a sign-in's events", () => {
  it("add and close prompts, show the page and the device code, for this sign-in only", () => {
    let view = login();
    view = applyPiLoginEvent(view, { kind: "select", session: 3, id: "p1", message: "Method", options: [{ id: "browser", label: "Browser" }] });
    view = applyPiLoginEvent(view, { kind: "authUrl", session: 3, url: "https://claude.ai/x", instructions: "Finish in the browser." });
    view = applyPiLoginEvent(view, { kind: "prompt", session: 3, id: "p2", prompt: "manual_code", message: "paste", placeholder: null });
    view = applyPiLoginEvent(view, { kind: "prompt", session: 4, id: "p9", prompt: "secret", message: "another sign-in" });
    expect(view.prompts.map((prompt) => prompt.id)).toEqual(["p1", "p2"]);
    expect(view.prompts[1]).toEqual({ id: "p2", kind: "manual_code", message: "paste" });
    expect(view).toMatchObject({ authUrl: "https://claude.ai/x", instructions: "Finish in the browser." });
    view = applyPiLoginEvent(view, { kind: "promptClosed", session: 3, id: "p2" });
    view = withoutPrompt(view, "p1");
    expect(view.prompts).toEqual([]);
    view = applyPiLoginEvent(view, { kind: "deviceCode", session: 3, userCode: "ABCD", verificationUri: "https://github.com/login/device" });
    expect(view.deviceCode).toEqual({ userCode: "ABCD", verificationUri: "https://github.com/login/device" });
    for (let index = 0; index < 8; index++) view = applyPiLoginEvent(view, { kind: "note", session: 3, message: `n${index}` });
    expect(view.notes).toEqual(["n3", "n4", "n5", "n6", "n7"]);
  });
});

describe("the setup sequence", () => {
  it("connects a provider after Pi and before Journeys and the model, and offers another one later", () => {
    expect(appSource).toContain("const runtimeSetupNeedsProvider = !runtimeSetupNeedsConnection && runtimeChannel?.piInstalled === true");
    expect(appSource).toContain("(providerStepOpen || piLogin !== undefined || piProvidersState !== \"ready\" || !piProviders.some((provider) => provider.ready));");
    expect(appSource).toMatch(/\|\| runtimeSetupNeedsPi\n\s+\|\| runtimeSetupNeedsProvider/);
    const pi = appSource.indexOf("<PiInstallStep");
    const provider = appSource.indexOf("<ProviderConnectStep");
    expect(pi).toBeLessThan(provider);
    expect(provider).toBeLessThan(appSource.indexOf("<h1>Choose your model</h1>"));
    expect(appSource).toContain("onClick={() => setProviderStepOpen(true)} disabled={agentSettingsState === \"saving\"}>Connect another provider</button>");
    const proceed = appSource.slice(appSource.indexOf("function continueWithProviders("));
    expect(proceed.slice(0, proceed.indexOf("\n  }\n"))).toContain('setPiModelCatalogState("idle")');
  });

  it("reads the providers again when a sign-in ends, and ignores another sign-in's outcome", () => {
    const listener = appSource.slice(appSource.indexOf("void listenPiLogin((event) => {"));
    const outcome = listener.slice(0, listener.indexOf("return;\n      }"));
    expect(outcome).toContain("if (current?.session !== event.session) return;");
    expect(outcome).toContain('setPiProvidersState("idle");');
    expect(outcome).toContain("setPiLogin(undefined);");
    expect(authSource).toContain('PI_LOGIN_EVENT: &str = "pi-login-event";');
  });
});
