import type { RunAuthority } from "../domain/runAuthority";
import {
  runtimeWorkspaceKey,
  sameJourneyWorkspace,
  workspaceOfAuthority,
  type JourneyWorkspace,
} from "../domain/journeyWorkspaceKey";

export interface PiInvocationAuthorityInspection {
  schemaVersion: "0.1.0";
  journeyId: string;
  runId: string;
  turnId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  mirrorConversationId: string;
  harnessUserMessageId: string;
  harnessAssistantMessageId: string;
}

/**
 * CR145: what the operating system says about the child a lease holds, as distinct from what the
 * registry believes. `exited` is the only value that licenses anything; `unknown` and `absent`
 * license nothing, and so does the field being missing altogether (an older native build).
 */
export type PiChildLiveness = "running" | "exited" | "absent" | "unknown";

export interface PiInvocationLeaseInspection {
  authority: PiInvocationAuthorityInspection;
  leasePhase: "reserved" | "running" | "finalizing";
  processCapacityState: "reserved" | "running" | "released";
  cancellationState: "none" | "requested";
  terminalState: "open" | "completed" | "cancelled" | "spawn_failed" | "process_died";
  /** Absent from inspections produced before CR145. Absence is absence, never a licence. */
  childLiveness?: PiChildLiveness;
}

/** CR145: the result of `reap_exited_pi_child`. */
export interface PiExitedChildReap {
  journeyId: string;
  runId: string;
  status: "reaped" | "child_still_running" | "already_terminal";
  exitStatus: string | null;
}

export interface PiInvocationRegistryInspection {
  schemaVersion: "0.1.0";
  limit: number;
  /**
   * CR140: how many live invocations one Journey may hold, reported by the registry rather than
   * assumed here. Hardcoding it would be two sources of truth for one bound. Not clamped to
   * `limit`, because the native `reserve` compares against this constant first and against
   * capacity second, and this side has to reproduce that order to name the same cause.
   */
  journeyWorkspaceShare: number;
  processCapacityInUse: number;
  entries: PiInvocationLeaseInspection[];
}

export interface PiInvocationLeaseRelease {
  journeyId: string;
  runId: string;
  status: "released" | "already_released";
}

export interface PiInvocationOccupancyState {
  status: "unknown" | "reconciling" | "known";
  requestId: number | null;
  limit: 1 | 2 | 4 | null;
  /** CR140: null until an inspection is known, like every other reported bound. */
  journeyWorkspaceShare: number | null;
  processCapacityInUse: number | null;
  entries: PiInvocationLeaseInspection[];
  diagnostic: string | null;
}

export type PiInvocationAdmission =
  | { allowed: true; reason: null }
  | {
    allowed: false;
    reason:
      | "inspection_unknown"
      /** The workspace the Navigator is in already has a run. CR138 added it; CR140 made it reachable. */
      | "same_workspace_occupied"
      /**
       * CR140: this Journey holds its whole share of live invocations while global capacity is
       * not yet spent. Distinct from `global_capacity_reached` because the two clear differently:
       * one needs a turn in *this* Journey to finish, the other a turn anywhere.
       */
      | "journey_share_exceeded"
      | "global_capacity_reached";
  };

export type SettlementRecoveryEvidence = PiInvocationAuthorityInspection;

export function piInvocationAuthorityFromRunAuthority(
  authority: RunAuthority,
): PiInvocationAuthorityInspection {
  return {
    schemaVersion: "0.1.0",
    journeyId: authority.journeyId,
    runId: authority.runId,
    turnId: authority.turnId,
    threadId: authority.threadId,
    generation: authority.generation,
    piSessionId: authority.piSessionId,
    mirrorConversationId: authority.mirrorConversationId,
    harnessUserMessageId: authority.harnessUserMessageId,
    harnessAssistantMessageId: authority.harnessAssistantMessageId,
  };
}

export function createUnknownPiInvocationOccupancy(): PiInvocationOccupancyState {
  return {
    status: "unknown",
    requestId: null,
    limit: null,
    journeyWorkspaceShare: null,
    processCapacityInUse: null,
    entries: [],
    diagnostic: null,
  };
}

export function beginPiInvocationReconciliation(
  state: PiInvocationOccupancyState,
  requestId: number,
): PiInvocationOccupancyState {
  return { ...state, status: "reconciling", requestId, diagnostic: null };
}

