import { describe, expect, it } from "vitest";
import {
  AGENT_SETTINGS_SCHEMA_VERSION,
  createDefaultAgentSettings,
  describeEffectiveAgentProfile,
  parseAgentSettings,
  resolveAgentProfile,
  serializeAgentSettings,
  setConversationAgentOverride,
  setJourneyAgentOverride,
  type AgentSettings,
} from "../domain/agentProfile";
import { journeyWorkspace, runtimeWorkspaceKey } from "../domain/journeyWorkspaceKey";

const stored: AgentSettings = {
  schemaVersion: "1.1.0",
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
  conversationOverrides: {},
};

describe("effective agent profile description", () => {
  it("names the global default without a thinking suffix for pi-default", () => {
    expect(describeEffectiveAgentProfile({
      journeyId: "journey-a",
      threadId: null,
      model: { provider: "openai-codex", model: "gpt-5.5" },
      thinkingLevel: "pi-default",
      invocationMode: "mirror",
      modelSource: "global",
      thinkingSource: "global",
    })).toBe("openai-codex/gpt-5.5 \u2014 from global default");
  });

  // CR154: a conversation choice must not be attributed to the Journey. Before the third grain
  // existed the sentence had two branches and anything that was not "journey" read "global default".
  it("names the conversation when the conversation owns the choice", () => {
    expect(describeEffectiveAgentProfile({
      journeyId: "journey-a",
      threadId: "desktop-thread-a",
      model: { provider: "anthropic", model: "claude-opus-5" },
      thinkingLevel: "pi-default",
      invocationMode: "mirror",
      modelSource: "conversation",
      thinkingSource: "global",
    })).toBe("anthropic/claude-opus-5 \u2014 from this conversation");
  });

  it("names the Journey override and the explicit thinking level", () => {
    expect(describeEffectiveAgentProfile({
      journeyId: "journey-a",
      threadId: null,
      model: { provider: "anthropic", model: "claude-opus-4-7" },
      thinkingLevel: "high",
      invocationMode: "mirror",
      modelSource: "journey",
      thinkingSource: "journey",
    })).toBe("anthropic/claude-opus-4-7 \u00b7 thinking high \u2014 from Journey override");
  });
});

describe("persistent agent profiles", () => {
  it("provides a versioned non-secret Harness default", () => {
    expect(createDefaultAgentSettings()).toEqual({
      schemaVersion: "1.1.0",
      globalProfile: {
        model: { provider: "openai-codex", model: "gpt-5.4-mini" },
        thinkingLevel: "pi-default",
        invocationMode: "mirror",
      },
      journeyOverrides: {},
      conversationOverrides: {},
    });
  });

  it("resolves model and thinking overrides independently by exact Journey ID", () => {
    expect(resolveAgentProfile(stored, journeyWorkspace("alpha", null))).toMatchObject({
      model: { provider: "anthropic", model: "claude-sonnet-4-6" },
      thinkingLevel: "high",
      modelSource: "journey",
      thinkingSource: "journey",
    });
    expect(resolveAgentProfile(stored, journeyWorkspace("beta", null))).toMatchObject({
      model: stored.globalProfile.model,
      thinkingLevel: "off",
      modelSource: "global",
      thinkingSource: "journey",
    });
    expect(resolveAgentProfile(stored, journeyWorkspace("Alpha", null))).toMatchObject({
      model: stored.globalProfile.model,
      thinkingLevel: "medium",
      modelSource: "global",
      thinkingSource: "global",
    });
  });

  it("clears empty Journey overrides and returns to inheritance", () => {
    const updated = setJourneyAgentOverride(stored, "alpha", {});
    expect(updated.journeyOverrides.alpha).toBeUndefined();
    expect(resolveAgentProfile(updated, journeyWorkspace("alpha", null)).modelSource).toBe("global");
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
    // CR154: the conversation key is `journeyId|threadId` and nothing else.
    { ...stored, conversationOverrides: { "no-separator": { thinkingLevel: "high" } } },
    { ...stored, conversationOverrides: { "alpha|thread|extra": { thinkingLevel: "high" } } },
    { ...stored, conversationOverrides: { "../escape|thread": { thinkingLevel: "high" } } },
    { ...stored, conversationOverrides: { "alpha|../escape": { thinkingLevel: "high" } } },
    { ...stored, conversationOverrides: { "alpha|thread": { apiKey: "secret" } } },
  ])("rejects malformed or non-allowlisted settings as a whole", (value) => {
    expect(() => parseAgentSettings(value)).toThrow("Agent settings");
  });
});

