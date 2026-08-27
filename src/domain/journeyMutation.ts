import type { JourneyRegistry } from "./journeyRegistry";

export type JourneyMutationOperation = "create_journey" | "set_project_path" | "clear_project_path" | "move_journey" | "delete_journey";
export type JourneyMutationRequest = {
  schemaVersion: "mirror.journey-mutation@1.0";
  requestId: string;
  expectedSourceVersion: string;
  operation: JourneyMutationOperation;
  payload: Record<string, unknown>;
};
export type JourneyMutationResult = {
  schemaVersion: "mirror.journey-mutation@1.0";
  receipt: { requestId: string; operation: JourneyMutationOperation; journeyId: string; resultVersion: string; idempotent: boolean };
  registry: JourneyRegistry;
};

export function appendJourneyPosition(registry: JourneyRegistry, parentJourneyId: string): number {
  if (!parentJourneyId) return registry.roots.length;
  const pending = [...registry.roots];
  while (pending.length > 0) {
    const journey = pending.shift();
    if (!journey) break;
    if (journey.id === parentJourneyId) return journey.children?.length ?? 0;
    pending.push(...(journey.children ?? []));
  }
  throw new Error("The selected parent Journey is no longer available. Reload Journeys and try again.");
}

export function journeyAdministrationError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Journey administration failed without replacing the current tree.";
}

export function replacementJourneyAfterDeletion(registry: JourneyRegistry, targetJourneyId: string): string | undefined {
  const ordered: Array<{ id: string; parentId?: string }> = [];
  const visit = (items: JourneyRegistry["roots"], parentId?: string) => {
    for (const item of items) {
      ordered.push({ id: item.id, parentId: item.parentId ?? parentId });
      visit(item.children ?? [], item.id);
    }
  };
  visit(registry.roots);
  const target = ordered.find((journey) => journey.id === targetJourneyId);
  if (target?.parentId && target.parentId !== targetJourneyId) return target.parentId;
  return ordered.find((journey) => journey.id !== targetJourneyId)?.id;
}

export function suggestJourneySlug(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function createMutationRequest(
  registry: JourneyRegistry,
  operation: JourneyMutationOperation,
  payload: Record<string, unknown>,
  requestId: string = crypto.randomUUID(),
): JourneyMutationRequest {
  if (registry.schemaVersion !== "0.2.0" || !registry.sourceVersion) {
    throw new Error("Reload Journeys from Mirror before administering the tree.");
  }
  return { schemaVersion: "mirror.journey-mutation@1.0", requestId, expectedSourceVersion: registry.sourceVersion, operation, payload };
}
