import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
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
