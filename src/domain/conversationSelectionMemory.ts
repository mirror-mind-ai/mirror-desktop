import type {
  ConversationCatalogEntry,
  ConversationSpaceSelection,
  DesktopConversationSelection,
  JourneyWorkspaceSelection,
  MirrorHistorySelection,
} from "./conversationSpaces";
import { isConversationHidden, type HiddenConversationsByJourney } from "./conversationVisibility";
import { findJourneyById, type JourneyRegistry } from "./journeyRegistry";

/**
 * CR137: where inside a Journey the Navigator was, so a relaunch can put them back.
 *
 * `activeJourneyId` has always been persisted and CR133 added expansion, but no conversation
 * coordinate was stored anywhere, so the selection reducer started at a Journey workspace and
 * `resolveSelectedConversationSpace` resolved it to the restored Journey's own workspace. CR133
 * made that gap *visible* rather than causing it: the group comes back open with the conversation
 * right there in the list while the main surface shows the Journey.
 *
 * **The memory is per Journey, and that is the only mechanism needed.** A single global "last
 * workspace" restores correctly once and is then destroyed by the first Journey switch, leaving
 * "come back to A and be where I was in A" unanswered. A per-Journey map subsumes it: restoring is
 * `memory[activeJourneyId]`. Whether to *also* honour the map on every in-session Journey switch is
 * deliberately a separate decision — this CR restores at startup only, because
 * `resolveSelectedConversationSpace`'s degrade-on-mismatch is a design CR133 chose on purpose and
 * widening it is not this CR's business.
 *
 * **Absence means the Journey workspace**, so selecting the workspace *deletes* the key rather than
 * storing a third kind. That is CR135's idiom in `revealConversation`, for CR135's reason: a Journey
 * whose answer is the default should not occupy the budget, and two spellings of one state is how
 * §5b's absence-versus-emptiness confusion starts.
 *
 * The coordinate is `(kind, conversationId)` — the pair the rest of the codebase already treats as
 * an entry's identity, and the pair `conversationVisibilityKey` is built from. A bare conversation
 * id could not distinguish a Desktop entry from a Mirror entry.
 */
export type ConversationSelectionCoordinate = {
  kind: "desktop_conversation" | "mirror_history";
  conversationId: string;
};

export type LastConversationSelectionByJourney = Readonly<Record<string, ConversationSelectionCoordinate>>;

export const EMPTY_CONVERSATION_SELECTION_MEMORY: LastConversationSelectionByJourney = {};

/** Bounded like its neighbours in the preference file, for the same reason. */
export const MAX_REMEMBERED_SELECTION_JOURNEYS = 256;

const COORDINATE_KINDS = ["desktop_conversation", "mirror_history"] as const;

export function rememberConversationSelection(
  memory: LastConversationSelectionByJourney,
  selection: ConversationSpaceSelection,
): LastConversationSelectionByJourney {
  if (!selection.journeyId.trim()) return memory;
  if (selection.kind === "journey_workspace") {
    if (!(selection.journeyId in memory)) return memory;
    const next = { ...memory };
    delete next[selection.journeyId];
    return next;
  }
  const current = memory[selection.journeyId];
  if (current && current.kind === selection.kind && current.conversationId === selection.conversationId) {
    return memory;
  }
  if (!(selection.journeyId in memory) && Object.keys(memory).length >= MAX_REMEMBERED_SELECTION_JOURNEYS) {
    return memory;
  }
  return {
    ...memory,
    [selection.journeyId]: { kind: selection.kind, conversationId: selection.conversationId },
  };
}

/**
 * Drops a Journey's coordinate. Called when the conversation it names is deleted, so a later
 * conversation cannot inherit a stale landing place through a reused identifier — the same reason
 * CR135 forgets a hidden key on deletion.
 */
export function forgetConversationSelection(
  memory: LastConversationSelectionByJourney,
  journeyId: string,
  entry: { kind: ConversationSelectionCoordinate["kind"]; conversationId: string },
): LastConversationSelectionByJourney {
  const current = memory[journeyId];
  if (!current || current.kind !== entry.kind || current.conversationId !== entry.conversationId) return memory;
  const next = { ...memory };
  delete next[journeyId];
  return next;
}

export type RestoredSelectionRefusal =
  | "no_memory"
  | "catalog_unavailable"
  | "conversation_missing"
  | "conversation_hidden";

