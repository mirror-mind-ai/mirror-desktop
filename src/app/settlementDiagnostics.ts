export type ExactSettlementIdentity = Readonly<{
  journeyId: string;
  runId: string;
  turnId: string;
}>;

export type ExactSettlementError = ExactSettlementIdentity & Readonly<{
  message: string;
}>;

function exactSettlementErrorKey(identity: ExactSettlementIdentity): string {
  return `${identity.journeyId}\u0000${identity.runId}\u0000${identity.turnId}`;
}

export function updateExactSettlementError(
  current: Record<string, ExactSettlementError>,
  identity: ExactSettlementIdentity,
  message: string | undefined,
): Record<string, ExactSettlementError> {
  const key = exactSettlementErrorKey(identity);
  if (message === undefined) {
    if (!(key in current)) return current;
    const next = { ...current };
    delete next[key];
    return next;
  }
  return { ...current, [key]: { ...identity, message } };
}

export function projectJourneySettlementErrors(
  journeyErrors: Record<string, string | undefined>,
  exactErrors: Record<string, ExactSettlementError>,
): Record<string, string | undefined> {
  const projected = { ...journeyErrors };
  const grouped = new Map<string, ExactSettlementError[]>();
  for (const error of Object.values(exactErrors)) {
    const errors = grouped.get(error.journeyId) ?? [];
    errors.push(error);
    grouped.set(error.journeyId, errors);
  }
  for (const [journeyId, errors] of grouped) {
    const journeyError = projected[journeyId];
    if (journeyError) {
      // CR118: the settlement `catch` records one failure both as the Journey's reason and as an
      // exact run debt, so a single throw was announced as itself plus a count of itself. An exact
      // debt that merely repeats the named failure adds nothing a reader can act on.
      const additional = errors.filter((error) => error.message !== journeyError);
      if (!additional.length) continue;
      projected[journeyId] = `${journeyError} ${additional.length} exact Mirror settlement ${additional.length === 1 ? "operation" : "operations"} also need${additional.length === 1 ? "s" : ""} attention.`;
    } else {
      projected[journeyId] = errors.length === 1
        ? errors[0].message
        : `${errors.length} Mirror settlement operations need attention.`;
    }
  }
  return projected;
}