const AUTHORITY_KEYS = [
  "schemaVersion",
  "journeyId",
  "runId",
  "turnId",
  "threadId",
  "generation",
  "piSessionId",
  "mirrorConversationId",
  "harnessUserMessageId",
  "harnessAssistantMessageId",
] as const;
const ENTRY_KEYS = [
  "authority",
  "leasePhase",
  "processCapacityState",
  "cancellationState",
  "terminalState",
] as const;
// CR145: an inspection from a native build that measures carries one more key. Both shapes are
// exact in their own right; what is never accepted is a partial or an extra key beyond this one.
const ENTRY_KEYS_MEASURED = [...ENTRY_KEYS, "childLiveness"] as const;
const CHILD_LIVENESS_VALUES: readonly PiChildLiveness[] = ["running", "exited", "absent", "unknown"];
const INSPECTION_KEYS = [
  "schemaVersion",
  "limit",
  "journeyWorkspaceShare",
  "processCapacityInUse",
  "entries",
] as const;
/** Mirrors `MAX_PI_PROCESS_LIMIT` in `pi_process_registry.rs`; the share cannot exceed it. */
const MAX_REPORTED_JOURNEY_SHARE = 16;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]*$/;
const MAX_AUTHORITY_FIELD_LENGTH = 512;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_AUTHORITY_FIELD_LENGTH
    && value === value.trim()
    && IDENTIFIER_PATTERN.test(value);
}

function validAuthority(value: unknown): value is PiInvocationAuthorityInspection {
  if (!isRecord(value) || !hasExactKeys(value, AUTHORITY_KEYS)) return false;
  return value.schemaVersion === "0.1.0"
    && isBoundedIdentifier(value.journeyId)
    && isBoundedIdentifier(value.runId)
    && isBoundedIdentifier(value.turnId)
    && isBoundedIdentifier(value.threadId)
    && Number.isSafeInteger(value.generation)
    && Number(value.generation) >= 1
    && Number(value.generation) <= 1_000_000_000
    && isBoundedIdentifier(value.piSessionId)
    && isBoundedIdentifier(value.mirrorConversationId)
    && isBoundedIdentifier(value.harnessUserMessageId)
    && isBoundedIdentifier(value.harnessAssistantMessageId);
}

function validEntry(value: unknown): value is PiInvocationLeaseInspection {
  if (!isRecord(value) || !validAuthority(value.authority)) return false;
  if (hasExactKeys(value, ENTRY_KEYS_MEASURED)) {
    if (!(CHILD_LIVENESS_VALUES as unknown[]).includes(value.childLiveness)) return false;
  } else if (!hasExactKeys(value, ENTRY_KEYS)) {
    return false;
  }
  const leasePhase = value.leasePhase;
  const processState = value.processCapacityState;
  const cancellation = value.cancellationState;
  const terminal = value.terminalState;
  if (!(["reserved", "running", "finalizing"] as unknown[]).includes(leasePhase)
    || !(["reserved", "running", "released"] as unknown[]).includes(processState)
    || !(["none", "requested"] as unknown[]).includes(cancellation)
    || !(["open", "completed", "cancelled", "spawn_failed", "process_died"] as unknown[]).includes(terminal)) {
    return false;
  }
  if (leasePhase === "reserved" && (processState !== "reserved" || terminal !== "open")) return false;
  if (leasePhase === "running" && (processState !== "running" || terminal !== "open")) return false;
  if (leasePhase === "finalizing" && (processState !== "released" || terminal === "open")) return false;
  if (terminal === "cancelled" && cancellation !== "requested") return false;
  if (terminal === "completed" && cancellation !== "none") return false;
  return true;
}

