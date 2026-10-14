import { findJourneyById, type JourneyListOrder, type JourneyPreferences, type JourneyRegistry } from "./journeyRegistry";
import { parseApplicationTheme, type ApplicationTheme } from "./applicationTheme";
import { defaultVoiceLanguage, parseVoiceLanguage, type VoiceLanguage } from "./voiceTranscription";
import {
  parseJourneyAppearanceById,
  sanitizeJourneyAppearanceById,
  type JourneyAppearanceById,
} from "./journeyAppearance";
import {
  EMPTY_HIDDEN_CONVERSATIONS,
  parseHiddenConversations,
  sanitizeHiddenConversations,
  type HiddenConversationsByJourney,
} from "./conversationVisibility";
import {
  EMPTY_CONVERSATION_SELECTION_MEMORY,
  parseConversationSelectionMemory,
  sanitizeConversationSelectionMemory,
  type LastConversationSelectionByJourney,
} from "./conversationSelectionMemory";
import { parseHideMirrorHistory } from "./conversationKindFilter";

export type PersistedJourneyPreferences = {
  schemaVersion: "0.1.0";
  preferences: JourneyPreferences & {
    journeyListOrder: JourneyListOrder;
    sidebarCompact: boolean;
    lastWorkedAtByJourneyId: Record<string, string>;
    applicationTheme: ApplicationTheme;
    journeyAppearanceById: JourneyAppearanceById;
    voiceLanguage: VoiceLanguage;
    // CR133: which Journeys have their conversation disclosure open. Expansion is structural
    // visibility the Navigator chose, so it has to survive a relaunch; before this it was
    // runtime-only state and every reload started collapsed.
    expandedConversationJourneyIds: string[];
    // CR135: which conversations the Navigator put away, keyed per Journey by `kind:conversationId`.
    // The composite key matters: the catalog has two kinds and a bare conversation id could put
    // away a Desktop entry and a Mirror entry in one act.
    hiddenConversationIdsByJourneyId: HiddenConversationsByJourney;
    // CR137: where inside each Journey the Navigator last was, so a relaunch returns them there
    // instead of to the Journey's own workspace. Keyed per Journey because one global value is
    // destroyed by the first Journey switch; absent means the Journey workspace, so there is no
    // third spelling of the default.
    lastConversationSelectionByJourneyId: LastConversationSelectionByJourney;
    // CR153: whether the conversation list shows only Desktop conversations, excluding Mirror
    // history. Global rather than per-Journey, unlike its neighbours above, because the measurement
    // that justified it found 41, 45 and 57 Mirror entries across three Journeys — the noise is
    // universal, so per-Journey would make the Navigator state one intent thirteen times.
    hideMirrorHistory: boolean;
    // CR151: whether a settled or failed turn announces itself with a short tone. Global, and in
    // this file rather than `agent-settings.json`, because that file holds `globalProfile` and
    // `journeyOverrides` — how the *agent* runs — and this is how the *application* behaves, like
    // every neighbour above.
    turnCompletionSound: boolean;
  };
  savedAt: string;
};

export type JourneyPreferenceState = PersistedJourneyPreferences["preferences"];

export const defaultJourneyPreferenceState: JourneyPreferenceState = {
  pinnedJourneyIds: [],
  activeJourneyId: undefined,
  recentJourneyIds: [],
  journeyListOrder: "recent",
  sidebarCompact: false,
  lastWorkedAtByJourneyId: {},
  applicationTheme: "channel",
  journeyAppearanceById: {},
  voiceLanguage: defaultVoiceLanguage,
  expandedConversationJourneyIds: [],
  hiddenConversationIdsByJourneyId: EMPTY_HIDDEN_CONVERSATIONS,
  lastConversationSelectionByJourneyId: EMPTY_CONVERSATION_SELECTION_MEMORY,
  hideMirrorHistory: false,
  // CR151: on, because the Navigator asked for this sound. The caution against a sound that arrives
  // switched on applies to one nobody requested; shipping a requested feature silent makes it look
  // like it never arrived.
  turnCompletionSound: true,
};

