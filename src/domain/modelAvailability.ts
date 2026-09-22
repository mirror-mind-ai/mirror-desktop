export type ModelAvailabilityEntry = {
  provider: string;
  model: string;
  available: boolean;
};

export type ModelSelection = { provider: string; model: string };

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
