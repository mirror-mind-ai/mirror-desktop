import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import { isActivePiInvocationLease, type PiInvocationOccupancyState } from "./piInvocationOccupancy";

/**
 * CR143: which conversations inside one Journey are working right now.
 *
 * RS024 made three turns possible inside a Journey and nothing on screen said which three. CR134's
 * `JourneyAgentStatusIndicator` reports that the Journey is working, which was a complete statement
 * while one turn per Journey was the limit and is no longer one.
 *
 * Two states, on the line CR134 already drew: `locusApplies` qualifies a locus only for `working`
 * and `finishing`, because the terminal states describe what already happened. A list entry answers
 * *is this one running*, which is the live question, so the terminal states are deliberately not
 * represented here.
 */
export type ConversationWorkState = "working" | "finishing";

export type ConversationWorkByThread = ReadonlyMap<string, ConversationWorkState>;

/**
 * Total over the state space the validator admits, which is narrower than it looks.
 *
 * `validatePiInvocationRegistryInspection` requires `reserved` and `running` to carry
 * `terminalState: "open"`, and requires `finalizing` to carry `processCapacityState: "released"`
 * and `terminalState !== "open"`. So **every lease in a valid inspection is either active or
 * finalizing** — there is no third shape — and a lease that is finished is not marked terminal,
 * it is removed by `retire_finalizing_workspace`.
 *
 * That matters because the obvious filter is wrong in two different ways. `liveWorkspacesInJourney`
 * excludes `finalizing`, so a settling conversation would read as idle. And filtering on
 * `terminalState === "open"` first — which is what `deriveJourneyWorkLocus` does — makes the
 * `finalizing` branch **unreachable**, so the `finishing` state would never appear at all. The
 * first version of this function copied that filter from its neighbour and the characterisation
 * below caught it.
 *
 * No gate on `state.status`. `beginPiInvocationReconciliation` carries `entries` forward unchanged,
 * so the last known truth stays on screen through a reconciliation instead of every mark blinking
 * off and back on. An unknown occupancy has no entries at all, so it marks nothing without having
 * to say so.
 *
 * The Journey's own root thread is never a listed conversation — `parseConversationCatalog`
 * guarantees root and child threads are distinct — so its work stays where CR134 put it, on the
 * Journey row, without needing to be excluded here.
 */
export function deriveConversationWork(
  occupancy: PiInvocationOccupancyState,
  journeyId: string,
): ConversationWorkByThread {
  const work = new Map<string, ConversationWorkState>();
  for (const entry of occupancy.entries) {
    if (entry.authority.journeyId !== journeyId) continue;
    work.set(entry.authority.threadId, isActivePiInvocationLease(entry) ? "working" : "finishing");
  }
  return work;
}

export type ConversationWorkSummary = {
  working: number;
  finishing: number;
};

export const NO_CONVERSATION_WORK: ConversationWorkSummary = { working: 0, finishing: 0 };

/**
 * The count for a *subset* of entries, which is what the two closed controls need.
 *
 * A conversation can be invisible in two ways, and the Navigator chose only one of them: CR135's
 * hiding, and the list's own cap of six. Both conceal running work, so both controls have to carry
 * this. Taking the entries as an argument rather than reading the whole catalog is what keeps the
 * hidden count from including a visible conversation, and the other way round.
 */
export function summariseConversationWork(
  work: ConversationWorkByThread,
  entries: readonly ConversationCatalogEntry[],
): ConversationWorkSummary {
  let working = 0;
  let finishing = 0;
  for (const entry of entries) {
    // A Mirror history entry has no thread that can hold a lease, so it can never be working.
    if (entry.kind !== "desktop_conversation") continue;
    const state = work.get(entry.threadId);
    if (state === "working") working += 1;
    else if (state === "finishing") finishing += 1;
  }
  return { working, finishing };
}

/** The sentence a closed control appends, or nothing when its own partition is quiet. */
export function describeHiddenWork(summary: ConversationWorkSummary): string | undefined {
  const live = summary.working + summary.finishing;
  if (live === 0) return undefined;
  return live === 1 ? "1 working" : `${live} working`;
}
