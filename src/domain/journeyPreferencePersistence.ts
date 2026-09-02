import { findJourneyById, type JourneyListOrder, type JourneyPreferences, type JourneyRegistry } from "./journeyRegistry";

export type PersistedJourneyPreferences = {
  schemaVersion: "0.1.0";
  preferences: JourneyPreferences & {
    journeyListOrder: JourneyListOrder;
    sidebarCompact: boolean;
    lastWorkedAtByJourneyId: Record<string, string>;
  };
  savedAt: string;
};

export type JourneyPreferenceState = PersistedJourneyPreferences["preferences"];

export const defaultJourneyPreferenceState: JourneyPreferenceState = {
  pinnedJourneyIds: [],
  activeJourneyId: "nautilus-harness",
  recentJourneyIds: ["nautilus", "livro-lideranca-soberana", "amplia", "mirror-dev", "softwarezen", "ariad"],
  journeyListOrder: "recent",
  sidebarCompact: false,
  lastWorkedAtByJourneyId: {},
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
  if (!pinnedJourneyIds || !recentJourneyIds || !journeyListOrder || typeof sidebarCompact !== "boolean" || !lastWorkedAtByJourneyId) {
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
  };
}

export function mergeJourneyPreferenceState(
  persisted: PersistedJourneyPreferences | undefined,
  defaults = defaultJourneyPreferenceState,
): JourneyPreferenceState {
  return persisted ? { ...defaults, ...persisted.preferences } : defaults;
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
