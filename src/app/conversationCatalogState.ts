import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

// CR133: the conversation catalog, its status, its error and the focused root thread id used
// to be one set of state for the whole application, cleared whenever the selected Journey
// changed. That clearing is what made an expanded group lose its contents the moment the
// Navigator went somewhere else. Keyed by Journey, several groups can stay loaded at once,
// and a load can be abandoned on its own terms instead of on the selection's.
export type JourneyConversationCatalogState = {
  entries: ConversationCatalogEntry[];
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  rootThreadId?: string;
  // The latest load issued for this Journey. A result carrying an older id lost a race and
  // is discarded, which replaces the old "is this Journey still selected" abort guard.
  requestId: number;
};

export type JourneyConversationCatalogs = Readonly<Record<string, JourneyConversationCatalogState>>;

const IDLE_CATALOG_STATE: JourneyConversationCatalogState = { entries: [], status: "idle", requestId: 0 };

export const EMPTY_JOURNEY_CONVERSATION_CATALOGS: JourneyConversationCatalogs = {};

export function journeyCatalogState(
  catalogs: JourneyConversationCatalogs,
  journeyId: string,
): JourneyConversationCatalogState {
  return catalogs[journeyId] ?? IDLE_CATALOG_STATE;
}

export function beginJourneyCatalogLoad(
  catalogs: JourneyConversationCatalogs,
  journeyId: string,
  requestId: number,
): JourneyConversationCatalogs {
  const current = journeyCatalogState(catalogs, journeyId);
  return {
    ...catalogs,
    // Entries are retained while reloading so a re-expanded group shows what it had instead
    // of flashing empty. The status still says loading, so the surface stays honest.
    [journeyId]: { ...current, status: "loading", error: undefined, requestId },
  };
}

export function completeJourneyCatalogLoad(
  catalogs: JourneyConversationCatalogs,
  journeyId: string,
  requestId: number,
  payload: { entries: ConversationCatalogEntry[]; rootThreadId: string },
): JourneyConversationCatalogs {
  if (journeyCatalogState(catalogs, journeyId).requestId !== requestId) return catalogs;
  return {
    ...catalogs,
    [journeyId]: {
      entries: payload.entries,
      status: "ready",
      error: undefined,
      rootThreadId: payload.rootThreadId,
      requestId,
    },
  };
}

export function failJourneyCatalogLoad(
  catalogs: JourneyConversationCatalogs,
  journeyId: string,
  requestId: number,
  error: string,
): JourneyConversationCatalogs {
  const current = journeyCatalogState(catalogs, journeyId);
  if (current.requestId !== requestId) return catalogs;
  return { ...catalogs, [journeyId]: { ...current, status: "error", error } };
}

export function updateJourneyCatalogEntries(
  catalogs: JourneyConversationCatalogs,
  journeyId: string,
  updater: (entries: ConversationCatalogEntry[]) => ConversationCatalogEntry[],
): JourneyConversationCatalogs {
  const current = journeyCatalogState(catalogs, journeyId);
  return { ...catalogs, [journeyId]: { ...current, entries: updater(current.entries) } };
}
