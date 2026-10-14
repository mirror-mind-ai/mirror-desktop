import type { ConversationCatalogEntry, ConversationSpaceSelection } from "./conversationSpaces";
import { findJourneyById, type JourneyRegistry } from "./journeyRegistry";

/**
 * CR135: which conversations the Navigator has chosen to keep out of a Journey's ordinary
 * conversation list.
 *
 * Two properties carry the whole CR and both are structural rather than conventional.
 *
 * The key is composite. The catalog is a union of `desktop_conversation` and `mirror_history`,
 * and the rest of the codebase already treats `(kind, conversationId)` as an entry's identity —
 * the sidebar's list key and its selected comparison both use the pair. A set keyed on the
 * conversation id alone could put away a Desktop entry and a Mirror entry in one act.
 *
 * And hiding is a *render* filter. Nothing here removes an entry from the catalog state, so
 * CR134's route still resolves a hidden conversation and the Journey row still carries its
 * running work. That is what makes RS023's visibility invariant true by construction rather
 * than by vigilance.
 *
 * The Journey's own workspace is deliberately absent from this module: `journey_workspace` is a
 * selection kind and never a catalog entry, so it cannot be hidden. CR134 built the guaranteed
 * carrier of running work on that row, and a hideable Journey workspace would contradict the
 * invariant this Story inherits.
 */
export type HiddenConversationsByJourney = Readonly<Record<string, readonly string[]>>;

export const EMPTY_HIDDEN_CONVERSATIONS: HiddenConversationsByJourney = {};

/** Journeys tracked at once, and hidden keys retained per Journey. */
export const MAX_HIDDEN_CONVERSATION_JOURNEYS = 256;
export const MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY = 256;

type EntryIdentity = Pick<ConversationCatalogEntry, "kind" | "conversationId">;

export function conversationVisibilityKey(entry: EntryIdentity): string {
  return `${entry.kind}:${entry.conversationId}`;
}

export function hiddenConversationKeys(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
): ReadonlySet<string> {
  return new Set(hidden[journeyId] ?? []);
}

export function isConversationHidden(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
  entry: EntryIdentity,
): boolean {
  return (hidden[journeyId] ?? []).includes(conversationVisibilityKey(entry));
}

export function hideConversation(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
  entry: EntryIdentity,
): HiddenConversationsByJourney {
  const key = conversationVisibilityKey(entry);
  const current = hidden[journeyId] ?? [];
  if (current.includes(key)) return hidden;
  if (current.length >= MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY) return hidden;
  if (!(journeyId in hidden) && Object.keys(hidden).length >= MAX_HIDDEN_CONVERSATION_JOURNEYS) return hidden;
  return { ...hidden, [journeyId]: [...current, key] };
}

export type BulkHideResult = {
  hidden: HiddenConversationsByJourney;
  /** How many entries this act actually put away. Already hidden ones are not counted again. */
  hiddenCount: number;
  /**
   * How many it could not, because the Journey is at `MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY`.
   *
   * CR152: `hideConversation` returns the state unchanged at the cap, which is right for one
   * deliberate act and wrong as the basis of a bulk one — it would put some conversations away and
   * abandon the rest with nothing said. So this is a result rather than only a state, and the
   * surface reports the shortfall instead of leaving the Navigator to count rows.
   */
  skippedForCap: number;
};

/**
 * CR152: hide every conversation in a Journey except the one the Navigator is working in.
 *
 * `revealAllConversations` has existed since CR135 as the all-at-once reveal; this is the symmetric
 * act that was missing. It is built on `hideConversation` rather than beside it, so the caps and the
 * composite key keep living in exactly one place, and a no-op is detected by reference equality —
 * which is precisely what `hideConversation` guarantees when it declines.
 *
 * A conversation with live work is hidden like any other, deliberately. Hiding is a render filter:
 * nothing leaves the catalog, CR134's route still resolves a hidden conversation, the Journey row
 * still carries its running work, and CR143 puts the running count on the *closed* hidden control.
 * A refusal here would fail for a reason the Navigator cannot see, to protect against something the
 * surface already answers.
 */
