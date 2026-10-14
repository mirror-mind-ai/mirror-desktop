import type { ConversationCatalogEntry, ConversationSpaceSelection } from "./conversationSpaces";
import { conversationVisibilityKey } from "./conversationVisibility";

/**
 * CR153: a view filter over whole *kinds* of conversation, which is a different mechanism from
 * CR135's hiding even though the two look alike on screen.
 *
 * CR135 hides a named conversation and writes that choice per Journey. This filters a category and
 * writes nothing about any individual entry. The test that tells them apart is what happens to a
 * conversation of that kind arriving tomorrow: a bulk hide lets it through, because it only ever
 * knew about the entries that existed when it ran, and a filter does not. Implementing this as a
 * bulk hide would have looked correct on the day it shipped and been wrong on the next one.
 *
 * The identity key is borrowed from `conversationVisibility` rather than spelled again. `(kind,
 * conversationId)` is already how the rest of the codebase names an entry, and a second spelling of
 * an identity is how two surfaces start disagreeing about which row is which.
 */
export type ConversationKindFilterResult = {
  entries: ConversationCatalogEntry[];
  /** How many entries the filter removed, for the surface to report. */
  filtered: number;
  /**
   * Set when the selected conversation is of a filtered kind and was therefore kept. The surface
   * marks it rather than presenting it as an ordinary survivor.
   */
  shownBecauseSelected?: string;
};

/**
 * The selected conversation is never filtered out.
 *
 * `partitionConversationVisibility` already refuses to drop it, and records why: a list that omits
 * the conversation the transcript is showing is the CR137 defect — two surfaces disagreeing about
 * whether the Navigator's work exists — except guaranteed rather than incidental. A filter can reach
 * that state more easily than hiding can, because the Navigator never named the entry.
 */
export function applyConversationKindFilter(input: {
  entries: readonly ConversationCatalogEntry[];
  hideMirrorHistory: boolean;
  selected?: ConversationSpaceSelection;
}): ConversationKindFilterResult {
  if (!input.hideMirrorHistory) return { entries: [...input.entries], filtered: 0 };

  const selectedKey = input.selected && input.selected.kind !== "journey_workspace"
    ? conversationVisibilityKey({ kind: input.selected.kind, conversationId: input.selected.conversationId })
    : undefined;

  const entries: ConversationCatalogEntry[] = [];
  let filtered = 0;
  let shownBecauseSelected: string | undefined;

  for (const entry of input.entries) {
    if (entry.kind !== "mirror_history") {
      entries.push(entry);
      continue;
    }
    const key = conversationVisibilityKey(entry);
    if (key === selectedKey) {
      entries.push(entry);
      shownBecauseSelected = key;
      continue;
    }
    filtered += 1;
  }

  return { entries, filtered, ...(shownBecauseSelected ? { shownBecauseSelected } : {}) };
}

export function parseHideMirrorHistory(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
