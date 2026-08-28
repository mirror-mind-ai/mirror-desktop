import type { AgentInvocationMode } from "../agent/providerConfig";

export const agentThinkingLevels = ["pi-default", "off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type AgentThinkingLevel = typeof agentThinkingLevels[number];

export type AgentModelSelection = {
  provider: string;
  model: string;
};

export type GlobalAgentProfile = {
  model: AgentModelSelection;
  thinkingLevel: AgentThinkingLevel;
  invocationMode: AgentInvocationMode;
};

export type JourneyAgentOverride = {
  model?: AgentModelSelection;
  thinkingLevel?: AgentThinkingLevel;
};

export type AgentSettings = {
  schemaVersion: "1.0.0";
  globalProfile: GlobalAgentProfile;
  journeyOverrides: Record<string, JourneyAgentOverride>;
};

export type EffectiveAgentProfile = GlobalAgentProfile & {
  journeyId: string;
  modelSource: "global" | "journey";
  thinkingSource: "global" | "journey";
};

const PROFILE_KEYS = new Set(["model", "thinkingLevel", "invocationMode"]);
const MODEL_KEYS = new Set(["provider", "model"]);
const OVERRIDE_KEYS = new Set(["model", "thinkingLevel"]);
const ROOT_KEYS = new Set(["schemaVersion", "globalProfile", "journeyOverrides"]);
const SAFE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,159}$/u;
const JOURNEY_ID = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/u;

export function createDefaultAgentSettings(): AgentSettings {
  return {
    schemaVersion: "1.0.0",
    globalProfile: {
      model: { provider: "openai-codex", model: "gpt-5.4-mini" },
      thinkingLevel: "pi-default",
      invocationMode: "mirror",
    },
    journeyOverrides: {},
  };
}

export function resolveAgentProfile(settings: AgentSettings, journeyId: string): EffectiveAgentProfile {
  const override = settings.journeyOverrides[journeyId];
  return {
    journeyId,
    model: override?.model ?? settings.globalProfile.model,
    thinkingLevel: override?.thinkingLevel ?? settings.globalProfile.thinkingLevel,
    invocationMode: settings.globalProfile.invocationMode,
    modelSource: override?.model ? "journey" : "global",
    thinkingSource: override?.thinkingLevel ? "journey" : "global",
  };
}

export function setJourneyAgentOverride(
  settings: AgentSettings,
  journeyId: string,
  override: JourneyAgentOverride,
): AgentSettings {
  assertJourneyId(journeyId);
  const nextOverrides = { ...settings.journeyOverrides };
  if (!override.model && !override.thinkingLevel) {
    delete nextOverrides[journeyId];
  } else {
    nextOverrides[journeyId] = parseJourneyOverride(override, `journeyOverrides.${journeyId}`);
  }
  return { ...settings, journeyOverrides: nextOverrides };
}

export function parseAgentSettings(value: unknown): AgentSettings {
  const root = objectRecord(value, "Agent settings root");
  exactKeys(root, ROOT_KEYS, "Agent settings root");
  if (root.schemaVersion !== "1.0.0") throw new Error("Agent settings schema version is unsupported.");

  const profile = objectRecord(root.globalProfile, "Agent settings global profile");
  exactKeys(profile, PROFILE_KEYS, "Agent settings global profile");
  const journeyOverrides = objectRecord(root.journeyOverrides, "Agent settings Journey overrides");
  const parsedOverrides: Record<string, JourneyAgentOverride> = {};
  for (const [journeyId, override] of Object.entries(journeyOverrides)) {
    assertJourneyId(journeyId);
    parsedOverrides[journeyId] = parseJourneyOverride(override, `journeyOverrides.${journeyId}`);
  }

  return {
    schemaVersion: "1.0.0",
    globalProfile: {
      model: parseModel(profile.model, "Agent settings global model"),
      thinkingLevel: parseThinkingLevel(profile.thinkingLevel),
      invocationMode: parseInvocationMode(profile.invocationMode),
    },
    journeyOverrides: parsedOverrides,
  };
}

export function serializeAgentSettings(settings: AgentSettings): string {
  const parsed = parseAgentSettings(settings);
  return JSON.stringify(parsed, null, 2);
}

function parseJourneyOverride(value: unknown, label: string): JourneyAgentOverride {
  const override = objectRecord(value, `Agent settings ${label}`);
  exactKeys(override, OVERRIDE_KEYS, `Agent settings ${label}`);
  const parsed: JourneyAgentOverride = {};
  if (override.model !== undefined) parsed.model = parseModel(override.model, `Agent settings ${label}.model`);
  if (override.thinkingLevel !== undefined) parsed.thinkingLevel = parseThinkingLevel(override.thinkingLevel);
  return parsed;
}

function parseModel(value: unknown, label: string): AgentModelSelection {
  const model = objectRecord(value, label);
  exactKeys(model, MODEL_KEYS, label);
  if (typeof model.provider !== "string" || !SAFE_VALUE.test(model.provider) || model.provider.includes("/")) {
    throw new Error("Agent settings provider is invalid.");
  }
  if (typeof model.model !== "string" || !SAFE_VALUE.test(model.model)) {
    throw new Error("Agent settings model is invalid.");
  }
  return { provider: model.provider, model: model.model };
}

function parseThinkingLevel(value: unknown): AgentThinkingLevel {
  if (typeof value !== "string" || !(agentThinkingLevels as readonly string[]).includes(value)) {
    throw new Error("Agent settings thinking level is invalid.");
  }
  return value as AgentThinkingLevel;
}

function parseInvocationMode(value: unknown): AgentInvocationMode {
  if (value !== "mirror" && value !== "raw") throw new Error("Agent settings invocation mode is invalid.");
  return value;
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error(`${label} contains unsupported fields.`);
}

function assertJourneyId(value: string): void {
  if (!JOURNEY_ID.test(value)) throw new Error("Agent settings Journey ID is invalid.");
}
