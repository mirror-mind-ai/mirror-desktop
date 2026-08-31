import type { TurnCorrelation } from "../agent/agentStream";
import type { ConversationMessage } from "../agent/piTaskPacket";
import {
  observeMirrorTurnCommit,
  observeMirrorUserCommit,
  observePiTurnCommit,
} from "./conversationReconciliation";
import type { JourneyConversation } from "./journeyConversation";
import type { JourneySettlementAuthority } from "./journeySettlementAuthority";

export const MIRROR_APPEND_MAX_ITEMS = 32;
export const MIRROR_APPEND_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MIRROR_APPEND_MAX_ITEM_BYTES = 131_072;

export type MirrorAppendMessage = Pick<ConversationMessage, "id" | "role" | "content" | "createdAt"> & {
  metadata: { sourceTurnId: string; generation: number };
};

export type MirrorAppendOutboxItem = {
  schemaVersion: "1.0.0";
  itemId: string;
  journeyId: string;
  threadId: string;
  generation: number;
  conversationId: string;
  sourceInterface: "nautilus-harness";
  createdAt: string;
  messages: [MirrorAppendMessage, MirrorAppendMessage];
};

export type MirrorAppendReceipt = {
  schemaVersion: "1.0.0";
  status: "accepted";
  conversationId: string;
  journeyId: string;
  insertedCount: number;
  existingCount: number;
  messages: Array<{ id: string; state: "inserted" | "existing" }>;
};

export type PiExecutionEvidence = {
  userEntryId: string;
  assistantEntryId: string;
  leafEntryId: string;
  entryCount: number;
  sessionFile: string;
  committedAt: string;
};

export function applyPiExecutionEvidence(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
  evidence: PiExecutionEvidence,
): JourneyConversation {
  return {
    ...conversation,
    reconciliation: observePiTurnCommit(conversation.reconciliation, correlation.turnId, evidence),
  };
}

export type MirrorAppendMessagePairState = "available" | "legacy_absent" | "invalid";
export type PendingMirrorAppendDisposition = "outbox_retry" | "enqueue_required" | "legacy_gap";

export function classifyPendingMirrorAppend(
  pairState: MirrorAppendMessagePairState,
  hasOutboxItem: boolean,
): PendingMirrorAppendDisposition {
  if (hasOutboxItem) return "outbox_retry";
  return pairState === "legacy_absent" ? "legacy_gap" : "enqueue_required";
}

export function classifyMirrorAppendMessagePair(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
): MirrorAppendMessagePairState {
  const user = conversation.messages.find((message) => message.id === correlation.harnessUserMessageId);
  const assistant = conversation.messages.find((message) => message.id === correlation.harnessAssistantMessageId);
  if (!user && !assistant) return "legacy_absent";
  if (
    !user || user.role !== "user" || !user.content
    || !assistant || assistant.role !== "assistant" || !assistant.content
  ) return "invalid";
  return "available";
}

function exactSettlementProjection(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
): boolean {
  const correlation = authority.runAuthority.correlation;
  const turn = conversation.reconciliation.turns.find((candidate) => candidate.turnId === authority.turnId);
  return correlation.schemaVersion === "0.2.0"
    && correlation.journeyId === authority.journeyId
    && correlation.runId === authority.runId
    && correlation.turnId === authority.turnId
    && conversation.journeyId === authority.journeyId
    && conversation.id === authority.threadId
    && conversation.liveIdentity.generation === authority.generation
    && conversation.liveIdentity.piSessionId === authority.piSessionId
    && conversation.liveIdentity.piSessionFile === authority.piSessionFile
    && conversation.liveIdentity.mirrorConversationId === authority.mirrorConversationId
    && turn?.runId === authority.runId
    && turn.harness.userMessageId === authority.harnessUserMessageId
    && turn.harness.assistantMessageId === authority.harnessAssistantMessageId;
}

