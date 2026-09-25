import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import rustSource from "../../src-tauri/src/agent_settings.rs?raw";

describe("persistent agent profile application boundary", () => {
  it("loads settings before live send and resolves the selected Journey profile once", () => {
    expect(appSource).toContain("loadAgentSettings()")
    expect(appSource).toContain("resolveAgentProfile(agentSettings, selectedJourney)");
    expect(appSource).toContain("projectAgentProfile(providerConfig, effectiveAgentProfile)");
    expect(appSource).toContain('agentSettingsState !== "ready"');
    expect(appSource).toContain("livePiAgentStream(packet, effectiveProviderConfig, runAuthority)");
  });

  it("opens Journey selection from the model link beside Send instead of global Settings", () => {
    expect(appSource).toContain('aria-label="Global agent defaults"');
    expect(appSource).not.toContain('aria-label="Journey agent overrides"');
    expect(appSource).toContain('aria-label="Choose Journey agent profile"');
    expect(appSource).toContain("Use model for this Journey");
    expect(appSource).toContain("Use global defaults");
    expect(appSource).toContain("Changes affect only the next explicit invocation");
  });

  it("keeps persistence and catalog inspection outside provider execution", () => {
    expect(rustSource).toContain('fn list_pi_models()');
    expect(rustSource).toContain('.env("PI_OFFLINE", "1")');
    expect(rustSource).toContain('fn save_agent_settings_at(');
    const persistence = rustSource.slice(rustSource.indexOf("fn load_agent_settings_at"), rustSource.indexOf("fn harness_root"));
    expect(persistence).not.toContain("run_pi_process");
    expect(persistence).not.toContain("start_pi_invocation");
  });
});

// CR090: choosing a model is a preference for the next turn, so only a settings write in
// flight may block it. runtimeBusy is global — a run in one Journey must not disable the
// model surfaces in every other one.
describe("model surface availability", () => {
  it("blocks model surfaces only while a settings write is in flight", () => {
    expect(appSource).not.toContain('runtimeBusy || agentSettingsState === "saving"');
    expect(appSource).toContain('providerSelectionDisabled={agentSettingsState === "saving"}');
    for (const action of [
      "saveGlobalAgentProfile()",
      "restoreDefaultAgentSettings()",
      "saveSelectedJourneyAgentOverride()",
      "resetSelectedJourneyAgentOverride()",
    ]) {
      // The button form, which is distinct from both the function definition and the menu
      // entry that now also reaches these actions.
      const handler = `onClick={() => void ${action}}`;
      expect(appSource).toContain(handler);
      const call = appSource.slice(appSource.indexOf(handler), appSource.indexOf(handler) + 200);
      expect(call).toContain('disabled={agentSettingsState === "saving"}');
      expect(call).not.toContain("runtimeBusy");
    }
  });

  it("records the run model and names the turn a newer selection reaches", () => {
    expect(appSource).toContain("providerModel: providerModelLabel(effectiveProviderConfig)");
    expect(appSource).toContain("providerModel: liveRunProviderModel");
    expect(appSource).toContain("deriveModelSelectionScope({");
    expect(appSource).toContain("selectionScope={modelSelectionScope}");
  });
});

// CR078: Model Intents live in the Agent panel, beside the defaults they offer alternatives
// to, and are loaded once on mount because the Composer footer needs them too.
describe("model intents settings surface", () => {
  it("renders the panel inside the Agent panel and persists through the store", () => {
    const agentPanel = appSource.slice(
      appSource.indexOf('id="settings-panel-agent"'),
      appSource.indexOf('settingsTab === "runtime"'),
    );
    expect(agentPanel).toContain("<ModelIntentsPanel");
    expect(agentPanel).toContain("intents={modelIntents}");
    expect(agentPanel).toContain("void persistModelIntents(next)");
    expect(appSource).toContain("async function persistModelIntents(next: ModelIntents)");
  });

  it("advances the surface only after the write lands", () => {
    const persist = appSource.slice(
      appSource.indexOf("async function persistModelIntents"),
      appSource.indexOf("async function persistAgentSettings"),
    );
    expect(persist.indexOf("await saveModelIntents(next)")).toBeLessThan(persist.indexOf("setModelIntents(next)"));
    expect(persist).toContain("setModelIntentsError(true)");
  });

  it("loads the intents on mount rather than when Settings opens", () => {
    expect(appSource).toContain("void loadModelIntents()");
    const load = appSource.slice(appSource.indexOf("void loadModelIntents()"));
    expect(load.slice(0, 400)).not.toContain("settingsOpen");
  });
});

// CR078: the footer is where intents become use. Selecting one performs the same Journey
// override the dialog writes, so scope and persistence are unchanged.
describe("model intents in the Composer footer", () => {
  it("names the matching intent and keeps its binding reachable", () => {
    expect(appSource).toContain("const activeModelIntent = matchModelIntent(modelIntents, {");
    expect(appSource).toContain("activeIntentLabel={activeModelIntent?.label}");
    const footer = readFileSync(
      new URL("../app/ComposerRuntimeFooter.tsx", import.meta.url), "utf8",
    ) as string;
    // Pointer gets the title, keyboard and assistive technology get the accessible name.
    expect(footer).toContain("title={activeIntentLabel ? providerModel : undefined}");
    expect(footer).toContain("currently ${activeIntentLabel} (${providerModel})");
    expect(footer).toContain('aria-haspopup="menu"');
  });

  it("applies an intent as the same Journey override the dialog writes", () => {
    const apply = appSource.slice(
      appSource.indexOf("async function applyModelIntent"),
      appSource.indexOf("function openJourneyAgentProfileSelector"),
    );
    expect(apply).toContain("setJourneyAgentOverride(agentSettings, selectedJourney, {");
    expect(apply).toContain("model: intent.model");
    expect(apply).toContain("thinkingLevel: intent.thinkingLevel");
    expect(apply).toContain("setModelIntentMenuOpen(false)");
  });

  it("dismisses the menu by outside pointer and by Escape", () => {
    const dismissal = appSource.slice(
      appSource.indexOf("if (!modelIntentMenuOpen) return;"),
      appSource.indexOf("}, [modelIntentMenuOpen]);"),
    );
    expect(dismissal).toContain('document.addEventListener("mousedown", closeOnOutsidePointer)');
    expect(dismissal).toContain('event.key === "Escape"');
    expect(dismissal).toContain('document.removeEventListener("keydown", closeOnEscape)');
  });
});
