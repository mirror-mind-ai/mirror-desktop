import type { JourneyConversation, SteeringEvidence, SteeringStatus } from "./journeyConversation";
import type { RunAuthority } from "./runAuthority";

export const MAX_STEERING_MESSAGES_PER_TURN = 8;
export const MAX_STEERING_MESSAGE_CHARS = 16_384;

const transitions: Record<SteeringStatus, SteeringStatus[]> = {
  pending: ["accepted", "delivered", "applied", "rejected", "terminally_unconsumed"],
  accepted: ["delivered", "applied", "rejected", "terminally_unconsumed"],
  // CR117: a delivered correction reached the model but may still never become a session entry —
  // a cancelled run is the ordinary case — so both the applied and the unconsumed ends stay open.
  delivered: ["applied", "terminally_unconsumed"],
  applied: [],
  rejected: [],
  terminally_unconsumed: ["applied"],
};

/** Statuses whose correction is still Pi's to deliver, so a queue departure can speak about them. */
const AWAITING_DELIVERY: SteeringStatus[] = ["pending", "accepted"];

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

/**
 * CR117: Pi reports its steering queue and splices a correction out of it at the moment it hands
 * that correction to the model. So delivery is read from *absence*: a correction of this run that
 * is no longer queued has departed. The queue holds texts, which is the identity Pi itself matches
 * on and the identity the settlement reconciliation already uses.
 *
 * Pi has no entry id to offer here — it mints one only when it persists an entry — so this can
 * never produce `applied`, and deliberately does not try.
 */
export function markSteeringDeliveredByQueueDeparture(
  conversation: JourneyConversation,
  authority: RunAuthority,
  queuedTexts: readonly string[],
  now: Date = new Date(),
): JourneyConversation {
  if (!steeringAuthorityMatches(conversation, authority)) throw new Error("steering_authority_mismatch");
  // Pi may hold several copies of one text. Each copy still queued accounts for one of ours, so
  // only the surplus has departed. Pi delivers in order, so the copies it still holds are the
  // most recent ones — hence the walk is newest-first and the oldest surplus is what departed.
  const remaining = new Map<string, number>();
  for (const text of queuedTexts) remaining.set(text, (remaining.get(text) ?? 0) + 1);

  let changed = false;
  const steeringEvidence = [...(conversation.steeringEvidence ?? [])]
    .sort((left, right) => right.sequence - left.sequence)
    .map((item) => {
      if (item.runId !== authority.runId || !AWAITING_DELIVERY.includes(item.status)) return item;
      const held = remaining.get(item.text) ?? 0;
      if (held > 0) {
        remaining.set(item.text, held - 1);
        return item;
      }
      changed = true;
      return { ...item, status: "delivered" as const, updatedAt: now.toISOString() };
    });

  if (!changed) return conversation;
  const bySequence = new Map(steeringEvidence.map((item) => [item.requestId, item]));
  return {
    ...conversation,
    // Preserve the stored order rather than the sort used to decide departures.
    steeringEvidence: (conversation.steeringEvidence ?? []).map((item) => bySequence.get(item.requestId) ?? item),
  };
}

export function applyNextAcceptedSteering(
  conversation: JourneyConversation,
  authority: RunAuthority,
  text: string,
  piUserEntryId: string,
  now: Date = new Date(),
): JourneyConversation {
  const next = [...(conversation.steeringEvidence ?? [])]
    .filter((item) => item.runId === authority.runId && ["pending", "accepted", "delivered", "terminally_unconsumed"].includes(item.status) && item.text === text)
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
    if (evidence.runId !== authority.runId || !["pending", "accepted", "delivered", "terminally_unconsumed"].includes(evidence.status)) continue;
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
      item.runId === authority.runId
        && (item.status === "pending" || item.status === "accepted" || item.status === "delivered")
        ? { ...item, status: "terminally_unconsumed", terminalReason, updatedAt: now.toISOString() }
        : item
    )),
  };
}
