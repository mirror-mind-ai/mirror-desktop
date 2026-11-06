import { findJourneyById, type JourneyRegistry, type JourneyRegistryItem } from "./journeyRegistry";

/**
 * CR203: where a dragged Journey lands, decided before Mirror is asked.
 *
 * The drag that existed before this CR always appended the dragged Journey as the last child of
 * whatever row it was dropped on. There was no way to reach the root, no ordering among siblings,
 * nothing on screen to say where it would land, and a drop into the Journey's own subtree was sent
 * to Mirror to be refused as `invalid_parent`. This module answers all of that as pure data, so the
 * sentence the Navigator reads while dragging and the mutation that is sent are one decision.
 *
 * `position` follows the Core exactly: `placeInGroup` removes the moving Journey from its sibling
 * list **before** splicing it in, so an index is counted on the list without it.
 */
export type JourneyDropZone = "before" | "into" | "after" | "root";

export type JourneyDropPlan =
  | { outcome: "move"; parentId: string | null; position: number; description: string; completion: string }
  | { outcome: "unchanged" }
  | { outcome: "refused"; reason: string };

export type JourneyDropInput = {
  draggedJourneyId: string;
  /** The row under the pointer, or `null` for the zone that makes a Journey a root. */
  targetJourneyId: string | null;
  zone: JourneyDropZone;
  registry: JourneyRegistry;
};

/**
 * A quarter of the row at each edge places the Journey among siblings; the half in the middle makes
 * it a child. A row with no measured height is treated as a drop into it, because a zero-height
 * border is not something a pointer can aim at.
 */
export function dropZoneFromOffset(offsetY: number, height: number): Exclude<JourneyDropZone, "root"> {
  if (height <= 0) return "into";
  if (offsetY < height / 4) return "before";
  if (offsetY >= (height * 3) / 4) return "after";
  return "into";
}

export function planJourneyDrop(input: JourneyDropInput): JourneyDropPlan {
  const { draggedJourneyId, targetJourneyId, zone, registry } = input;
  const dragged = findJourneyById(registry, draggedJourneyId);
  if (!dragged) return unknownJourney();

  if (zone === "root") {
    return plannedMove(registry, dragged, null, 0, "to the root, as the first Journey");
  }

  const target = targetJourneyId ? findJourneyById(registry, targetJourneyId) : undefined;
  if (!target) return unknownJourney();

  if (zone === "into") {
    if (target.id === dragged.id) {
      return { outcome: "refused", reason: "A Journey cannot be moved into itself." };
    }
    const refusal = refusalForParent(dragged, target.id, registry);
    if (refusal) return refusal;
    const siblings = childrenWithout(target, dragged.id);
    const where = siblings.length === 0
      ? `into ${target.name}, as its first Journey`
      : `into ${target.name}, after its ${siblings.length} ${siblings.length === 1 ? "Journey" : "Journeys"}`;
    return plannedMove(registry, dragged, target.id, siblings.length, where);
  }

  const parentId = parentIdOf(registry, target.id);
  const refusal = refusalForParent(dragged, parentId, registry);
  if (refusal) return refusal;
  const siblings = siblingsOf(registry, parentId).filter((journey) => journey.id !== dragged.id);
  const targetIndex = siblings.findIndex((journey) => journey.id === target.id);
  if (targetIndex < 0) {
    // The target is the dragged Journey itself: dropping a Journey beside itself changes nothing.
    return { outcome: "unchanged" };
  }
  const position = zone === "before" ? targetIndex : targetIndex + 1;
  const where = parentId === null
    ? `to the root, ${zone === "before" ? "above" : "below"} ${target.name}`
    : `into ${nameOf(registry, parentId)}, ${zone === "before" ? "above" : "below"} ${target.name}`;
  return plannedMove(registry, dragged, parentId, position, where);
}

function plannedMove(
  registry: JourneyRegistry,
  dragged: JourneyRegistryItem,
  parentId: string | null,
  position: number,
  where: string,
): JourneyDropPlan {
  const currentParentId = parentIdOf(registry, dragged.id);
  if (currentParentId === parentId) {
    const siblings = siblingsOf(registry, parentId).filter((journey) => journey.id !== dragged.id);
    const currentIndex = siblingsOf(registry, parentId).findIndex((journey) => journey.id === dragged.id);
    // The index the Journey would occupy if it were removed and spliced back where it already sits.
    const settled = Math.min(currentIndex, siblings.length);
    if (settled === position) return { outcome: "unchanged" };
  }
  return {
    outcome: "move",
    parentId,
    position,
    description: `Move ${dragged.name} ${where}.`,
    // Said after the drop lands, so a Journey that left the visible part of the tree is not read
    // as deleted: the Navigator lost one this way on 2026-11-06.
    completion: `Moved ${dragged.name} ${where}.`,
  };
}

/** A new parent may not be the dragged Journey, nor anything inside it. */
function refusalForParent(
  dragged: JourneyRegistryItem,
  parentId: string | null,
  registry: JourneyRegistry,
): JourneyDropPlan | undefined {
  if (parentId === null) return undefined;
  if (parentId === dragged.id) {
    return { outcome: "refused", reason: "A Journey cannot be moved into itself." };
  }
  if (descendantsOf(dragged).some((journey) => journey.id === parentId)) {
    return {
      outcome: "refused",
      reason: `${dragged.name} cannot be moved into ${nameOf(registry, parentId)}, which is already inside it.`,
    };
  }
  return undefined;
}

function unknownJourney(): JourneyDropPlan {
  return {
    outcome: "refused",
    reason: "That Journey is no longer in the tree. Reload the Journey tree and try again.",
  };
}

function siblingsOf(registry: JourneyRegistry, parentId: string | null): JourneyRegistryItem[] {
  if (parentId === null) return registry.roots;
  return findJourneyById(registry, parentId)?.children ?? [];
}

function childrenWithout(journey: JourneyRegistryItem, excludedId: string): JourneyRegistryItem[] {
  return (journey.children ?? []).filter((child) => child.id !== excludedId);
}

function parentIdOf(registry: JourneyRegistry, journeyId: string): string | null {
  const walk = (journeys: JourneyRegistryItem[], parentId: string | null): string | null | undefined => {
    for (const journey of journeys) {
      if (journey.id === journeyId) return parentId;
      const found = walk(journey.children ?? [], journey.id);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return walk(registry.roots, null) ?? null;
}

function descendantsOf(journey: JourneyRegistryItem): JourneyRegistryItem[] {
  return (journey.children ?? []).flatMap((child) => [child, ...descendantsOf(child)]);
}

function nameOf(registry: JourneyRegistry, journeyId: string): string {
  return findJourneyById(registry, journeyId)?.name ?? journeyId;
}

/**
 * CR098, absorbed here: the parents a Journey may be given, for the Move and Create forms. The form
 * used to list every Journey in the tree, including the moved Journey's own descendants, which the
 * Core then refused as `invalid_parent`. Offering a choice that cannot work is a worse answer than
 * not offering it.
 */
export function eligibleParentJourneys<Candidate extends { id: string }>(
  registry: JourneyRegistry,
  movedJourneyId: string | undefined,
  candidates: readonly Candidate[],
): Candidate[] {
  if (!movedJourneyId) return [...candidates];
  const moved = findJourneyById(registry, movedJourneyId);
  const excluded = new Set([movedJourneyId, ...(moved ? descendantsOf(moved).map((journey) => journey.id) : [])]);
  return candidates.filter((journey) => !excluded.has(journey.id));
}
