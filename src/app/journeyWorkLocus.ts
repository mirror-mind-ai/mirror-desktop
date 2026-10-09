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
 * The runtime entry is this window's live truth, but it is narrow: `identity` is optional, its
 * `mock` variant carries no workspace coordinate, and the map is only ever written by the send
 * path. The native registry inspection covers every Journey in the session and its authority
 * always carries the thread, so it is the reliable carrier of *who owns the work*.
 *
 * Both sources live and die with the process: the registry is constructed fresh on every start
 * (`main.rs:148`) and the shutdown hook kills every child (`main.rs:5712`). Neither survives a
 * relaunch, and an earlier version of this comment claimed the registry did — see CR134's
 * Correction of 2026-10-09. The union is therefore a correct fallback for a runtime entry that is
 * absent or carries no coordinate, with no demonstrated production trigger of its own.
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
