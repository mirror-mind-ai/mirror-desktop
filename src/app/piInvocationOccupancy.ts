import type { RunAuthority } from "../domain/runAuthority";

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

export interface PiInvocationLeaseInspection {
  authority: PiInvocationAuthorityInspection;
  leasePhase: "reserved" | "running" | "finalizing";
  processCapacityState: "reserved" | "running" | "released";
  cancellationState: "none" | "requested";
  terminalState: "open" | "completed" | "cancelled" | "spawn_failed" | "process_died";
}

export interface PiInvocationRegistryInspection {
  schemaVersion: "0.1.0";
  limit: number;
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
  entries: PiInvocationLeaseInspection[];
  diagnostic: string | null;
}

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
  return { status: "unknown", requestId: null, entries: [], diagnostic: null };
}

export function beginPiInvocationReconciliation(
  state: PiInvocationOccupancyState,
  requestId: number,
): PiInvocationOccupancyState {
  return { ...state, status: "reconciling", requestId, diagnostic: null };
}

function validInspection(inspection: PiInvocationRegistryInspection): boolean {
  if (
    inspection.schemaVersion !== "0.1.0"
    || inspection.limit !== 1
    || !Number.isInteger(inspection.processCapacityInUse)
    || inspection.processCapacityInUse < 0
    || inspection.processCapacityInUse > inspection.limit
    || inspection.entries.length > inspection.limit
  ) {
    return false;
  }
  const journeys = new Set<string>();
  const capacityEntries = inspection.entries.filter((entry) => entry.processCapacityState !== "released").length;
  if (capacityEntries !== inspection.processCapacityInUse) {
    return false;
  }
  return inspection.entries.every((entry) => {
    const { authority } = entry;
    if (
      authority.schemaVersion !== "0.1.0"
      || !authority.journeyId
      || !authority.runId
      || !authority.turnId
      || !authority.threadId
      || !Number.isInteger(authority.generation)
      || authority.generation < 1
      || journeys.has(authority.journeyId)
    ) {
      return false;
    }
    journeys.add(authority.journeyId);
    return entry.processCapacityState === "released"
      ? entry.leasePhase === "finalizing"
      : entry.terminalState === "open";
  });
}

export function applyPiInvocationInspection(
  state: PiInvocationOccupancyState,
  requestId: number,
  inspection: PiInvocationRegistryInspection,
): PiInvocationOccupancyState {
  if (state.status !== "reconciling" || state.requestId !== requestId) {
    return state;
  }
  if (!validInspection(inspection)) {
    return {
      status: "unknown",
      requestId: null,
      entries: state.entries,
      diagnostic: "Native Pi invocation occupancy inspection was invalid.",
    };
  }
  return {
    status: "known",
    requestId: null,
    entries: [...inspection.entries].sort((left, right) => left.authority.journeyId.localeCompare(right.authority.journeyId)),
    diagnostic: null,
  };
}

export function failPiInvocationReconciliation(
  state: PiInvocationOccupancyState,
  requestId: number,
  diagnostic: string,
): PiInvocationOccupancyState {
  if (state.status !== "reconciling" || state.requestId !== requestId) {
    return state;
  }
  return { status: "unknown", requestId: null, entries: state.entries, diagnostic };
}

export function retainExpectedPiInvocationLease(
  state: PiInvocationOccupancyState,
  authority: PiInvocationAuthorityInspection,
): PiInvocationOccupancyState {
  const otherEntries = state.entries.filter((entry) => entry.authority.journeyId !== authority.journeyId);
  const expectedEntry: PiInvocationLeaseInspection = {
    authority,
    leasePhase: "reserved",
    processCapacityState: "reserved",
    cancellationState: "none",
    terminalState: "open",
  };
  return {
    ...state,
    entries: [...otherEntries, expectedEntry]
      .sort((left, right) => left.authority.journeyId.localeCompare(right.authority.journeyId)),
  };
}

export function confirmPiInvocationLeaseRelease(
  state: PiInvocationOccupancyState,
  release: PiInvocationLeaseRelease,
): PiInvocationOccupancyState {
  if (state.status !== "known") {
    return state;
  }
  const matched = state.entries.some((entry) => (
    entry.authority.journeyId === release.journeyId
    && entry.authority.runId === release.runId
  ));
  if (!matched) {
    return state;
  }
  return {
    ...state,
    entries: state.entries.filter((entry) => !(
      entry.authority.journeyId === release.journeyId
      && entry.authority.runId === release.runId
    )),
  };
}

export function hasBlockingPiInvocationOccupancy(state: PiInvocationOccupancyState): boolean {
  return state.status !== "known" || state.entries.length > 0;
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

export function resolveExactInterruptedRecovery(
  state: PiInvocationOccupancyState,
  ownerJourneyId: string,
  evidence: SettlementRecoveryEvidence,
): PiInvocationLeaseInspection | null {
  const lease = resolveExactSettlementRecovery(state, ownerJourneyId, evidence);
  return lease && lease.terminalState !== "completed" ? lease : null;
}
