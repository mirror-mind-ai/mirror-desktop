import type { ConversationMessage } from "../agent/piTaskPacket";
import {
  markReconciliationConflict,
  observeExternalMirrorAdvancement,
  type MirrorAdvancement,
  type ReconciliationReasonCode,
} from "./conversationReconciliation";
import type { JourneyConversation } from "./journeyConversation";

export type MirrorSnapshotFingerprint = {
  conversationId: string;
  messageCount: number;
  lastMessageId: string;
  updatedAt?: string;
};

export type MirrorMessageCorrelation = {
  turnId: string;
  phase: "user" | "assistant";
  generation: number;
  piSessionId: string;
  harnessMessageId: string;
};

export type ObservedMirrorMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  boundaryTruncated?: boolean;
  correlation?: MirrorMessageCorrelation;
};

export type MirrorConversationInspection = {
  status: "unchanged" | "advanced" | "conflicted";
  journeyId: string;
  conversationId: string;
  baseMessageId: string;
  baseMessageCount: number;
  fingerprint: MirrorSnapshotFingerprint;
  messages?: ObservedMirrorMessage[];
  reasonCode?: string;
};

export type MirrorReconciliationReview = {
  status: "eligible" | "independent" | "waiting" | "duplicate" | "unsupported" | "conflicted";
  reasonCode?: string;
  fingerprint: MirrorSnapshotFingerprint;
  messages: ObservedMirrorMessage[];
  completeTurnCount: number;
};

export type MirrorInspectionProjection = {
  conversation: JourneyConversation;
  changed: boolean;
  review?: MirrorReconciliationReview;
  conflictCode?: ReconciliationReasonCode;
};

const TRUNCATION_MARKER = "\n[… truncated]";
const CONSOLIDATION_SEPARATOR = "\n\n---\n\n";

export function projectMirrorConversationInspection(
  conversation: JourneyConversation,
  inspection: MirrorConversationInspection,
  observedAt: string,
): MirrorInspectionProjection {
  const mirrorCheckpoint = conversation.reconciliation.checkpoints.mirror;
  const authorityValid = inspection.journeyId === conversation.journeyId
    && inspection.conversationId === conversation.liveIdentity.mirrorConversationId
    && inspection.conversationId === conversation.reconciliation.authority.mirrorConversationId
    && mirrorCheckpoint?.conversationId === inspection.conversationId
    && inspection.baseMessageId === mirrorCheckpoint.lastMessageId
    && inspection.baseMessageCount === mirrorCheckpoint.messageCount;
  if (!authorityValid) return conflict(conversation, "authority_mismatch", inspection, observedAt);
  if (inspection.status === "unchanged") return { conversation, changed: false };
  if (inspection.status === "conflicted") {
    return conflict(conversation, mapConflict(inspection.reasonCode), inspection, observedAt);
  }

  const messages = inspection.messages ?? [];
  if (
    inspection.fingerprint.messageCount < inspection.baseMessageCount
    || inspection.fingerprint.messageCount !== inspection.baseMessageCount + messages.length
    || inspection.fingerprint.lastMessageId !== messages.at(-1)?.id
  ) return conflict(conversation, "mirror_cursor_mismatch", inspection, observedAt);

  const advancement: MirrorAdvancement = {
    conversationId: inspection.conversationId,
    baseMessageId: inspection.baseMessageId,
    lastMessageId: inspection.fingerprint.lastMessageId,
    observedMessageIds: messages.map((message) => message.id),
    messageCount: inspection.fingerprint.messageCount,
    ...(inspection.fingerprint.updatedAt ? { updatedAt: inspection.fingerprint.updatedAt } : {}),
    observedAt,
  };
  const nextState = observeExternalMirrorAdvancement(conversation.reconciliation, advancement);
  const nextConversation = { ...conversation, reconciliation: nextState };
  if (nextState.classification === "conflicted") {
    return { conversation: nextConversation, changed: nextState !== conversation.reconciliation, review: review("conflicted", inspection, messages, 0, "mirror_cursor_mismatch"), conflictCode: nextState.reasonCodes.at(-1) };
  }
  if (messages.length === 0) return conflict(conversation, "mirror_cursor_mismatch", inspection, observedAt);
  if (messages.every((message) => correlationAlreadyCommitted(conversation, message))) {
    return { conversation: nextConversation, changed: nextState !== conversation.reconciliation, review: review("duplicate", inspection, messages, messages.length / 2, "native_correlation_duplicate") };
  }
  if (messages.some((message) => unsupportedMessage(message))) {
    return { conversation: nextConversation, changed: nextState !== conversation.reconciliation, review: review("unsupported", inspection, messages, 0, "unsupported_mirror_record") };
  }

  let completeTurnCount = 0;
  for (let index = 0; index < messages.length; index += 2) {
    if (messages[index]?.role !== "user") {
      return { conversation: nextConversation, changed: nextState !== conversation.reconciliation, review: review("unsupported", inspection, messages, completeTurnCount, "expected_user_record") };
    }
    if (!messages[index + 1]) {
      return { conversation, changed: false, review: review("waiting", inspection, messages, completeTurnCount, "incomplete_mirror_turn") };
    }
    if (messages[index + 1].role !== "assistant") {
      return { conversation: nextConversation, changed: nextState !== conversation.reconciliation, review: review("unsupported", inspection, messages, completeTurnCount, "expected_assistant_record") };
    }
    completeTurnCount += 1;
  }
  if (conversation.reconciliation.advancement.pi || conversation.reconciliation.classification === "pi_advanced") {
    return { conversation: nextConversation, changed: nextState !== conversation.reconciliation, review: review("independent", inspection, messages, completeTurnCount, "independent_pi_advancement") };
  }
  return {
    conversation: nextConversation,
    changed: nextState !== conversation.reconciliation,
    review: review("eligible", inspection, messages, completeTurnCount),
  };
}