export function validatePiInvocationRegistryInspection(
  value: unknown,
): value is PiInvocationRegistryInspection {
  if (!isRecord(value) || !hasExactKeys(value, INSPECTION_KEYS)) return false;
  if (value.schemaVersion !== "0.1.0"
    || (value.limit !== 1 && value.limit !== 2 && value.limit !== 4)
    // CR140: bounded on its own terms, NOT by `limit`. A registry smaller than the share is a
    // legitimate configuration — the share is a constant and capacity is what refuses first there.
    || !Number.isSafeInteger(value.journeyWorkspaceShare)
    || Number(value.journeyWorkspaceShare) < 1
    || Number(value.journeyWorkspaceShare) > MAX_REPORTED_JOURNEY_SHARE
    || !Number.isSafeInteger(value.processCapacityInUse)
    || Number(value.processCapacityInUse) < 0
    || Number(value.processCapacityInUse) > Number(value.limit)
    || !Array.isArray(value.entries)
    || value.entries.length > Number(value.limit)
    || !value.entries.every(validEntry)) {
    return false;
  }
  const entries = value.entries as PiInvocationLeaseInspection[];
  // CR138: one run per *workspace*, not one per Journey. The previous rule made two entries in one
  // Journey invalid as a whole, which degraded the state to `unknown` and read as app-wide
  // blocking — a lockout rather than concurrency. A workspace may still hold only one run.
  const workspaces = new Set(entries.map((entry) => runtimeWorkspaceKey(workspaceOfAuthority(entry.authority))));
  const runs = new Set(entries.map((entry) => entry.authority.runId));
  if (workspaces.size !== entries.length || runs.size !== entries.length) return false;
  const capacityEntries = entries.filter((entry) => entry.processCapacityState !== "released").length;
  return capacityEntries === value.processCapacityInUse;
}

export async function releaseAndReinspectPiInvocationLease(
  authority: PiInvocationAuthorityInspection,
  dependencies: {
    releaseLease: (journeyId: string, runId: string) => Promise<unknown>;
    inspectRegistry: () => Promise<unknown>;
  },
): Promise<PiInvocationRegistryInspection> {
  const release = await dependencies.releaseLease(authority.journeyId, authority.runId);
  if (!isRecord(release)
    || !hasExactKeys(release, ["journeyId", "runId", "status"])
    || release.journeyId !== authority.journeyId
    || release.runId !== authority.runId
    || (release.status !== "released" && release.status !== "already_released")) {
    throw new Error("Native Pi invocation cleanup returned mismatched authority.");
  }
  const inspection = await dependencies.inspectRegistry();
  if (!validatePiInvocationRegistryInspection(inspection)) {
    throw new Error("Native Pi invocation cleanup reinspection was invalid.");
  }
  return inspection;
}

export function applyPiInvocationInspection(
  state: PiInvocationOccupancyState,
  requestId: number,
  inspection: PiInvocationRegistryInspection,
): PiInvocationOccupancyState {
  if (state.status !== "reconciling" || state.requestId !== requestId) {
    return state;
  }
  if (!validatePiInvocationRegistryInspection(inspection)) {
    return {
      status: "unknown",
      requestId: null,
      limit: state.limit,
      journeyWorkspaceShare: state.journeyWorkspaceShare,
      processCapacityInUse: state.processCapacityInUse,
      entries: state.entries,
      diagnostic: "Native Pi invocation occupancy inspection was invalid.",
    };
  }
  return {
    status: "known",
    requestId: null,
    limit: inspection.limit as 1 | 2 | 4,
    journeyWorkspaceShare: inspection.journeyWorkspaceShare,
    processCapacityInUse: inspection.processCapacityInUse,
    entries: [...inspection.entries].sort(compareByWorkspace),
    diagnostic: null,
  };
}

/**
 * CR138: ordering by Journey alone left two sibling workspaces in whatever order the native side
 * happened to emit them, so the thread breaks the tie.
 */
function compareByWorkspace(
  left: PiInvocationLeaseInspection,
  right: PiInvocationLeaseInspection,
): number {
  return left.authority.journeyId.localeCompare(right.authority.journeyId)
    || left.authority.threadId.localeCompare(right.authority.threadId);
}

export function failPiInvocationReconciliation(
  state: PiInvocationOccupancyState,
  requestId: number,
  diagnostic: string,
): PiInvocationOccupancyState {
  if (state.status !== "reconciling" || state.requestId !== requestId) {
    return state;
  }
  return {
    status: "unknown",
    requestId: null,
    limit: state.limit,
    journeyWorkspaceShare: state.journeyWorkspaceShare,
    processCapacityInUse: state.processCapacityInUse,
    entries: state.entries,
    diagnostic,
  };
}

