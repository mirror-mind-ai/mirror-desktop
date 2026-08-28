import { describe, expect, it } from "vitest";
import {
  createDefaultAgentSettings,
  parseAgentSettings,
  resolveAgentProfile,
  serializeAgentSettings,
  setJourneyAgentOverride,
  type AgentSettings,
} from "../domain/agentProfile";

const stored: AgentSettings = {
  schemaVersion: "1.0.0",
  globalProfile: {
    model: { provider: "openai-codex", model: "gpt-5.4-mini" },
    thinkingLevel: "medium",
    invocationMode: "mirror",
  },
  journeyOverrides: {
    alpha: {
      model: { provider: "anthropic", model: "claude-sonnet-4-6" },
      thinkingLevel: "high",
    },
    beta: { thinkingLevel: "off" },
  },
};

describe("persistent agent profiles", () => {
  it("provides a versioned non-secret Harness default", () => {
    expect(createDefaultAgentSettings()).toEqual({
      schemaVersion: "1.0.0",
      globalProfile: {
        model: { provider: "openai-codex", model: "gpt-5.4-mini" },
        thinkingLevel: "pi-default",
        invocationMode: "mirror",
      },
      journeyOverrides: {},
    });
  });

  it("resolves model and thinking overrides independently by exact Journey ID", () => {
    expect(resolveAgentProfile(stored, "alpha")).toMatchObject({
      model: { provider: "anthropic", model: "claude-sonnet-4-6" },
      thinkingLevel: "high",
      modelSource: "journey",
      thinkingSource: "journey",
    });
    expect(resolveAgentProfile(stored, "beta")).toMatchObject({
      model: stored.globalProfile.model,
      thinkingLevel: "off",
      modelSource: "global",
      thinkingSource: "journey",
    });
    expect(resolveAgentProfile(stored, "Alpha")).toMatchObject({
      model: stored.globalProfile.model,
      thinkingLevel: "medium",
      modelSource: "global",
      thinkingSource: "global",
    });
  });

  it("clears empty Journey overrides and returns to inheritance", () => {
    const updated = setJourneyAgentOverride(stored, "alpha", {});
    expect(updated.journeyOverrides.alpha).toBeUndefined();
    expect(resolveAgentProfile(updated, "alpha").modelSource).toBe("global");
  });

  it("round-trips only the allowlisted schema", () => {
    expect(parseAgentSettings(JSON.parse(serializeAgentSettings(stored)))).toEqual(stored);
  });

  it.each([
    { ...stored, schemaVersion: "2.0.0" },
    { ...stored, token: "secret" },
    { ...stored, globalProfile: { ...stored.globalProfile, apiKey: "secret" } },
    { ...stored, globalProfile: { ...stored.globalProfile, thinkingLevel: "ultra" } },
    { ...stored, globalProfile: { ...stored.globalProfile, model: { provider: "openai codex", model: "gpt" } } },
    { ...stored, journeyOverrides: { "../escape": {} } },
  ])("rejects malformed or non-allowlisted settings as a whole", (value) => {
    expect(() => parseAgentSettings(value)).toThrow("Agent settings");
  });
});
