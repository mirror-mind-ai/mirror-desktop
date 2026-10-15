import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import rustSource from "../../src-tauri/src/agent_settings.rs?raw";
import agentProfileSource from "../domain/agentProfile.ts?raw";

/**
 * One named function's body, ending at the next declaration at the same level — or at the end of the
 * file when it is the last one, which `assertConversationKey` happens to be. Requiring a following
 * declaration made the first version of this helper fail identically whether or not the guarded
 * property held, so its control proved nothing.
 */
function functionSource(source: string, declaration: string): string {
  const start = source.indexOf(declaration);
  expect(start, `${declaration} not found`).toBeGreaterThan(-1);
  const rest = source.slice(start + declaration.length);
  const next = rest.search(/\n(?:function |fn |export function |pub fn )/);
  const body = next === -1 ? rest : rest.slice(0, next);
  expect(body.length, `${declaration} body is empty`).toBeGreaterThan(0);
  return body;
}

/** Every double-quoted literal inside a region, in source order. */
function quotedLiterals(source: string, from: string, to: string): string[] {
  const start = source.indexOf(from);
  expect(start, `region start not found: ${from}`).toBeGreaterThan(-1);
  const end = source.indexOf(to, start + from.length);
  expect(end, `region end not found: ${to}`).toBeGreaterThan(start);
  return [...source.slice(start, end).matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

/**
 * CR154: one named function's body and nothing after it.
 *
 * The guard this replaces sliced from one function to another one several declarations later, so its
 * window covered the siblings in between. When this CR moved the composer onto the conversation
 * grain, a new sibling inside that window still wrote the Journey grain legitimately, and the guard
 * went on passing while the behaviour it named had changed. A window that ends at the next
 * declaration cannot be satisfied by a neighbour.
 */
function functionBody(name: string): string {
  const start = appSource.indexOf(`function ${name}(`);
  expect(start, `${name} not found in App.tsx`).toBeGreaterThan(-1);
  const rest = appSource.slice(start + 1);
  const next = rest.search(/\n {2}(?:async )?function /);
  expect(next, `no declaration follows ${name}`).toBeGreaterThan(-1);
  return rest.slice(0, next);
}

describe("persistent agent profile application boundary", () => {
  it("loads settings before live send and resolves the selected workspace profile once", () => {
    expect(appSource).toContain("loadAgentSettings()")
    // CR154: the profile is resolved at the workspace, not at the Journey. The guard pins the
    // workspace construction rather than merely the call, because `resolveAgentProfile(agentSettings,`
    // followed by anything would pass while the conversation grain was being ignored — which is the
    // defect this CR exists for.
    expect(appSource).toContain(
      "resolveAgentProfile(agentSettings, journeyWorkspace(selectedJourney, selectedThreadId ?? null))",
    );
    expect(appSource).not.toContain("resolveAgentProfile(agentSettings, selectedJourney)");
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

  /**
   * CR154: the agent settings root key list is one contract held in two languages — `ROOT_KEYS` in
   * `agentProfile.ts` and the allowlist in `agent_settings.rs`. Nothing asserted they agree, so
   * shipping the third grain on the TypeScript side alone made every settings write fail with
   * "Agent settings root contains unsupported fields", and both suites stayed green: each side only
   * ever checked its own list.
   *
   * The lists are read from their own sources and compared, rather than one being exported for the
   * other to import, so neither module widens its API for a test. Both are asserted non-empty first
   * — two failed extractions would otherwise agree perfectly.
   */
  it("keeps the root key allowlist identical on both sides of the command boundary", () => {
    const ts = quotedLiterals(agentProfileSource, "const ROOT_KEYS = new Set(", ");");
    const rust = quotedLiterals(rustSource, "root.keys().map(String::as_str),", '"root",');
    expect(ts.length).toBeGreaterThan(0);
    expect(rust.length).toBeGreaterThan(0);
    expect(ts).toContain("conversationOverrides");
    expect([...rust].sort()).toEqual([...ts].sort());
  });

  it("accepts the same schema versions on both sides", () => {
    const ts = quotedLiterals(agentProfileSource, "const SUPPORTED_SCHEMA_VERSIONS = new Set(", ");");
    // the TypeScript set names the current version through a constant rather than a literal
    const current = quotedLiterals(agentProfileSource, "export const AGENT_SETTINGS_SCHEMA_VERSION =", ";");
    const accepted = [...ts, ...current].filter((value) => /^\d+\.\d+\.\d+$/.test(value));
    const rust = quotedLiterals(rustSource, "root.get(\"schemaVersion\").and_then(Value::as_str),", ")")
      .filter((value) => /^\d+\.\d+\.\d+$/.test(value));
    expect(accepted.length).toBeGreaterThan(0);
    expect(rust.length).toBeGreaterThan(0);
    expect([...new Set(rust)].sort()).toEqual([...new Set(accepted)].sort());
  });

  /**
   * CR154: the conversation key is validated on both sides too, and a divergence there would fail
   * every write exactly as the root key list did — the frontend would store a key the command
   * refuses. This is a **structural** guard, not behavioural equality: it pins the three properties
   * the two validators have to share, because vitest cannot execute the Rust one.
   */
  it("keeps the conversation key rule aligned on both sides", () => {
    const ts = functionSource(agentProfileSource, "function assertConversationKey");
    const rust = functionSource(rustSource, "fn valid_conversation_key");
    for (const [label, body] of [["TypeScript", ts], ["Rust", rust]] as const) {
      // splits on the separator runtimeWorkspaceKey writes
      expect(body, `${label} must split on the separator`).toMatch(/split\('\|'\)|split\("\|"\)/);
      // exactly two segments
      expect(body, `${label} must require two segments`).toMatch(/length !== 2|segments\.next\(\)\.is_some\(\)/);
      // an empty thread segment is legitimate
      expect(body, `${label} must accept an empty thread segment`).toMatch(/!== ""|is_empty\(\)/);
      // and both segments go through the Journey identifier rule
      expect(body, `${label} must reuse the Journey ID rule`).toMatch(/assertJourneyId|JOURNEY_ID|valid_journey_id/);
    }
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
    // CR103: the visible name is now abbreviated whether or not an intent matched, so the exact
    // binding is offered unconditionally rather than only when an intent stood in for it.
    expect(footer).toContain("title={providerModel}");
    expect(footer).toContain("currently ${activeIntentLabel} (${providerModel})");
    expect(footer).toContain('aria-haspopup="menu"');
  });

  it("applies an intent as this conversation's own choice rather than the Journey's", () => {
    const apply = functionBody("applyModelIntent");
    expect(apply).toContain("setConversationAgentOverride(agentSettings, selectedWorkspace, {");
    expect(apply).toContain("model: intent.model");
    expect(apply).toContain("thinkingLevel: intent.thinkingLevel");
    expect(apply).toContain("setModelIntentMenuOpen(false)");
    // CR154: writing the Journey from here was the defect. The window is bounded to this one
    // function because the neighbours legitimately write the Journey grain — the previous version of
    // this guard ran to openJourneyAgentProfileSelector and went on passing after the behaviour
    // changed, because it matched a sibling's text.
    expect(apply).not.toContain("setJourneyAgentOverride");
  });

  it("gives a conversation back to its Journey without discarding the Journey's own override", () => {
    const follow = functionBody("followJourneyAgentDefaultHere");
    expect(follow).toContain("setConversationAgentOverride(agentSettings, selectedWorkspace, {})");
    expect(follow).not.toContain("setJourneyAgentOverride");
  });

  it("clears both finer grains when the composer asks for the global default", () => {
    const toGlobal = functionBody("useGlobalAgentDefaultsHere");
    expect(toGlobal).toContain("setJourneyAgentOverride(agentSettings, selectedJourney, {})");
    expect(toGlobal).toContain("setConversationAgentOverride(");
  });

  it("keeps the Settings Journey panel writing the Journey grain", () => {
    const reset = functionBody("resetSelectedJourneyAgentOverride");
    expect(reset).toContain("setJourneyAgentOverride(agentSettings, selectedJourney, {})");
    expect(reset).not.toContain("setConversationAgentOverride");
    const save = functionBody("saveSelectedJourneyAgentOverride");
    expect(save).toContain("setJourneyAgentOverride(agentSettings, selectedJourney, override)");
    expect(save).not.toContain("setConversationAgentOverride");
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