export function mirrorMessagesForHarness(messages: ObservedMirrorMessage[]): ConversationMessage[] {
  return messages.map((message) => ({
    id: `mirror-${message.id}`,
    role: message.role as "user" | "assistant",
    content: message.content,
    createdAt: message.createdAt,
  }));
}

function correlationAlreadyCommitted(conversation: JourneyConversation, message: ObservedMirrorMessage): boolean {
  const correlation = message.correlation;
  if (!correlation || correlation.generation !== conversation.liveIdentity.generation || correlation.piSessionId !== conversation.liveIdentity.piSessionId) return false;
  const turn = conversation.reconciliation.turns.find((candidate) => candidate.turnId === correlation.turnId);
  if (!turn || turn.mirror.state !== "committed") return false;
  const mirrorId = correlation.phase === "user" ? turn.mirror.userMessageId : turn.mirror.assistantMessageId;
  const harnessId = correlation.phase === "user" ? turn.harness.userMessageId : turn.harness.assistantMessageId;
  return mirrorId === message.id && harnessId === correlation.harnessMessageId;
}

function unsupportedMessage(message: ObservedMirrorMessage): boolean {
  return !["user", "assistant"].includes(message.role)
    || !message.content.trim()
    || Boolean(message.boundaryTruncated)
    || message.content.endsWith(TRUNCATION_MARKER)
    || (message.role === "assistant" && message.content.includes(CONSOLIDATION_SEPARATOR));
}

function review(
  status: MirrorReconciliationReview["status"],
  inspection: MirrorConversationInspection,
  messages: ObservedMirrorMessage[],
  completeTurnCount: number,
  reasonCode?: string,
): MirrorReconciliationReview {
  return { status, ...(reasonCode ? { reasonCode } : {}), fingerprint: inspection.fingerprint, messages, completeTurnCount };
}

function conflict(
  conversation: JourneyConversation,
  code: ReconciliationReasonCode,
  inspection: MirrorConversationInspection,
  observedAt: string,
): MirrorInspectionProjection {
  const reconciliation = markReconciliationConflict(conversation.reconciliation, code, observedAt);
  return {
    conversation: { ...conversation, reconciliation },
    changed: reconciliation !== conversation.reconciliation,
    review: review("conflicted", inspection, inspection.messages ?? [], 0, inspection.reasonCode ?? code),
    conflictCode: code,
  };
}

function mapConflict(reason?: string): ReconciliationReasonCode {
  if (reason === "checkpoint_regression") return "checkpoint_regression";
  if (reason === "mirror_conversation_mismatch") return "mirror_conversation_mismatch";
  return "mirror_cursor_mismatch";
}
