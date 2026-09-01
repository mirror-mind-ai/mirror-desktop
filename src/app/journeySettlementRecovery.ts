import type { JourneyConversation } from "../domain/journeyConversation";
import { createJourneySettlementAuthority, type JourneySettlementAuthority } from "../domain/journeySettlementAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { pendingMirrorTurnRepair } from "../domain/threeBodyTurnCommit";
import type { MirrorAppendOutboxSummary } from "./mirrorAppendOutboxStorage";
import type {
  PiInvocationLeaseInspection,
  PiInvocationRegistryInspection,
} from "./piInvocationOccupancy";
import { validatePostFrontierSettlement } from "./journeySettlement";

export type SettlementRecoveryDiagnostic =
  | "settlement_recovery_evidence_missing"
  | "settlement_authority_mismatch";

export type PersistedSettlementRecovery =
  | {
    status: "ready";
    authority: JourneySettlementAuthority;
    projection: JourneyConversation;
    outbox: MirrorAppendOutboxSummary;
  }
  | {
    status: "blocked";
    journeyId: string;
    diagnostic: SettlementRecoveryDiagnostic;
  };

function leaseAuthorityMatchesSettlement(
  lease: PiInvocationLeaseInspection,
  authority: JourneySettlementAuthority,
): boolean {
  return lease.authority.journeyId === authority.journeyId
    && lease.authority.runId === authority.runId
    && lease.authority.turnId === authority.turnId
    && lease.authority.threadId === authority.threadId
    && lease.authority.generation === authority.generation
    && lease.authority.piSessionId === authority.piSessionId
    && lease.authority.mirrorConversationId === authority.mirrorConversationId
    && lease.authority.harnessUserMessageId === authority.harnessUserMessageId
    && lease.authority.harnessAssistantMessageId === authority.harnessAssistantMessageId;
}

export function resolveRetainedLeaseForOutboxRecovery(
  inspection: PiInvocationRegistryInspection,
  authority: JourneySettlementAuthority,
): PiInvocationLeaseInspection | null {
  return inspection.entries.find((lease) => (
    lease.leasePhase === "finalizing"
    && lease.processCapacityState === "released"
    && leaseAuthorityMatchesSettlement(lease, authority)
  )) ?? null;
}

export function resolveCommittedLeaseBeforeInvocation(
  inspection: PiInvocationRegistryInspection,
  projection: JourneyConversation,
): PiInvocationLeaseInspection | null {
  const turn = projection.reconciliation.turns.at(-1);
  if (!turn?.runId
    || turn.harness.state !== "committed"
    || turn.pi.state !== "committed"
    || turn.mirror.state !== "committed"
    || !turn.harness.userMessageId
    || !turn.harness.assistantMessageId) return null;
  return inspection.entries.find((lease) => (
    lease.leasePhase === "finalizing"
    && lease.processCapacityState === "released"
    && lease.terminalState === "completed"
    && lease.authority.journeyId === projection.journeyId
    && lease.authority.runId === turn.runId
    && lease.authority.turnId === turn.turnId
    && lease.authority.threadId === projection.id
    && lease.authority.generation === projection.liveIdentity.generation
    && lease.authority.piSessionId === projection.liveIdentity.piSessionId
    && lease.authority.mirrorConversationId === projection.liveIdentity.mirrorConversationId
    && lease.authority.harnessUserMessageId === turn.harness.userMessageId
    && lease.authority.harnessAssistantMessageId === turn.harness.assistantMessageId
  )) ?? null;
}

export function resolvePersistedSettlementRecovery(
  projection: JourneyConversation | undefined,
  outbox: MirrorAppendOutboxSummary,
): PersistedSettlementRecovery {
  if (!projection) {
    return { status: "blocked", journeyId: outbox.journeyId, diagnostic: "settlement_recovery_evidence_missing" };
  }
  try {
    const repair = pendingMirrorTurnRepair(projection, outbox.itemId);
    if (!repair) throw new Error("missing_turn");
    const authority = createJourneySettlementAuthority(
      createRunAuthority(repair.correlation, projection.liveIdentity),
    );
    validatePostFrontierSettlement(authority, projection, outbox);
    return { status: "ready", authority, projection, outbox };
  } catch {
    return { status: "blocked", journeyId: outbox.journeyId, diagnostic: "settlement_authority_mismatch" };
  }
}