export function createMirrorAppendOutboxItem(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
): MirrorAppendOutboxItem {
  const correlation = authority.runAuthority.correlation;
  const turn = conversation.reconciliation.turns.find((candidate) => candidate.turnId === correlation.turnId);
  const user = conversation.messages.find((message) => message.id === correlation.harnessUserMessageId);
  const assistant = conversation.messages.find((message) => message.id === correlation.harnessAssistantMessageId);
  const conversationId = conversation.liveIdentity.mirrorConversationId;
  if (
    !exactSettlementProjection(conversation, authority)
    || !turn || turn.pi.state !== "committed" || !turn.pi.committedAt || turn.harness.state !== "committed"
    || !conversationId || classifyMirrorAppendMessagePair(conversation, correlation) !== "available"
    || !user || !assistant
  ) throw new Error("mirror_append_item_authority_invalid");
  const message = (value: ConversationMessage): MirrorAppendMessage => ({
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: value.createdAt,
    metadata: { sourceTurnId: correlation.turnId, generation: conversation.liveIdentity.generation },
  });
  return {
    schemaVersion: "1.0.0",
    itemId: correlation.turnId,
    journeyId: conversation.journeyId,
    threadId: conversation.id,
    generation: conversation.liveIdentity.generation,
    conversationId,
    sourceInterface: "nautilus-harness",
    createdAt: turn.pi.committedAt,
    messages: [message(user), message(assistant)] as [MirrorAppendMessage, MirrorAppendMessage],
  };
}

export function parseMirrorAppendReceipt(value: unknown): MirrorAppendReceipt | undefined {
  if (!value || typeof value !== "object") return undefined;
  const receipt = value as Record<string, unknown>;
  if (
    receipt.schemaVersion !== "1.0.0" || receipt.status !== "accepted"
    || typeof receipt.conversationId !== "string" || typeof receipt.journeyId !== "string"
    || !Number.isInteger(receipt.insertedCount) || Number(receipt.insertedCount) < 0
    || !Number.isInteger(receipt.existingCount) || Number(receipt.existingCount) < 0
    || !Array.isArray(receipt.messages) || receipt.messages.length !== 2
    || !receipt.messages.every((item) => item && typeof item === "object"
      && typeof (item as Record<string, unknown>).id === "string"
      && ["inserted", "existing"].includes(String((item as Record<string, unknown>).state)))
    || Number(receipt.insertedCount) + Number(receipt.existingCount) !== 2
    || receipt.messages.filter((item) => (item as Record<string, unknown>).state === "inserted").length !== Number(receipt.insertedCount)
    || receipt.messages.filter((item) => (item as Record<string, unknown>).state === "existing").length !== Number(receipt.existingCount)
  ) return undefined;
  return receipt as unknown as MirrorAppendReceipt;
}

export function applyMirrorAppendReceipt(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
  receipt: MirrorAppendReceipt,
  observedAt: string,
): JourneyConversation {
  const correlation = authority.runAuthority.correlation;
  const ids = receipt.messages.map((message) => message.id);
  if (
    !exactSettlementProjection(conversation, authority)
    || receipt.conversationId !== authority.mirrorConversationId
    || receipt.journeyId !== authority.journeyId
    || ids[0] !== authority.harnessUserMessageId
    || ids[1] !== authority.harnessAssistantMessageId
  ) throw new Error("mirror_append_receipt_authority_mismatch");
  const turn = conversation.reconciliation.turns.find((candidate) => candidate.turnId === authority.turnId);
  if (turn?.mirror.state === "committed"
    && turn.mirror.userMessageId === authority.harnessUserMessageId
    && turn.mirror.assistantMessageId === authority.harnessAssistantMessageId) {
    return conversation;
  }
  const cumulativeMessageCount = (conversation.reconciliation.checkpoints.mirror?.messageCount ?? 0) + 2;
  let reconciliation = observeMirrorUserCommit(
    conversation.reconciliation, correlation.turnId, ids[0], observedAt,
  );
  reconciliation = observeMirrorTurnCommit(reconciliation, correlation.turnId, {
    userMessageId: ids[0], assistantMessageId: ids[1],
    messageCount: cumulativeMessageCount, committedAt: observedAt,
  });
  return { ...conversation, reconciliation };
}
