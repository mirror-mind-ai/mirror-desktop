export type ModelAvailabilityEntry = {
  provider: string;
  model: string;
  available: boolean;
};

export type ModelSelection = { provider: string; model: string };

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
