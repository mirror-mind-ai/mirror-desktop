export const COMPOSER_DRAFT_MAX_CHARS = 51_200;
export const COMPOSER_DRAFT_MAX_JOURNEYS = 256;

export type ComposerDraftMap = Record<string, string>;

export type PersistedComposerDrafts = {
  schemaVersion: "1.0.0";
  drafts: ComposerDraftMap;
  savedAt: string;
};

const journeyIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export function createPersistedComposerDrafts(
  drafts: ComposerDraftMap,
  now: Date = new Date(),
): PersistedComposerDrafts {
  return {
    schemaVersion: "1.0.0",
    drafts,
    savedAt: now.toISOString(),
  };
}

export function parsePersistedComposerDrafts(value: unknown): PersistedComposerDrafts | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "1.0.0" || !record.drafts || typeof record.drafts !== "object") {
    return undefined;
  }
  if (typeof record.savedAt !== "string" || Number.isNaN(Date.parse(record.savedAt))) {
    return undefined;
  }

  const entries = Object.entries(record.drafts as Record<string, unknown>);
  if (entries.length > COMPOSER_DRAFT_MAX_JOURNEYS) return undefined;
  const drafts: ComposerDraftMap = {};
  for (const [journeyId, text] of entries) {
    if (!journeyIdPattern.test(journeyId)
      || typeof text !== "string"
      || text.length === 0
      || text.length > COMPOSER_DRAFT_MAX_CHARS) {
      return undefined;
    }
    drafts[journeyId] = text;
  }

  return { schemaVersion: "1.0.0", drafts, savedAt: record.savedAt };
}

export function updateComposerDraft(
  current: ComposerDraftMap,
  journeyId: string,
  text: string,
): ComposerDraftMap {
  const next = { ...current };
  if (text.length === 0) {
    delete next[journeyId];
  } else {
    next[journeyId] = text;
  }
  return next;
}
