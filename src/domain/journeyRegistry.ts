export type JourneyRegistryItem = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  stage?: string;
  parentId?: string;
  projectPath?: string;
  children?: JourneyRegistryItem[];
};

export type JourneyRegistry = {
  schemaVersion: "0.1.0";
  source: "mirror" | "fixture";
  syncedAt: string;
  roots: JourneyRegistryItem[];
};

export type JourneyPreferences = {
  pinnedJourneyIds: string[];
  activeJourneyId?: string;
  recentJourneyIds: string[];
};

export type JourneyListOrder = "recent" | "name" | "tree";

export type FlattenedJourney = JourneyRegistryItem & {
  breadcrumb: string[];
  depth: number;
};

export type SidebarJourneyVisibilityReason = "pinned" | "active" | "recent" | "fallback" | "search" | "ordered";

export type SidebarJourneyItem = FlattenedJourney & {
  pinned: boolean;
  active: boolean;
  reasonVisible: SidebarJourneyVisibilityReason;
};

export function flattenJourneyRegistry(registry: JourneyRegistry): FlattenedJourney[] {
  return registry.roots.flatMap((root) => flattenJourney(root, [], 0));
}

export function findJourneyById(registry: JourneyRegistry, journeyId: string): FlattenedJourney | undefined {
  return flattenJourneyRegistry(registry).find((journey) => journey.id === journeyId);
}

export function journeyBreadcrumb(registry: JourneyRegistry, journeyId: string): string[] {
  return findJourneyById(registry, journeyId)?.breadcrumb ?? [];
}

export function searchJourneyRegistry(registry: JourneyRegistry, query: string): FlattenedJourney[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  return flattenJourneyRegistry(registry).filter((journey) =>
    normalizeSearchText([
      journey.id,
      journey.name,
      journey.description,
      journey.status,
      journey.stage,
      journey.breadcrumb.join(" "),
    ].filter(Boolean).join(" ")).includes(normalizedQuery),
  );
}

export function validateJourneyRegistry(registry: JourneyRegistry): string[] {
  const errors: string[] = [];
  if (registry.schemaVersion !== "0.1.0") {
    errors.push("Unsupported Journey registry schema version.");
  }
  if (!registry.syncedAt.trim()) {
    errors.push("Journey registry syncedAt is required.");
  }

  const seenIds = new Set<string>();
  for (const journey of flattenJourneyRegistry(registry)) {
    if (!journey.id.trim()) {
      errors.push("Journey id is required.");
    }
    if (seenIds.has(journey.id)) {
      errors.push(`Duplicate Journey id: ${journey.id}`);
    }
    seenIds.add(journey.id);
  }

  return errors;
}

export function deriveSidebarJourneys(
  registry: JourneyRegistry,
  preferences: JourneyPreferences,
  fallbackLimit = 5,
): SidebarJourneyItem[] {
  const flattened = flattenJourneyRegistry(registry);
  const byId = new Map(flattened.map((journey) => [journey.id, journey]));
  const activeJourneyId = preferences.activeJourneyId;
  const selected = new Map<string, SidebarJourneyVisibilityReason>();

  for (const id of preferences.pinnedJourneyIds) {
    if (byId.has(id)) {
      selected.set(id, "pinned");
    }
  }

  if (activeJourneyId && byId.has(activeJourneyId) && !selected.has(activeJourneyId)) {
    selected.set(activeJourneyId, "active");
  }

  for (const id of preferences.recentJourneyIds) {
    if (byId.has(id) && !selected.has(id)) {
      selected.set(id, "recent");
    }
  }

  if (selected.size === 0) {
    for (const journey of registry.roots.slice(0, fallbackLimit)) {
      selected.set(journey.id, "fallback");
    }
  }

  const orderedIds = uniqueIds([
    ...preferences.recentJourneyIds,
    ...(activeJourneyId ? [activeJourneyId] : []),
    ...preferences.pinnedJourneyIds,
    ...flattened.map((journey) => journey.id),
  ]).filter((id) => selected.has(id) && byId.has(id));

  return orderedIds.map((id) =>
    toSidebarJourneyItem(byId.get(id)!, activeJourneyId, preferences.pinnedJourneyIds, selected.get(id)!),
  );
}

export function markJourneyRecent(
  preferences: JourneyPreferences,
  journeyId: string,
  limit = 8,
): JourneyPreferences {
  return {
    ...preferences,
    recentJourneyIds: [
      journeyId,
      ...preferences.recentJourneyIds.filter((id) => id !== journeyId),
    ].slice(0, limit),
  };
}

export function deriveOrderedSidebarJourneys(
  registry: JourneyRegistry,
  preferences: JourneyPreferences,
  order: JourneyListOrder,
): SidebarJourneyItem[] {
  if (order === "recent") {
    return deriveSidebarJourneys(registry, preferences);
  }

  return orderFlattenedJourneys(flattenJourneyRegistry(registry), order).map((journey) =>
    toSidebarJourneyItem(journey, preferences.activeJourneyId, preferences.pinnedJourneyIds, "ordered"),
  );
}

export function orderSearchResults(
  journeys: FlattenedJourney[],
  preferences: JourneyPreferences,
  order: JourneyListOrder,
): FlattenedJourney[] {
  if (order === "recent") {
    const rank = new Map<string, number>();
    let index = 0;
    if (preferences.activeJourneyId) {
      rank.set(preferences.activeJourneyId, index++);
    }
    for (const id of preferences.recentJourneyIds) {
      if (!rank.has(id)) {
        rank.set(id, index++);
      }
    }
    return [...journeys].sort((left, right) => {
      const leftRank = rank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = rank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return compareByTreePosition(left, right);
    });
  }

  return orderFlattenedJourneys(journeys, order);
}

function orderFlattenedJourneys(journeys: FlattenedJourney[], order: JourneyListOrder): FlattenedJourney[] {
  if (order === "name") {
    return [...journeys].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) || compareByTreePosition(left, right),
    );
  }

  return [...journeys];
}

function compareByTreePosition(left: FlattenedJourney, right: FlattenedJourney): number {
  return left.breadcrumb.join(" / ").localeCompare(right.breadcrumb.join(" / "), undefined, { sensitivity: "base" });
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function toSidebarJourneyItem(
  journey: FlattenedJourney,
  activeJourneyId: string | undefined,
  pinnedJourneyIds: string[],
  reasonVisible: SidebarJourneyVisibilityReason,
): SidebarJourneyItem {
  return {
    ...journey,
    pinned: pinnedJourneyIds.includes(journey.id),
    active: journey.id === activeJourneyId,
    reasonVisible,
  };
}

function flattenJourney(item: JourneyRegistryItem, parentBreadcrumb: string[], depth: number): FlattenedJourney[] {
  const breadcrumb = [...parentBreadcrumb, item.name];
  const current: FlattenedJourney = { ...item, breadcrumb, depth };
  const children = item.children ?? [];
  return [current, ...children.flatMap((child) => flattenJourney(child, breadcrumb, depth + 1))];
}