export function retainExpectedPiInvocationLease(
  state: PiInvocationOccupancyState,
  authority: PiInvocationAuthorityInspection,
): PiInvocationOccupancyState {
  // CR138: filtering by Journey here would erase a sibling workspace's lease while retaining this
  // one. The lease being replaced is this workspace's own.
  const retainedKey = runtimeWorkspaceKey(workspaceOfAuthority(authority));
  const otherEntries = state.entries.filter((entry) => (
    runtimeWorkspaceKey(workspaceOfAuthority(entry.authority)) !== retainedKey
  ));
  const expectedEntry: PiInvocationLeaseInspection = {
    authority,
    leasePhase: "reserved",
    processCapacityState: "reserved",
    cancellationState: "none",
    terminalState: "open",
  };
  const entries = [...otherEntries, expectedEntry].sort(compareByWorkspace);
  return {
    ...state,
    entries,
    processCapacityInUse: entries.filter((entry) => entry.processCapacityState !== "released").length,
  };
}

export function isActivePiInvocationLease(entry: PiInvocationLeaseInspection): boolean {
  return entry.terminalState === "open"
    && (entry.leasePhase === "reserved" || entry.leasePhase === "running")
    && (entry.processCapacityState === "reserved" || entry.processCapacityState === "running");
}

/**
 * Admission as the Navigator meets it: asked before Send, so a refusal costs no draft.
 *
 * CR138 asked the question about a workspace while answering at the Journey grain, because the
 * native registry was keyed by Journey and the renderer had to refuse whatever the registry would.
 * CR139 re-keyed the registry; this now answers at the workspace grain, and the grain constant
 * that pinned the intermediate state is gone — CR140 retired it rather than leaving a switch
 * nobody will flip back.
 *
 * The refusal order is the registry's own, so this pre-check never names a cause the registry
 * would not have named.
 */
export function derivePiInvocationAdmission(
  state: PiInvocationOccupancyState,
  workspace: JourneyWorkspace,
): PiInvocationAdmission {
  if (state.status !== "known"
    || state.limit === null
    || state.journeyWorkspaceShare === null
    || state.processCapacityInUse === null) {
    return { allowed: false, reason: "inspection_unknown" };
  }
  const active = state.entries.filter(isActivePiInvocationLease);
  if (active.some((entry) => sameJourneyWorkspace(workspaceOfAuthority(entry.authority), workspace))) {
    return { allowed: false, reason: "same_workspace_occupied" };
  }
  const liveInJourney = active.filter((entry) => entry.authority.journeyId === workspace.journeyId);
  // The registry's own order — duplicate workspace, then the Journey's share, then global
  // capacity — so this pre-check never names a cause `reserve` would not have named.
  //
  // CR141 Stage B retired the `grain` parameter and the `same_journey_occupied` refusal that sat
  // here. It existed because the Pi event transport carried one route per Journey and would throw
  // *after* Send; the transport is keyed by workspace now, and the field confirmed three turns
  // running at once in one Journey before the reason was removed, rather than on the argument that
  // it ought to be unreachable.
  if (liveInJourney.length >= state.journeyWorkspaceShare) {
    return { allowed: false, reason: "journey_share_exceeded" };
  }
  if (state.processCapacityInUse >= state.limit) {
    return { allowed: false, reason: "global_capacity_reached" };
  }
  return { allowed: true, reason: null };
}

/**
 * CR140: the workspaces whose live runs are occupying this Journey's share, in inspection order,
 * so a refusal can name them instead of saying the Journey is busy. A finalizing lease is excluded
 * for the same reason the share excludes it: the process is gone and the slot is already released.
 */
export function liveWorkspacesInJourney(
  state: PiInvocationOccupancyState,
  journeyId: string,
): PiInvocationAuthorityInspection[] {
  return state.entries
    .filter((entry) => entry.authority.journeyId === journeyId && isActivePiInvocationLease(entry))
    .map((entry) => entry.authority);
}

export function hasBlockingPiInvocationOccupancy(state: PiInvocationOccupancyState): boolean {
  return state.status !== "known" || state.entries.some(isActivePiInvocationLease);
}

/**
 * CR116: whether Pi is genuinely executing for this Journey, read from the native registry rather
 * than from a renderer flag. This is the authority post-terminal repair must respect: a lease that
 * is merely `finalizing` means the process is gone and the Desktop still owes bookkeeping, which
 * is precisely when repair should be allowed to run.
 */