export function hideEveryOtherConversation(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
  entries: readonly EntryIdentity[],
  keep: EntryIdentity,
): BulkHideResult {
  const keepKey = conversationVisibilityKey(keep);
  let next = hidden;
  let hiddenCount = 0;
  let skippedForCap = 0;

  for (const entry of entries) {
    const key = conversationVisibilityKey(entry);
    if (key === keepKey) continue;
    if (isConversationHidden(next, journeyId, entry)) continue;
    const candidate = hideConversation(next, journeyId, entry);
    if (candidate === next) {
      skippedForCap += 1;
      continue;
    }
    next = candidate;
    hiddenCount += 1;
  }

  return { hidden: next, hiddenCount, skippedForCap };
}

export function revealConversation(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
  entry: EntryIdentity,
): HiddenConversationsByJourney {
  const key = conversationVisibilityKey(entry);
  const current = hidden[journeyId] ?? [];
  if (!current.includes(key)) return hidden;
  const remaining = current.filter((candidate) => candidate !== key);
  const next = { ...hidden };
  // An empty list and an absent Journey mean the same thing here, so the absent form is the
  // one that gets written. A Journey that has nothing hidden should not occupy the budget.
  if (remaining.length === 0) delete next[journeyId];
  else next[journeyId] = remaining;
  return next;
}

export function revealAllConversations(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
): HiddenConversationsByJourney {
  if (!(journeyId in hidden)) return hidden;
  const next = { ...hidden };
  delete next[journeyId];
  return next;
}

/**
 * Drops every hidden key for a conversation that no longer exists. Called when a conversation is
 * deleted, so a later conversation cannot inherit a stale choice through a reused identifier.
 */
export function forgetConversationVisibility(
  hidden: HiddenConversationsByJourney,
  journeyId: string,
  entry: EntryIdentity,
): HiddenConversationsByJourney {
  return revealConversation(hidden, journeyId, entry);
}

export type ConversationVisibilityPartition = {
  visible: ConversationCatalogEntry[];
  hidden: ConversationCatalogEntry[];
  /**
   * Set when the selected conversation is hidden and was therefore forced into `visible`.
   * The surface marks it rather than showing it as an ordinary member of the working set.
   */
  shownBecauseSelected?: string;
};

/**
 * A hidden conversation that is currently selected is still rendered, marked.
 *
 * CR134's route reads entries from the catalog state rather than from this list, so it will
 * successfully land the Navigator inside a hidden conversation. Were the list to omit it, the
 * list would deny the existence of the conversation the transcript is showing — the same
 * two-surfaces-disagree defect used to characterise CR137, except here it would be guaranteed
 * rather than incidental.
 */
export function partitionConversationVisibility(input: {
  entries: readonly ConversationCatalogEntry[];
  hidden: HiddenConversationsByJourney;
  journeyId: string;
  selected?: ConversationSpaceSelection;
}): ConversationVisibilityPartition {
  const keys = hiddenConversationKeys(input.hidden, input.journeyId);
  const selectedKey = input.selected && input.selected.kind !== "journey_workspace"
    ? conversationVisibilityKey({ kind: input.selected.kind, conversationId: input.selected.conversationId })
    : undefined;

  const visible: ConversationCatalogEntry[] = [];
  const hidden: ConversationCatalogEntry[] = [];
  let shownBecauseSelected: string | undefined;

  for (const entry of input.entries) {
    const key = conversationVisibilityKey(entry);
    if (!keys.has(key)) {
      visible.push(entry);
      continue;
    }
    if (key === selectedKey) {
      visible.push(entry);
      shownBecauseSelected = key;
      continue;
    }
    hidden.push(entry);
  }

  return { visible, hidden, ...(shownBecauseSelected ? { shownBecauseSelected } : {}) };
}

export function parseHiddenConversations(value: unknown): HiddenConversationsByJourney | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_HIDDEN_CONVERSATION_JOURNEYS) return undefined;
  const parsed: Record<string, readonly string[]> = {};
  for (const [journeyId, keys] of entries) {
    if (!journeyId.trim()) return undefined;
    if (!Array.isArray(keys) || keys.some((key) => typeof key !== "string" || !key.trim())) return undefined;
    if (keys.length > MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY) return undefined;
    const unique = [...new Set(keys as string[])];
    if (unique.length > 0) parsed[journeyId] = unique;
  }
  return parsed;
}

export function sanitizeHiddenConversations(
  hidden: HiddenConversationsByJourney,
  registry: JourneyRegistry,
): HiddenConversationsByJourney {
  return Object.fromEntries(
    Object.entries(hidden).filter(([journeyId]) => Boolean(findJourneyById(registry, journeyId))),
  );
}