export function createPersistedJourneyPreferences(
  preferences: JourneyPreferenceState,
  now: Date = new Date(),
): PersistedJourneyPreferences {
  return {
    schemaVersion: "0.1.0",
    preferences,
    savedAt: now.toISOString(),
  };
}

export function parsePersistedJourneyPreferences(value: unknown): PersistedJourneyPreferences | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "0.1.0" || !record.preferences || typeof record.preferences !== "object") {
    return undefined;
  }

  const preferences = record.preferences as Record<string, unknown>;
  const pinnedJourneyIds = parseStringArray(preferences.pinnedJourneyIds);
  const recentJourneyIds = parseStringArray(preferences.recentJourneyIds);
  const journeyListOrder = parseJourneyListOrder(preferences.journeyListOrder);
  const sidebarCompact = preferences.sidebarCompact === undefined ? false : preferences.sidebarCompact;
  const lastWorkedAtByJourneyId = preferences.lastWorkedAtByJourneyId === undefined
    ? {}
    : parseLastWorkedAtMap(preferences.lastWorkedAtByJourneyId);
  const applicationTheme = preferences.applicationTheme === undefined
    ? "channel"
    : parseApplicationTheme(preferences.applicationTheme);
  const journeyAppearanceById = preferences.journeyAppearanceById === undefined
    ? {}
    : parseJourneyAppearanceById(preferences.journeyAppearanceById);
  // A deliberate departure from the sibling fields below, which discard the whole file when
  // they are invalid. Expansion is cosmetic renderer state and must never be able to reset
  // the Navigator's pins, theme or recents, so a bad value degrades to empty on its own.
  const expandedConversationJourneyIds = parseStringArray(preferences.expandedConversationJourneyIds) ?? [];
  // CR135 follows CR133's departure for the same reason: a conversation the Navigator put away is
  // a presentation choice, and losing it must never be able to cost them their pins or theme.
  const hiddenConversationIdsByJourneyId = preferences.hiddenConversationIdsByJourneyId === undefined
    ? EMPTY_HIDDEN_CONVERSATIONS
    : parseHiddenConversations(preferences.hiddenConversationIdsByJourneyId) ?? EMPTY_HIDDEN_CONVERSATIONS;
  // CR137 follows the same departure: where the Navigator last stood is navigation state, and a
  // bad value must not be able to cost them their pins, theme or recents.
  const lastConversationSelectionByJourneyId = preferences.lastConversationSelectionByJourneyId === undefined
    ? EMPTY_CONVERSATION_SELECTION_MEMORY
    : parseConversationSelectionMemory(preferences.lastConversationSelectionByJourneyId) ?? EMPTY_CONVERSATION_SELECTION_MEMORY;
  // CR153 follows the same departure as CR133, CR135 and CR137: which kinds the Navigator wants to
  // see is a view preference, and an invalid value must never be able to cost them their pins,
  // theme or recents. So it degrades to `false` — showing everything — rather than failing the file.
  const hideMirrorHistory = parseHideMirrorHistory(preferences.hideMirrorHistory) ?? false;
  // CR151 takes the same departure, degrading to the *default* rather than to silence. An
  // unexpected tone is noticed once and switched off; unexpected silence is indistinguishable from
  // the feature being broken, which is the harder failure to report.
  const turnCompletionSound = parseTurnCompletionSoundPreference(preferences.turnCompletionSound)
    ?? defaultJourneyPreferenceState.turnCompletionSound;
  const voiceLanguage = preferences.voiceLanguage === undefined
    ? defaultVoiceLanguage
    : parseVoiceLanguage(preferences.voiceLanguage);
  if (!voiceLanguage) return undefined;
  if (!pinnedJourneyIds || !recentJourneyIds || !journeyListOrder || typeof sidebarCompact !== "boolean" || !lastWorkedAtByJourneyId || !applicationTheme || !journeyAppearanceById) {
    return undefined;
  }

  if (preferences.activeJourneyId !== undefined && typeof preferences.activeJourneyId !== "string") {
    return undefined;
  }

  if (typeof record.savedAt !== "string") {
    return undefined;
  }

  return {
    schemaVersion: "0.1.0",
    preferences: {
      pinnedJourneyIds,
      activeJourneyId: preferences.activeJourneyId,
      recentJourneyIds,
      journeyListOrder,
      sidebarCompact,
      lastWorkedAtByJourneyId,
      applicationTheme,
      journeyAppearanceById,
      voiceLanguage,
      expandedConversationJourneyIds,
      hiddenConversationIdsByJourneyId,
      lastConversationSelectionByJourneyId,
      hideMirrorHistory,
      turnCompletionSound,
    },
    savedAt: record.savedAt,
  };
}

