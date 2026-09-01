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
  limit: 1 | 2 | null;
  processCapacityInUse: number | null;
  entries: PiInvocationLeaseInspection[];
  diagnostic: string | null;
}

export type PiInvocationAdmission =
  | { allowed: true; reason: null }
  | { allowed: false; reason: "inspection_unknown" | "same_journey_occupied" | "global_capacity_reached" };

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
const INSPECTION_KEYS = ["schemaVersion", "limit", "processCapacityInUse", "entries"] as const;
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
  if (!isRecord(value) || !hasExactKeys(value, ENTRY_KEYS) || !validAuthority(value.authority)) return false;
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
    || (value.limit !== 1 && value.limit !== 2)
    || !Number.isSafeInteger(value.processCapacityInUse)
    || Number(value.processCapacityInUse) < 0
    || Number(value.processCapacityInUse) > Number(value.limit)
    || !Array.isArray(value.entries)
    || value.entries.length > Number(value.limit)
    || !value.entries.every(validEntry)) {
    return false;
  }
  const entries = value.entries as PiInvocationLeaseInspection[];
  const journeys = new Set(entries.map((entry) => entry.authority.journeyId));
  const runs = new Set(entries.map((entry) => entry.authority.runId));
  if (journeys.size !== entries.length || runs.size !== entries.length) return false;
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
      processCapacityInUse: state.processCapacityInUse,
      entries: state.entries,
      diagnostic: "Native Pi invocation occupancy inspection was invalid.",
    };
  }
  return {
    status: "known",
    requestId: null,
    limit: inspection.limit as 1 | 2,
    processCapacityInUse: inspection.processCapacityInUse,
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
  return {
    status: "unknown",
    requestId: null,
    limit: state.limit,
    processCapacityInUse: state.processCapacityInUse,
    entries: state.entries,
    diagnostic,
  };
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
  const entries = [...otherEntries, expectedEntry]
    .sort((left, right) => left.authority.journeyId.localeCompare(right.authority.journeyId));
  return {
    ...state,
    entries,
    processCapacityInUse: entries.filter((entry) => entry.processCapacityState !== "released").length,
  };
}

export function derivePiInvocationAdmission(
  state: PiInvocationOccupancyState,
  journeyId: string,
): PiInvocationAdmission {
  if (state.status !== "known" || state.limit === null || state.processCapacityInUse === null) {
    return { allowed: false, reason: "inspection_unknown" };
  }
  if (state.entries.some((entry) => entry.authority.journeyId === journeyId)) {
    return { allowed: false, reason: "same_journey_occupied" };
  }
  if (state.entries.length >= state.limit || state.processCapacityInUse >= state.limit) {
    return { allowed: false, reason: "global_capacity_reached" };
  }
  return { allowed: true, reason: null };
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

export function shouldRehydratePiProcessRoute(
  lease: PiInvocationLeaseInspection | undefined,
  selectedRuntimeBusy: boolean,
): boolean {
  return Boolean(lease)
    && !selectedRuntimeBusy
    && lease?.terminalState === "open"
    && (lease.leasePhase === "reserved" || lease.leasePhase === "running");
}

export function resolveExactInterruptedRecovery(
  state: PiInvocationOccupancyState,
  ownerJourneyId: string,
  evidence: SettlementRecoveryEvidence,
): PiInvocationLeaseInspection | null {
  const lease = resolveExactSettlementRecovery(state, ownerJourneyId, evidence);
  return lease && lease.terminalState !== "completed" ? lease : null;
}
