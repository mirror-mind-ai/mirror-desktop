import type { JourneyConversation, SteeringEvidence, SteeringStatus } from "./journeyConversation";
import type { RunAuthority } from "./runAuthority";

export const MAX_STEERING_MESSAGES_PER_TURN = 8;
export const MAX_STEERING_MESSAGE_CHARS = 16_384;

const transitions: Record<SteeringStatus, SteeringStatus[]> = {
  pending: ["accepted", "applied", "rejected", "terminally_unconsumed"],
  accepted: ["applied", "rejected", "terminally_unconsumed"],
  applied: [],
  rejected: [],
  terminally_unconsumed: ["applied"],
};

export function steeringAuthorityMatches(conversation: JourneyConversation, authority: RunAuthority): boolean {
  const turn = conversation.reconciliation.turns.find((item) => item.turnId === authority.turnId);
  return conversation.journeyId === authority.journeyId
    && conversation.id === authority.threadId
    && conversation.liveIdentity.generation === authority.generation
    && conversation.liveIdentity.piSessionId === authority.piSessionId
    && conversation.liveIdentity.mirrorConversationId === authority.mirrorConversationId
    && turn?.runId === authority.runId
    && turn.harness.userMessageId === authority.harnessUserMessageId
    && turn.harness.assistantMessageId === authority.harnessAssistantMessageId;
}

export function appendPendingSteering(
  conversation: JourneyConversation,
  authority: RunAuthority,
  text: string,
  now: Date = new Date(),
): { conversation: JourneyConversation; evidence: SteeringEvidence } {
  if (!steeringAuthorityMatches(conversation, authority)) throw new Error("steering_authority_mismatch");
  const normalized = text.trim();
  if (!normalized || normalized.length > MAX_STEERING_MESSAGE_CHARS) throw new Error("steering_text_invalid");
  const existing = (conversation.steeringEvidence ?? []).filter((item) => item.turnId === authority.turnId);
  if (existing.length >= MAX_STEERING_MESSAGES_PER_TURN) throw new Error("steering_queue_full");
  const sequence = existing.reduce((maximum, item) => Math.max(maximum, item.sequence), 0) + 1;
  const timestamp = now.toISOString();
  const evidence: SteeringEvidence = {
    schemaVersion: "0.1.0",
    requestId: `steer-${authority.runId}-${sequence}`,
    sequence,
    journeyId: authority.journeyId,
    generation: authority.generation,
    runId: authority.runId,
    turnId: authority.turnId,
    assistantMessageId: authority.harnessAssistantMessageId,
    text: normalized,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { conversation: { ...conversation, steeringEvidence: [...(conversation.steeringEvidence ?? []), evidence] }, evidence };
}

export function transitionSteering(
  conversation: JourneyConversation,
  authority: RunAuthority,
  requestId: string,
  status: SteeringStatus,
  now: Date = new Date(),
  details: { piUserEntryId?: string; terminalReason?: SteeringEvidence["terminalReason"] } = {},
): JourneyConversation {
  if (!steeringAuthorityMatches(conversation, authority)) throw new Error("steering_authority_mismatch");
  let matched = false;
  const steeringEvidence = (conversation.steeringEvidence ?? []).map((item) => {
    if (item.requestId !== requestId) return item;
    matched = true;
    if (item.runId !== authority.runId || item.turnId !== authority.turnId || !transitions[item.status].includes(status)) {
      throw new Error("steering_transition_invalid");
    }
    if (status === "applied" && !details.piUserEntryId) throw new Error("steering_application_evidence_required");
    return {
      ...item,
      status,
      updatedAt: now.toISOString(),
      ...(details.piUserEntryId ? { piUserEntryId: details.piUserEntryId } : {}),
      ...(status === "applied" ? { terminalReason: undefined } : {}),
      ...(details.terminalReason ? { terminalReason: details.terminalReason } : {}),
    };
  });
  if (!matched) throw new Error("steering_request_missing");
  return { ...conversation, steeringEvidence };
}

export function applyNextAcceptedSteering(
  conversation: JourneyConversation,
  authority: RunAuthority,
  text: string,
  piUserEntryId: string,
  now: Date = new Date(),
): JourneyConversation {
  const next = [...(conversation.steeringEvidence ?? [])]
    .filter((item) => item.runId === authority.runId && ["pending", "accepted", "terminally_unconsumed"].includes(item.status) && item.text === text)
    .sort((left, right) => left.sequence - right.sequence)[0];
  return next
    ? transitionSteering(conversation, authority, next.requestId, "applied", now, { piUserEntryId })
    : conversation;
}

export type SteeringUserEntryEvidence = {
  userEntryId: string;
  userText: string;
  recordedAt: string;
};

export function reconcileSteeringUserEntries(
  conversation: JourneyConversation,
  authority: RunAuthority,
  entries: SteeringUserEntryEvidence[],
): JourneyConversation {
  let reconciled = conversation;
  const usedEntries = new Set(
    (reconciled.steeringEvidence ?? []).flatMap((item) => item.piUserEntryId ? [item.piUserEntryId] : []),
  );
  for (const evidence of [...(reconciled.steeringEvidence ?? [])].sort((left, right) => left.sequence - right.sequence)) {
    if (evidence.runId !== authority.runId || !["pending", "accepted", "terminally_unconsumed"].includes(evidence.status)) continue;
    const applied = entries.find((entry) => (
      entry.userText === evidence.text
      && entry.recordedAt >= evidence.createdAt
      && !usedEntries.has(entry.userEntryId)
    ));
    if (!applied) continue;
    reconciled = applyNextAcceptedSteering(
      reconciled,
      authority,
      evidence.text,
      applied.userEntryId,
      new Date(applied.recordedAt),
    );
    usedEntries.add(applied.userEntryId);
  }
  return reconciled;
}

export function settleUnconsumedSteering(
  conversation: JourneyConversation,
  authority: RunAuthority,
  terminalReason: NonNullable<SteeringEvidence["terminalReason"]>,
  now: Date = new Date(),
): JourneyConversation {
  if (!steeringAuthorityMatches(conversation, authority)) throw new Error("steering_authority_mismatch");
  return {
    ...conversation,
    steeringEvidence: (conversation.steeringEvidence ?? []).map((item) => (
      item.runId === authority.runId && (item.status === "pending" || item.status === "accepted")
        ? { ...item, status: "terminally_unconsumed", terminalReason, updatedAt: now.toISOString() }
        : item
    )),
  };
}
