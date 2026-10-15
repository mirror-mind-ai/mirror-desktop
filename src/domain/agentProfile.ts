import type { AgentInvocationMode } from "../agent/providerConfig";
import { runtimeWorkspaceKey, type JourneyWorkspace } from "./journeyWorkspaceKey";

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

/**
 * CR154: one shape for every grain. It was called `JourneyAgentOverride` while the Journey was the
 * only grain that could hold one; the name is now the shape's, not a claim about who owns it.
 */
export type AgentProfileOverride = {
  model?: AgentModelSelection;
  thinkingLevel?: AgentThinkingLevel;
};

/**
 * CR154: three grains, finest first — conversation, then Journey, then global. `conversationOverrides`
 * is keyed by `runtimeWorkspaceKey`, the grain RS024 already owns, rather than by a second key format
 * invented for the model alone.
 *
 * `1.0.0` files carry no `conversationOverrides` and are read as holding none. A parse always returns
 * the current version, so reading and writing migrates forward. An older build reading a newer file
 * refuses it outright, because the root key allowlist is exact — recorded in CR154 rather than left
 * to be discovered by a downgrade.
 */
export type AgentSettings = {
  schemaVersion: AgentSettingsSchemaVersion;
  globalProfile: GlobalAgentProfile;
  journeyOverrides: Record<string, AgentProfileOverride>;
  conversationOverrides: Record<string, AgentProfileOverride>;
};

export type AgentProfileSource = "global" | "journey" | "conversation";

export type EffectiveAgentProfile = GlobalAgentProfile & {
  journeyId: string;
  threadId: string | null;
  modelSource: AgentProfileSource;
  thinkingSource: AgentProfileSource;
};

export const AGENT_SETTINGS_SCHEMA_VERSION = "1.1.0";
const SUPPORTED_SCHEMA_VERSIONS = new Set(["1.0.0", AGENT_SETTINGS_SCHEMA_VERSION]);
export type AgentSettingsSchemaVersion = "1.0.0" | "1.1.0";

const PROFILE_KEYS = new Set(["model", "thinkingLevel", "invocationMode"]);
const MODEL_KEYS = new Set(["provider", "model"]);
const OVERRIDE_KEYS = new Set(["model", "thinkingLevel"]);
const ROOT_KEYS = new Set(["schemaVersion", "globalProfile", "journeyOverrides", "conversationOverrides"]);
const SAFE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,159}$/u;
const JOURNEY_ID = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/u;

export function createDefaultAgentSettings(): AgentSettings {
  return {
    schemaVersion: AGENT_SETTINGS_SCHEMA_VERSION,
    globalProfile: {
      model: { provider: "openai-codex", model: "gpt-5.4-mini" },
      thinkingLevel: "pi-default",
      invocationMode: "mirror",
    },
    journeyOverrides: {},
    conversationOverrides: {},
  };
}

/**
 * CR154: the workspace is required rather than optional. A call site that forgot the conversation
 * would otherwise resolve the Journey silently, which is the shape of defect this CR was opened for.
 *
 * Resolution is lazy on purpose: a conversation holding nothing of its own follows its Journey, so
 * changing a Journey default moves every conversation that never chose. Freezing at creation would
 * have made every conversation that exists today own whatever its Journey happened to say.
 */
export function resolveAgentProfile(settings: AgentSettings, workspace: JourneyWorkspace): EffectiveAgentProfile {
  const conversation = settings.conversationOverrides[runtimeWorkspaceKey(workspace)];
  const journey = settings.journeyOverrides[workspace.journeyId];
  const global = settings.globalProfile;
  return {
    journeyId: workspace.journeyId,
    threadId: workspace.threadId,
    model: conversation?.model ?? journey?.model ?? global.model,
    thinkingLevel: conversation?.thinkingLevel ?? journey?.thinkingLevel ?? global.thinkingLevel,
    invocationMode: global.invocationMode,
    modelSource: conversation?.model ? "conversation" : journey?.model ? "journey" : "global",
    thinkingSource: conversation?.thinkingLevel ? "conversation" : journey?.thinkingLevel ? "journey" : "global",
  };
}

// User-facing sentence for the model a send will actually use, naming which
// surface owns it, so nobody has to read raw command arguments (CR053).
export function describeEffectiveAgentProfile(profile: EffectiveAgentProfile): string {
  const model = `${profile.model.provider}/${profile.model.model}`;
  const thinking = profile.thinkingLevel === "pi-default" ? "" : ` · thinking ${profile.thinkingLevel}`;
  const source = profile.modelSource === "conversation"
    ? "this conversation"
    : profile.modelSource === "journey" ? "Journey override" : "global default";
  return `${model}${thinking} — from ${source}`;
}

export function setJourneyAgentOverride(
  settings: AgentSettings,
  journeyId: string,
  override: AgentProfileOverride,
): AgentSettings {
  assertJourneyId(journeyId);
  const nextOverrides = { ...settings.journeyOverrides };
  if (!override.model && !override.thinkingLevel) {
    delete nextOverrides[journeyId];
  } else {
    nextOverrides[journeyId] = parseOverride(override, `journeyOverrides.${journeyId}`);
  }
  return { ...settings, journeyOverrides: nextOverrides };
}

