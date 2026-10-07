import { findJourneyById, type JourneyRegistry } from "./journeyRegistry";

/**
 * Exactly the operations Mirror's `journey mutate` contract accepts. There is deliberately no
 * metadata update operation here: CR130 removed one, because Mirror rejects it with
 * `unsupported_operation` and always did, so the Edit Journey dialog's Save could never succeed.
 * Mirror can update a title and some metadata through its web server, but that path skips the
 * `expectedSourceVersion` digest and the receipt ledger every mutation below rides, so it is not an
 * option for the Desktop. The upstream ask is recorded as CR100.
 */
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

/**
 * CR110: the exact message the native layer returns when Mirror refuses a mutation because the
 * Desktop's registry snapshot is older than Mirror's Journey rows. It is compared by equality, and a
 * source guard holds it identical to the literal in `mutate_journey_registry`.
 */
export const STALE_SOURCE_MESSAGE = "Journeys changed in Mirror. Reload the tree and try again.";

export function isStaleSourceError(error: unknown): boolean {
  return journeyAdministrationError(error) === STALE_SOURCE_MESSAGE;
}

export type CreateIntentRebase =
  | { kind: "rebasable"; position: number }
  | { kind: "conflict"; reason: string; parentMissing: boolean };

/**
 * CR110: whether a create intent written against an older registry can still be applied, verbatim,
 * against a fresh one. Mirror compares one digest over every Journey's row, so any change anywhere
 * — a path set from Pi, a stage moved in Mirror — refuses a create that it does not actually
 * conflict with. The things that can make the intent itself wrong are exactly two: the chosen
 * parent is gone, or the chosen id is now taken. Everything else is a position to recompute.
 *
 * This decides; it never retries. The retry is the Navigator confirming the same form again.
 */
export function rebaseCreateIntent(
  registry: JourneyRegistry,
  intent: { slug: string; parentId: string | null },
): CreateIntentRebase {
  if (registry.schemaVersion !== "0.2.0" || !registry.sourceVersion) {
    return { kind: "conflict", reason: "Reload Journeys from Mirror before administering the tree.", parentMissing: false };
  }
  if (findJourneyById(registry, intent.slug)) {
    return { kind: "conflict", reason: `A Journey with id "${intent.slug}" now exists in Mirror. Choose another id.`, parentMissing: false };
  }
  if (intent.parentId && !findJourneyById(registry, intent.parentId)) {
    return {
      kind: "conflict",
      reason: `The parent Journey "${intent.parentId}" no longer exists in Mirror. The parent was reset to Root; review and confirm again.`,
      parentMissing: true,
    };
  }
  return { kind: "rebasable", position: appendJourneyPosition(registry, intent.parentId ?? "") };
}

export type ProjectPathIntent =
  | { kind: "set"; projectPath: string }
  | { kind: "clear" }
  | { kind: "unchanged" };

/**
 * CR130: a project path edit is not one operation with a nullable field — it selects between two
 * operations, because core's `exact()` predicate accepts `{journeyId, projectPath}` for
 * `set_project_path` and `{journeyId}` alone for `clear_project_path`. Deciding that at the call site
 * would bury the choice in payload assembly, so it is named here and compared against the loaded
 * tree's own value.
 *
 * `unchanged` exists so that opening the dialog and saving without touching the field writes nothing.
 * A form that changed nothing must not mutate, and must not report a failure either.
 */
export function projectPathIntent(registry: JourneyRegistry, journeyId: string, typedPath: string): ProjectPathIntent {
  const journey = findJourneyById(registry, journeyId);
  if (!journey) throw new Error("That Journey no longer exists in the loaded tree.");
  const next = typedPath.trim();
  const current = (journey.projectPath ?? "").trim();
  if (next === current) return { kind: "unchanged" };
  if (!next) return { kind: "clear" };
  return { kind: "set", projectPath: next };
}
