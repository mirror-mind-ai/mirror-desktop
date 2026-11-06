import { findJourneyById, type JourneyRegistry, type JourneyRegistryItem } from "./journeyRegistry";

/**
 * CR099: which tree operations a running turn is allowed to stop.
 *
 * Until RS028 group C every one of these was disabled by a single app-wide `runtimeBusy`, true when
 * any Journey anywhere had an active or finalizing run. The Navigator widened the direction: no
 * operation on the tree is blocked because a turn is running unless there is a strong reason, and
 * that reason is then named on the control. Two reasons survived that reading, and they are the only
 * refusals this module produces.
 */
export type JourneyTreeOperation =
  | "create"
  | "edit"
  | "move"
  | "drag"
  | "set_project_path"
  | "appearance"
  | "reload_tree"
  | "delete";

/** The Journeys with a working agent, and whether that reading can be trusted. */
export type RunningJourneyScope = {
  runningJourneyIds: readonly string[];
  /** The native lease registry could not be read, so no Journey can be cleared of a running turn. */
  uncertain: boolean;
};

export type JourneyTreeAvailability = {
  allowed: boolean;
  /** Named on the control when it is refused, so the refusal is never silent. */
  reason?: string;
  /** Said when the operation is allowed but a turn already in flight will not see it. */
  note?: string;
};

export type JourneyTreeAvailabilityInput = {
  targetJourneyId?: string;
  registry: JourneyRegistry;
  scope: RunningJourneyScope;
};

export function journeyTreeAvailability(
  operation: JourneyTreeOperation,
  input: JourneyTreeAvailabilityInput,
): JourneyTreeAvailability {
  if (operation === "delete") {
    return deletionAvailability(input);
  }
  if (operation === "set_project_path" && isRunning(input.targetJourneyId, input.scope)) {
    // The turn already running was spawned with its folder; only the next one reads the new value.
    return {
      allowed: true,
      note: "The turn now running keeps the folder it started in. The new folder applies to the next turn.",
    };
  }
  return { allowed: true };
}

/**
 * Deleting is the one tree operation that cannot be undone and that takes a run's destination away,
 * so it is the one that still waits. A sibling's turn never stands in the way.
 */
function deletionAvailability({ targetJourneyId, registry, scope }: JourneyTreeAvailabilityInput): JourneyTreeAvailability {
  if (scope.uncertain) {
    return {
      allowed: false,
      reason: "Nautilus cannot tell which Journeys have a working agent right now. Try again in a moment.",
    };
  }
  if (!targetJourneyId) return { allowed: true };
  if (isRunning(targetJourneyId, scope)) {
    return { allowed: false, reason: "An agent is working in this Journey. Stop the turn before deleting it." };
  }
  const target = findJourneyById(registry, targetJourneyId);
  if (!target) return { allowed: true };
  const working = descendantsOf(target).find((journey) => scope.runningJourneyIds.includes(journey.id));
  if (working) {
    return {
      allowed: false,
      reason: `An agent is working in ${working.name}, under this Journey. Stop the turn before deleting it.`,
    };
  }
  return { allowed: true };
}

function isRunning(journeyId: string | undefined, scope: RunningJourneyScope): boolean {
  return Boolean(journeyId) && scope.runningJourneyIds.includes(journeyId as string);
}

function descendantsOf(journey: JourneyRegistryItem): JourneyRegistryItem[] {
  return (journey.children ?? []).flatMap((child) => [child, ...descendantsOf(child)]);
}

/**
 * The working set, from both sources the old global guard mixed together: the renderer's per-Journey
 * runtime entries and the native lease registry. Keeping them as one set, named per Journey, is what
 * turns an app-wide answer into a local one.
 */
export function runningJourneyScope(input: {
  runtimeEntries: Record<string, boolean>;
  nativeLeaseJourneyIds: readonly string[];
  occupancyKnown: boolean;
}): RunningJourneyScope {
  const ids = new Set<string>();
  for (const [journeyId, active] of Object.entries(input.runtimeEntries)) {
    if (active) ids.add(journeyId);
  }
  for (const journeyId of input.nativeLeaseJourneyIds) ids.add(journeyId);
  return { runningJourneyIds: [...ids], uncertain: !input.occupancyKnown };
}

/** The six mutations `executeJourneyMutation` carries, as the tree operations this module judges. */
export type JourneyMutationName =
  | "create_journey"
  | "update_journey"
  | "set_project_path"
  | "clear_project_path"
  | "move_journey"
  | "delete_journey";

export function treeOperationOfMutation(mutation: JourneyMutationName): JourneyTreeOperation {
  switch (mutation) {
    case "create_journey": return "create";
    case "update_journey": return "edit";
    case "set_project_path":
    case "clear_project_path": return "set_project_path";
    case "move_journey": return "move";
    case "delete_journey": return "delete";
  }
}

/**
 * Which Journey a mutation is about. `create_journey` is about a parent that is not yet a target,
 * so it has none: creating a child under a working Journey is allowed, and nothing it could refuse
 * depends on the parent.
 */
export function mutationTargetJourneyId(
  mutation: JourneyMutationName,
  payload: Record<string, unknown>,
): string | undefined {
  if (mutation === "create_journey") return undefined;
  const journeyId = payload.journeyId;
  return typeof journeyId === "string" && journeyId.length > 0 ? journeyId : undefined;
}
