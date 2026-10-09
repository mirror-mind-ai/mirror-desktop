import { isActivePiInvocationLease, type PiInvocationAuthorityInspection, type PiInvocationOccupancyState } from "./piInvocationOccupancy";
import type { JourneyRunIdentity, JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

/**
 * CR134: which workspace owns the work a Journey is doing.
 *
 * `here` is the Journey's own workspace — its root thread. `inside` is a conversation below it.
 * `unknown` means work is running and the owner has not been resolved yet; it is deliberately a
 * third value rather than defaulting to `here`, because reporting a conversation's work as the
 * Journey's own is the attribution error this CR exists to remove.
 */
export type JourneyWorkLocus = "here" | "inside" | "unknown";

export type JourneyWorkOwner = {
  journeyId: string;
  threadId: string;
  generation: number;
  mirrorConversationId: string;
};

export type JourneyWorkPresentation = {
  phase: JourneyRuntimeOwnerPhase;
  locus: JourneyWorkLocus;
  /** Absent when the only available source carries no workspace coordinate. */
  owner?: JourneyWorkOwner;
};

/**
 * Two sources, because neither alone answers the question.
 *
 * The runtime entry is this window's live truth, but it is in-memory only: it describes runs this
 * window started and its map is empty after a relaunch. The native registry inspection covers
 * every Journey and survives a relaunch, and its authority already carries the thread. So the
 * runtime phase leads where it exists and the registry fills every gap — which is what stops a
 * Journey whose Pi process is still alive from reading as idle after the window reopened.
 */
export function deriveJourneyWorkLocus(input: {
  occupancy: PiInvocationOccupancyState;
  journeyId: string;
  journeyRootThreadId?: string;
  runtimePhase?: JourneyRuntimeOwnerPhase;
  runtimeIdentity?: JourneyRunIdentity;
}): JourneyWorkPresentation | undefined {
  const lease = input.occupancy.entries.find((entry) => (
    entry.authority.journeyId === input.journeyId && entry.terminalState === "open"
  ));
  const leasePhase = lease
    ? isActivePiInvocationLease(lease) ? "running" : lease.leasePhase === "finalizing" ? "finalizing" : undefined
    : undefined;
  const phase = input.runtimePhase ?? leasePhase;
  if (!phase) return undefined;

  const liveAuthority = input.runtimeIdentity?.kind === "live" ? input.runtimeIdentity.authority : undefined;
  const authority: Pick<PiInvocationAuthorityInspection, "journeyId" | "threadId" | "generation" | "mirrorConversationId"> | undefined
    = liveAuthority ?? lease?.authority;
  if (!authority) return { phase, locus: "unknown" };

  const owner: JourneyWorkOwner = {
    journeyId: authority.journeyId,
    threadId: authority.threadId,
    generation: authority.generation,
    mirrorConversationId: authority.mirrorConversationId,
  };
  if (!input.journeyRootThreadId) return { phase, locus: "unknown", owner };
  return {
    phase,
    locus: owner.threadId === input.journeyRootThreadId ? "here" : "inside",
    owner,
  };
}

/**
 * The Journey's own workspace is its root thread, and `parseConversationCatalog` already
 * guarantees root and child threads are distinct, so this comparison is a contract rather than a
 * heuristic. The root thread id is read from whichever source already knows it: CR133's
 * per-Journey catalog when that Journey's disclosure has been opened, otherwise a lookup bounded
 * by the Journeys that actually appear in occupancy.
 */
export function resolveJourneyRootThreadId(
  resolved: Readonly<Record<string, string | undefined>>,
  catalogRootThreadId: string | undefined,
  journeyId: string,
): string | undefined {
  return catalogRootThreadId ?? resolved[journeyId];
}

/** The Journeys a root-thread lookup is worth doing for: those the registry says are busy. */
export function journeyIdsNeedingRootThread(
  occupancy: PiInvocationOccupancyState,
  known: Readonly<Record<string, string | undefined>>,
): string[] {
  const needed = new Set<string>();
  for (const entry of occupancy.entries) {
    if (entry.terminalState !== "open") continue;
    if (known[entry.authority.journeyId]) continue;
    needed.add(entry.authority.journeyId);
  }
  return [...needed];
}
