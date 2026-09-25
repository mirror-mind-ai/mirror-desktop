// CR078: a Model Intent binds a Navigator-authored purpose to the configuration that serves
// it, adding a second semantic level above the Pi catalog without changing the first.
//
// This lives outside `agent-settings.json` on purpose. That file validates by exact key
// allowlist as a secret-exclusion guard, and its value rule admits neither spaces nor
// accents, so it cannot express a label a person would write. Intent labels are human text
// and get validation shaped for that; machine identifiers keep the stricter rule.
import { agentThinkingLevels, type AgentModelSelection, type AgentThinkingLevel } from "./agentProfile";

export const MODEL_INTENT_LABEL_MAX_LENGTH = 80;
export const MODEL_INTENTS_MAX = 12;

const INTENT_ID = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/u;
const SAFE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,159}$/u;
// Control characters and the two Unicode line separators: the things a label must not hide.
// Kept to exactly what Rust's `char::is_control` plus U+2028/U+2029 expresses, so the
// TypeScript and native validators cannot drift apart.
const CONTROL_CHARACTER = /[\p{Cc}\p{Zl}\p{Zp}]/u;

const ROOT_KEYS = new Set(["schemaVersion", "intents"]);
const INTENT_KEYS = new Set(["id", "label", "model", "thinkingLevel"]);
const MODEL_KEYS = new Set(["provider", "model"]);

export type ModelIntent = {
  id: string;
  label: string;
  model: AgentModelSelection;
  thinkingLevel: AgentThinkingLevel;
};

export type ModelIntents = {
  schemaVersion: "1.0.0";
  intents: ModelIntent[];
};

export function createEmptyModelIntents(): ModelIntents {
  return { schemaVersion: "1.0.0", intents: [] };
}

/** Trims the label and collapses internal whitespace runs, so stored labels are canonical. */
export function normalizeModelIntentLabel(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function addModelIntent(store: ModelIntents, intent: ModelIntent): ModelIntents {
  const parsed = parseModelIntent(intent);
  if (store.intents.some((existing) => existing.id === parsed.id)) {
    throw new Error("Model intent identity is already used.");
  }
  if (store.intents.length >= MODEL_INTENTS_MAX) {
    throw new Error("Model intents reached their limit.");
  }
  return { ...store, intents: [...store.intents, parsed] };
}

export function updateModelIntent(
  store: ModelIntents,
  id: string,
  patch: Partial<Omit<ModelIntent, "id">>,
): ModelIntents {
  const index = store.intents.findIndex((intent) => intent.id === id);
  if (index < 0) throw new Error("Model intent does not exist.");
  const next = parseModelIntent({ ...store.intents[index], ...patch });
  const intents = [...store.intents];
  intents[index] = next;
  return { ...store, intents };
}

export function removeModelIntent(store: ModelIntents, id: string): ModelIntents {
  return { ...store, intents: store.intents.filter((intent) => intent.id !== id) };
}

export function reorderModelIntent(
  store: ModelIntents,
  id: string,
  direction: "up" | "down",
): ModelIntents {
  const index = store.intents.findIndex((intent) => intent.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= store.intents.length) return store;
  const intents = [...store.intents];
  [intents[index], intents[target]] = [intents[target], intents[index]];
  return { ...store, intents };
}

/**
 * The footer names an intent only when the effective configuration matches it exactly. A
 * partial match would claim a purpose the configuration does not actually serve.
 */
export function matchModelIntent(
  store: ModelIntents,
  profile: { model: AgentModelSelection; thinkingLevel: AgentThinkingLevel },
): ModelIntent | undefined {
  return store.intents.find((intent) => (
    intent.model.provider === profile.model.provider
    && intent.model.model === profile.model.model
    && intent.thinkingLevel === profile.thinkingLevel
  ));
}

export function parseModelIntents(value: unknown): ModelIntents {
  const root = objectRecord(value, "Model intents root");
  exactKeys(root, ROOT_KEYS, "Model intents root");
  if (root.schemaVersion !== "1.0.0") throw new Error("Model intents schema version is unsupported.");
  if (!Array.isArray(root.intents)) throw new Error("Model intents collection is invalid.");
  if (root.intents.length > MODEL_INTENTS_MAX) throw new Error("Model intents reached their limit.");

  const intents = root.intents.map((intent) => parseModelIntent(intent));
  const identities = new Set<string>();
  for (const intent of intents) {
    if (identities.has(intent.id)) throw new Error("Model intent identity is already used.");
    identities.add(intent.id);
  }
  return { schemaVersion: "1.0.0", intents };
}

export function serializeModelIntents(store: ModelIntents): string {
  return JSON.stringify(parseModelIntents(store), null, 2);
}

function parseModelIntent(value: unknown): ModelIntent {
  const intent = objectRecord(value, "Model intent");
  exactKeys(intent, INTENT_KEYS, "Model intent");
  if (typeof intent.id !== "string" || !INTENT_ID.test(intent.id)) {
    throw new Error("Model intent identity is invalid.");
  }
  if (typeof intent.label !== "string") throw new Error("Model intent label is invalid.");
  const label = normalizeModelIntentLabel(intent.label);
  if (!label || label.length > MODEL_INTENT_LABEL_MAX_LENGTH || CONTROL_CHARACTER.test(intent.label)) {
    throw new Error("Model intent label is invalid.");
  }
  return {
    id: intent.id,
    label,
    model: parseModel(intent.model),
    thinkingLevel: parseThinkingLevel(intent.thinkingLevel),
  };
}

function parseModel(value: unknown): AgentModelSelection {
  const model = objectRecord(value, "Model intent model");
  exactKeys(model, MODEL_KEYS, "Model intent model");
  if (typeof model.provider !== "string" || !SAFE_VALUE.test(model.provider) || model.provider.includes("/")) {
    throw new Error("Model intent provider is invalid.");
  }
  if (typeof model.model !== "string" || !SAFE_VALUE.test(model.model)) {
    throw new Error("Model intent model is invalid.");
  }
  return { provider: model.provider, model: model.model };
}

function parseThinkingLevel(value: unknown): AgentThinkingLevel {
  if (typeof value !== "string" || !agentThinkingLevels.includes(value as AgentThinkingLevel)) {
    throw new Error("Model intent thinking level is invalid.");
  }
  return value as AgentThinkingLevel;
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new Error(`${label} contains an unsupported field.`);
  }
  for (const key of allowed) {
    if (!(key in record)) throw new Error(`${label} is missing a required field.`);
  }
}