export type RestoredConversationSelection =
  | { restored: false; reason: RestoredSelectionRefusal; selection: JourneyWorkspaceSelection }
  | { restored: true; selection: DesktopConversationSelection | MirrorHistorySelection };

/**
 * Decides where a relaunch lands, and degrades to the Journey workspace for every reason it cannot
 * land inside a conversation. Each refusal is named rather than collapsed into one falsy value,
 * because "there was nothing stored" and "what was stored is hidden" are different facts and only
 * one of them is worth a future surface.
 *
 * `entries === undefined` means the catalog is not ready, and it is a *refusal* rather than a wait:
 * the caller is responsible for loading the catalog first, and it must be, because
 * `selectedConversationEntry` (`App.tsx`) is derived from the catalog and the conversation-load
 * effect falls back to the Journey's root thread when that entry is missing. Dispatching a
 * conversation selection against an empty catalog would therefore show the Journey's transcript
 * beneath a conversation selection — manufacturing precisely the two-surfaces-disagree defect this
 * CR exists to remove.
 *
 * A hidden conversation is refused, and that is the one place this diverges from CR134 on purpose.
 * CR134's route reaches a hidden conversation deliberately, because work is really running there
 * and the Navigator asked to be taken to it. Nobody asked for this one: restoring a conversation
 * the Navigator put away would undo a choice they made, so CR135 wins here and CR134 keeps winning
 * there.
 */
export function resolveRestoredConversationSelection(input: {
  memory: LastConversationSelectionByJourney;
  journeyId: string;
  entries: readonly ConversationCatalogEntry[] | undefined;
  hidden: HiddenConversationsByJourney;
}): RestoredConversationSelection {
  const workspace: JourneyWorkspaceSelection = { kind: "journey_workspace", journeyId: input.journeyId };
  const refuse = (reason: RestoredSelectionRefusal): RestoredConversationSelection => (
    { restored: false, reason, selection: workspace }
  );

  if (!input.journeyId.trim()) return refuse("no_memory");
  const coordinate = input.memory[input.journeyId];
  if (!coordinate) return refuse("no_memory");
  if (input.entries === undefined) return refuse("catalog_unavailable");

  const match = input.entries.find((entry) => (
    entry.kind === coordinate.kind && entry.conversationId === coordinate.conversationId
  ));
  if (!match) return refuse("conversation_missing");
  if (isConversationHidden(input.hidden, input.journeyId, coordinate)) return refuse("conversation_hidden");

  return {
    restored: true,
    selection: {
      kind: coordinate.kind,
      journeyId: input.journeyId,
      conversationId: coordinate.conversationId,
    } as DesktopConversationSelection | MirrorHistorySelection,
  };
}

/**
 * A malformed value degrades to empty rather than discarding the whole preference file. CR133 made
 * that departure for expansion and CR135 followed it for hiding, both for the same reason: where
 * the Navigator last stood is navigation state, and losing it must never be able to cost them their
 * pins, theme or recents.
 */
export function parseConversationSelectionMemory(value: unknown): LastConversationSelectionByJourney | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_REMEMBERED_SELECTION_JOURNEYS) return undefined;
  const parsed: Record<string, ConversationSelectionCoordinate> = {};
  for (const [journeyId, coordinate] of entries) {
    if (!journeyId.trim()) return undefined;
    if (!coordinate || typeof coordinate !== "object" || Array.isArray(coordinate)) return undefined;
    const candidate = coordinate as Record<string, unknown>;
    const keys = Object.keys(candidate);
    if (keys.length !== 2 || !keys.includes("kind") || !keys.includes("conversationId")) return undefined;
    if (typeof candidate.conversationId !== "string" || !candidate.conversationId.trim()) return undefined;
    if (!COORDINATE_KINDS.some((kind) => kind === candidate.kind)) return undefined;
    parsed[journeyId] = {
      kind: candidate.kind as ConversationSelectionCoordinate["kind"],
      conversationId: candidate.conversationId,
    };
  }
  return parsed;
}

export function sanitizeConversationSelectionMemory(
  memory: LastConversationSelectionByJourney,
  registry: JourneyRegistry,
): LastConversationSelectionByJourney {
  return Object.fromEntries(
    Object.entries(memory).filter(([journeyId]) => Boolean(findJourneyById(registry, journeyId))),
  );
}
