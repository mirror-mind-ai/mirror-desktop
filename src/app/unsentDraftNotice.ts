export type UnsentDraftNotices = Record<string, string | undefined>;

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