/**
 * CR154: a pick in a conversation is stored as that conversation's own choice, exactly as the
 * Settings Journey panel stores a Journey's. An empty override removes the entry, which is how the
 * conversation goes back to following the Journey.
 *
 * ~~A conversation override that merely repeats what the conversation would inherit is not stored,
 * field by field, and a choice that returns to the inherited value removes the entry. A stored
 * override stops following, so recording one that equals the inherited value would silently turn a
 * follower into a freezer.~~ **Struck: the field refuted this, and it was mine.** The rule was a
 * scope addition nobody asked for, and it made an explicit act a silent no-op — picking the model a
 * conversation already inherited stored nothing, so the conversation never owned the choice and the
 * Navigator's selection was not preserved.
 *
 * The reasoning was right about a *redundant* write and wrong about *this* write. "A stored override
 * stops following" is a cost when nobody chose anything; it is the entire point when the Navigator
 * chose. The asymmetry I had recorded as a decision — that the Settings panel writes unconditionally
 * because it offers an explicit `inherit` while a composer pick "expresses nothing but the pick" —
 * inverted the conclusion: a pick expressing nothing but the pick is precisely a choice to honour.
 * The Navigator asked for the Journey's own semantics one grain finer, and the Journey grain writes
 * what it is given.
 */
export function setConversationAgentOverride(
  settings: AgentSettings,
  workspace: JourneyWorkspace,
  override: AgentProfileOverride,
): AgentSettings {
  const key = runtimeWorkspaceKey(workspace);
  assertConversationKey(key);
  const nextOverrides = { ...settings.conversationOverrides };
  if (!override.model && !override.thinkingLevel) {
    delete nextOverrides[key];
  } else {
    nextOverrides[key] = parseOverride(override, `conversationOverrides.${key}`);
  }
  return { ...settings, conversationOverrides: nextOverrides };
}

export function parseAgentSettings(value: unknown): AgentSettings {
  const root = objectRecord(value, "Agent settings root");
  exactKeys(root, ROOT_KEYS, "Agent settings root");
  if (typeof root.schemaVersion !== "string" || !SUPPORTED_SCHEMA_VERSIONS.has(root.schemaVersion)) {
    throw new Error("Agent settings schema version is unsupported.");
  }

  const profile = objectRecord(root.globalProfile, "Agent settings global profile");
  exactKeys(profile, PROFILE_KEYS, "Agent settings global profile");
  const journeyOverrides = objectRecord(root.journeyOverrides, "Agent settings Journey overrides");
  const parsedOverrides: Record<string, AgentProfileOverride> = {};
  for (const [journeyId, override] of Object.entries(journeyOverrides)) {
    assertJourneyId(journeyId);
    parsedOverrides[journeyId] = parseOverride(override, `journeyOverrides.${journeyId}`);
  }

  // CR154: absent on a 1.0.0 file, which holds no conversation choices by construction.
  const parsedConversations: Record<string, AgentProfileOverride> = {};
  if (root.conversationOverrides !== undefined) {
    const conversationOverrides = objectRecord(root.conversationOverrides, "Agent settings conversation overrides");
    for (const [key, override] of Object.entries(conversationOverrides)) {
      assertConversationKey(key);
      parsedConversations[key] = parseOverride(override, `conversationOverrides.${key}`);
    }
  }

  return {
    schemaVersion: AGENT_SETTINGS_SCHEMA_VERSION,
    globalProfile: {
      model: parseModel(profile.model, "Agent settings global model"),
      thinkingLevel: parseThinkingLevel(profile.thinkingLevel),
      invocationMode: parseInvocationMode(profile.invocationMode),
    },
    journeyOverrides: parsedOverrides,
    conversationOverrides: parsedConversations,
  };
}

export function serializeAgentSettings(settings: AgentSettings): string {
  const parsed = parseAgentSettings(settings);
  return JSON.stringify(parsed, null, 2);
}

function parseOverride(value: unknown, label: string): AgentProfileOverride {
  const override = objectRecord(value, `Agent settings ${label}`);
  exactKeys(override, OVERRIDE_KEYS, `Agent settings ${label}`);
  const parsed: AgentProfileOverride = {};
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

/**
 * CR154: the key is exactly what `runtimeWorkspaceKey` produces — `journeyId|threadId` — so the two
 * segments are validated separately and `|` cannot appear inside either. An empty thread segment is
 * accepted because that is the key a workspace with no thread produces, and rejecting it here would
 * mean the composer had to behave differently depending on whether a thread had resolved yet.
 */
function assertConversationKey(value: string): void {
  const segments = value.split("|");
  if (segments.length !== 2) throw new Error("Agent settings conversation key is invalid.");
  assertJourneyId(segments[0]);
  if (segments[1] !== "" && !JOURNEY_ID.test(segments[1])) {
    throw new Error("Agent settings conversation key is invalid.");
  }
}
