export type UnsentDraftNotices = Record<string, string | undefined>;

// The provider's own warning names the cause ('No models match pattern ...');
// the thrown process failure only reports the exit status that followed it.
export function resolveUnsentReason(
  providerWarnings: readonly string[],
  processFailure: string,
): string {
  const specific = [...providerWarnings].reverse().find((warning) => warning.trim().length > 0);
  return specific ?? processFailure;
}

export function recordUnsentDraft(
  current: UnsentDraftNotices,
  journeyId: string,
  message: string,
): UnsentDraftNotices {
  return { ...current, [journeyId]: message };
}

export function clearUnsentDraft(
  current: UnsentDraftNotices,
  journeyId: string,
): UnsentDraftNotices {
  if (!(journeyId in current) || current[journeyId] === undefined) return current;
  const next = { ...current };
  delete next[journeyId];
  return next;
}
