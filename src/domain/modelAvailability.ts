import { agentThinkingLevels, type AgentThinkingLevel } from "./agentProfile";

export type ModelAvailabilityEntry = {
  provider: string;
  model: string;
  available: boolean;
};

export type ModelSelection = { provider: string; model: string };

// A catalog entry as far as selection is concerned: whether it can run and whether it thinks.
export type ModelCapabilityEntry = ModelAvailabilityEntry & { thinking: boolean };

// Selection helpers, shared by every model surface. They encode a selection as one option
// value because HTML selects carry strings, and a tab cannot appear in either half.
export function modelOptionValue(model: ModelSelection): string {
  return `${model.provider}\t${model.model}`;
}

export function modelFromOptionValue(value: string): ModelSelection {
  const separator = value.indexOf("\t");
  if (separator <= 0 || separator === value.length - 1) throw new Error("Select a valid Pi model.");
  return { provider: value.slice(0, separator), model: value.slice(separator + 1) };
}

export function uniqueModelOptions(models: ModelSelection[]): ModelSelection[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    const key = modelOptionValue(model);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => modelOptionValue(left).localeCompare(modelOptionValue(right)));
}

export function modelKeyUnavailableReason(
  catalog: readonly ModelAvailabilityEntry[],
  modelKey: string,
): string | undefined {
  try {
    return unavailableModelReason(catalog, modelFromOptionValue(modelKey));
  } catch {
    return undefined;
  }
}

// Unknown models are assumed to think, keeping Pi the authority on what it can run.
export function modelSupportsThinking(catalog: readonly ModelCapabilityEntry[], modelKey: string): boolean {
  const model = modelFromOptionValue(modelKey);
  return catalog.find((entry) => entry.provider === model.provider && entry.model === model.model)?.thinking ?? true;
}

export function thinkingOptions(
  catalog: readonly ModelCapabilityEntry[],
  modelKey: string,
  current?: AgentThinkingLevel,
): AgentThinkingLevel[] {
  if (modelSupportsThinking(catalog, modelKey)) return [...agentThinkingLevels];
  const supported: AgentThinkingLevel[] = ["pi-default", "off"];
  if (current && !supported.includes(current)) supported.push(current);
  return supported;
}

// CR090: a model chosen while a turn is alive is a preference for the next turn. The running
// child keeps the configuration it was spawned with, so the interface must say which turn a
// new selection reaches instead of implying the live one changed.
export type ModelSelectionScope = "applies_now" | "applies_to_next_message";

export function deriveModelSelectionScope(input: {
  /** Model the currently running turn started with, absent when nothing is running. */
  liveRunProviderModel?: string;
  selectedProviderModel: string;
}): ModelSelectionScope {
  if (!input.liveRunProviderModel) return "applies_now";
  return input.liveRunProviderModel === input.selectedProviderModel
    ? "applies_now"
    : "applies_to_next_message";
}

// Only a catalog entry explicitly marked unavailable yields a reason: models
// unknown to the catalog pass through so Pi stays the authority on them.
export function unavailableModelReason(
  catalog: readonly ModelAvailabilityEntry[],
  model: ModelSelection,
): string | undefined {
  const entry = catalog.find(
    (candidate) => candidate.provider === model.provider && candidate.model === model.model,
  );
  if (!entry || entry.available) return undefined;
  return `The model ${model.provider}/${model.model} is provided by a Pi extension that Mirror Desktop could not load, so this send cannot run it. Choose an available model.`;
}
