import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAgentSettings } from "../domain/agentProfile";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("agent settings storage boundary", () => {
  beforeEach(() => invoke.mockReset());

  it("loads and saves only the versioned allowlisted payload", async () => {
    const { loadAgentSettings, saveAgentSettings } = await import("../app/agentSettingsStorage");
    const settings = createDefaultAgentSettings();
    invoke.mockResolvedValueOnce(JSON.stringify(settings)).mockResolvedValueOnce(undefined);
    await expect(loadAgentSettings()).resolves.toEqual(settings);
    await saveAgentSettings(settings);
    expect(invoke.mock.calls.map(([command]) => command)).toEqual(["load_agent_settings", "save_agent_settings"]);
    const saved = JSON.parse(invoke.mock.calls[1][1].payload);
    expect(Object.keys(saved)).toEqual(["schemaVersion", "globalProfile", "journeyOverrides"]);
    expect(JSON.stringify(saved)).not.toMatch(/api.?key|token|environment|headers|args/i);
  });

  it("fails closed instead of treating malformed settings as missing", async () => {
    const { loadAgentSettings } = await import("../app/agentSettingsStorage");
    invoke.mockResolvedValueOnce("{not-json");
    await expect(loadAgentSettings()).rejects.toThrow("malformed JSON");
  });

  it("loads a bounded structured local Pi catalog", async () => {
    const { listPiModels } = await import("../app/agentSettingsStorage");
    invoke.mockResolvedValueOnce([{ provider: "openai-codex", model: "gpt-5.4", contextWindow: 1050000, maxOutput: 128000, thinking: true, images: true }]);
    await expect(listPiModels()).resolves.toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith("list_pi_models");
  });
});