export function hasActiveNativeExecution(
  state: PiInvocationOccupancyState,
  workspace: JourneyWorkspace,
): boolean {
  return state.entries.some((entry) => (
    sameJourneyWorkspace(workspaceOfAuthority(entry.authority), workspace)
    && isActivePiInvocationLease(entry)
  ));
}

/**
 * CR138: the same question asked of a whole Journey. CR134's status surfaces legitimately need
 * this — the Journey row reports that work runs *somewhere inside* it — while a repair or an exit
 * aimed at one workspace must use the workspace form, or a sibling's run would withhold it.
 */
/**
 * CR141: the lease of one workspace, asked for by that workspace.
 *
 * `App.tsx` found this by `entry.authority.journeyId === selectedJourney`, which with two live
 * siblings returned whichever sorted first — alphabetical by `thread_id` after CR139's sort —
 * regardless of which conversation the Navigator was looking at. The consequence was measured, not
 * assumed: `findBlockingTurnJournalRecord` only matches a record whose `runId` equals the active
 * lease's, so a sibling's lease **hides** the selected workspace's own blocking record, its
 * rehydration silently never runs, and availability reports a lease active on a surface whose
 * lease belongs to somebody else. Silence and wrong presentation, deterministically, from one
 * `find`.
 *
 * The exact workspace answers whenever its thread is resolved, in any phase, because a caller
 * asking about a retained `finalizing` lease needs it as much as one asking about a running turn.
 *
 * The `null` thread rule is taken from `selectJourneyRuntime` by name rather than invented: a
 * Journey whose root thread is not yet resolved (the Dev catalog carries `rootThreadId: null`
 * today) is answered by exactly one live entry, and declined when there are two, because guessing
 * between siblings is the defect this function exists to remove. Returning nothing whenever the
 * thread is unresolved would instead blank the surface of every Journey with one running turn
 * while its catalog loads.
 */
export function selectWorkspaceNativeLease(
  state: PiInvocationOccupancyState,
  workspace: JourneyWorkspace,
): PiInvocationLeaseInspection | undefined {
  const exact = state.entries.find((entry) => (
    sameJourneyWorkspace(workspaceOfAuthority(entry.authority), workspace)
  ));
  if (exact || workspace.threadId !== null) return exact;
  const live = state.entries.filter((entry) => (
    entry.authority.journeyId === workspace.journeyId && isActivePiInvocationLease(entry)
  ));
  return live.length === 1 ? live[0] : undefined;
}

export function hasActiveNativeExecutionInJourney(
  state: PiInvocationOccupancyState,
  journeyId: string,
): boolean {
  return state.entries.some((entry) => (
    entry.authority.journeyId === journeyId && isActivePiInvocationLease(entry)
  ));
}

function sameRecoveryAuthority(
  authority: PiInvocationAuthorityInspection,
  evidence: SettlementRecoveryEvidence,
): boolean {
  return authority.schemaVersion === evidence.schemaVersion
    && authority.journeyId === evidence.journeyId
    && authority.runId === evidence.runId
    && authority.turnId === evidence.turnId
    && authority.threadId === evidence.threadId
    && authority.generation === evidence.generation
    && authority.piSessionId === evidence.piSessionId
    && authority.mirrorConversationId === evidence.mirrorConversationId
    && authority.harnessUserMessageId === evidence.harnessUserMessageId
    && authority.harnessAssistantMessageId === evidence.harnessAssistantMessageId;
}

export function resolveExactSettlementRecovery(
  state: PiInvocationOccupancyState,
  ownerJourneyId: string,
  evidence: SettlementRecoveryEvidence,
): PiInvocationLeaseInspection | null {
  if (state.status !== "known" || ownerJourneyId !== evidence.journeyId) {
    return null;
  }
  return state.entries.find((entry) => (
    entry.leasePhase === "finalizing"
    && entry.processCapacityState === "released"
    && entry.authority.journeyId === ownerJourneyId
    && sameRecoveryAuthority(entry.authority, evidence)
  )) ?? null;
}

export function shouldRehydratePiProcessRoute(
  lease: PiInvocationLeaseInspection | undefined,
  selectedRuntimeBusy: boolean,
): boolean {
  return Boolean(lease)
    && !selectedRuntimeBusy
    && lease?.terminalState === "open"
    && (lease.leasePhase === "reserved" || lease.leasePhase === "running");
}