export function sanitizeJourneyPreferenceState(
  preferences: JourneyPreferenceState,
  registry: JourneyRegistry,
): JourneyPreferenceState {
  return {
    pinnedJourneyIds: uniqueExistingJourneyIds(preferences.pinnedJourneyIds, registry),
    activeJourneyId:
      preferences.activeJourneyId && findJourneyById(registry, preferences.activeJourneyId)
        ? preferences.activeJourneyId
        : defaultJourneyPreferenceState.activeJourneyId,
    recentJourneyIds: uniqueExistingJourneyIds(preferences.recentJourneyIds, registry),
    journeyListOrder: preferences.journeyListOrder,
    sidebarCompact: preferences.sidebarCompact,
    lastWorkedAtByJourneyId: Object.fromEntries(
      Object.entries(preferences.lastWorkedAtByJourneyId).filter(([journeyId]) => Boolean(findJourneyById(registry, journeyId))),
    ),
    applicationTheme: preferences.applicationTheme,
    journeyAppearanceById: sanitizeJourneyAppearanceById(preferences.journeyAppearanceById, registry),
    voiceLanguage: preferences.voiceLanguage,
    expandedConversationJourneyIds: uniqueExistingJourneyIds(preferences.expandedConversationJourneyIds, registry),
    hiddenConversationIdsByJourneyId: sanitizeHiddenConversations(preferences.hiddenConversationIdsByJourneyId, registry),
    lastConversationSelectionByJourneyId: sanitizeConversationSelectionMemory(preferences.lastConversationSelectionByJourneyId, registry),
    // CR153: carried through unchanged. It names a kind rather than a Journey, so there is no
    // registry entry it could be stale against — unlike every per-Journey field above it.
    hideMirrorHistory: preferences.hideMirrorHistory,
    // CR151: carried through unchanged for the same reason as its neighbour — it names a behaviour,
    // not a Journey, so there is no registry entry it could be stale against.
    turnCompletionSound: preferences.turnCompletionSound,
  };
}

export function mergeJourneyPreferenceState(
  persisted: PersistedJourneyPreferences | undefined,
  defaults = defaultJourneyPreferenceState,
): JourneyPreferenceState {
  return persisted ? { ...defaults, ...persisted.preferences } : defaults;
}

function parseTurnCompletionSoundPreference(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function parseLastWorkedAtMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 256) return undefined;
  if (entries.some(([journeyId, timestamp]) => !journeyId.trim() || typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp)))) {
    return undefined;
  }
  return Object.fromEntries(entries as Array<[string, string]>);
}

function parseJourneyListOrder(value: unknown): JourneyListOrder | undefined {
  if (value === "name") return "recent";
  return value === "recent" || value === "tree" ? value : undefined;
}

function uniqueExistingJourneyIds(journeyIds: string[], registry: JourneyRegistry): string[] {
  const seen = new Set<string>();
  return journeyIds.filter((journeyId) => {
    if (seen.has(journeyId) || !findJourneyById(registry, journeyId)) {
      return false;
    }
    seen.add(journeyId);
    return true;
  });
}