// CR154: the model selector lives in the composer, inside a conversation, and used to write a
// Journey-wide value — so two conversations in one Journey could not disagree about the model.
describe("conversation-grained agent profile", () => {
  const alphaThread = journeyWorkspace("alpha", "desktop-thread-one");
  const alphaOther = journeyWorkspace("alpha", "desktop-thread-two");
  const opus = { provider: "anthropic", model: "claude-opus-5" } as const;

  it("resolves conversation over Journey over global, and names the source", () => {
    const settings = setConversationAgentOverride(stored, alphaThread, { model: opus });
    expect(resolveAgentProfile(settings, alphaThread)).toMatchObject({
      model: opus,
      modelSource: "conversation",
      // the Journey still owns thinking, which the conversation did not choose
      thinkingLevel: "high",
      thinkingSource: "journey",
    });
  });

  it("leaves another conversation in the same Journey untouched", () => {
    const settings = setConversationAgentOverride(stored, alphaThread, { model: opus });
    expect(resolveAgentProfile(settings, alphaOther)).toMatchObject({
      model: { provider: "anthropic", model: "claude-sonnet-4-6" },
      modelSource: "journey",
    });
  });

  it("carries the workspace coordinates it resolved for", () => {
    expect(resolveAgentProfile(stored, alphaThread)).toMatchObject({
      journeyId: "alpha",
      threadId: "desktop-thread-one",
    });
  });

  // Lazy, not frozen: the whole point of keeping the Journey grain is that changing it moves every
  // conversation that never chose for itself.
  it("follows a later change to the Journey default where the conversation chose nothing", () => {
    const moved = setJourneyAgentOverride(stored, "alpha", { model: opus, thinkingLevel: "low" });
    expect(resolveAgentProfile(moved, alphaThread)).toMatchObject({
      model: opus,
      modelSource: "journey",
      thinkingLevel: "low",
    });
  });

  it("does not store a choice that merely repeats what the conversation would inherit", () => {
    const inherited = resolveAgentProfile(stored, alphaThread);
    const settings = setConversationAgentOverride(stored, alphaThread, {
      model: inherited.model,
      thinkingLevel: inherited.thinkingLevel,
    });
    expect(settings.conversationOverrides).toEqual({});
    expect(resolveAgentProfile(settings, alphaThread).modelSource).toBe("journey");
  });

  it("keeps only the fields that differ from the inherited value", () => {
    const inherited = resolveAgentProfile(stored, alphaThread);
    const settings = setConversationAgentOverride(stored, alphaThread, {
      model: opus,
      thinkingLevel: inherited.thinkingLevel,
    });
    expect(settings.conversationOverrides[runtimeWorkspaceKey(alphaThread)]).toEqual({ model: opus });
  });

  it("removes the entry when a choice returns to the inherited value", () => {
    const chosen = setConversationAgentOverride(stored, alphaThread, { model: opus });
    expect(chosen.conversationOverrides[runtimeWorkspaceKey(alphaThread)]).toBeDefined();
    const inherited = resolveAgentProfile(stored, alphaThread);
    const returned = setConversationAgentOverride(chosen, alphaThread, { model: inherited.model });
    expect(returned.conversationOverrides[runtimeWorkspaceKey(alphaThread)]).toBeUndefined();
    expect(resolveAgentProfile(returned, alphaThread).modelSource).toBe("journey");
  });

  // A workspace whose thread has not resolved produces `journeyId|`. Accepting it is what keeps the
  // composer from needing two behaviours depending on load order.
  it("accepts a workspace with no thread", () => {
    const threadless = journeyWorkspace("alpha", null);
    const settings = setConversationAgentOverride(stored, threadless, { model: opus });
    expect(settings.conversationOverrides["alpha|"]).toEqual({ model: opus });
    expect(parseAgentSettings(JSON.parse(serializeAgentSettings(settings)))).toEqual(settings);
  });

  it("refuses a workspace whose Journey ID is not an identifier", () => {
    expect(() => setConversationAgentOverride(stored, journeyWorkspace("../escape", "t"), { model: opus }))
      .toThrow("Agent settings");
  });

  it("reads a 1.0.0 file as holding no conversation choices and migrates it forward", () => {
    const legacy = {
      schemaVersion: "1.0.0",
      globalProfile: stored.globalProfile,
      journeyOverrides: { alpha: { model: opus } },
    };
    const parsed = parseAgentSettings(legacy);
    expect(parsed.schemaVersion).toBe(AGENT_SETTINGS_SCHEMA_VERSION);
    expect(parsed.conversationOverrides).toEqual({});
    // the Navigator's existing Journey choices keep applying, unreinterpreted
    expect(resolveAgentProfile(parsed, alphaThread)).toMatchObject({ model: opus, modelSource: "journey" });
  });
});
