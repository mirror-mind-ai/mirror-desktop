import type { TurnCorrelation } from "../agent/agentStream";
import type { ConversationMessage } from "../agent/piTaskPacket";
import {
  observeMirrorTurnCommit,
  observeMirrorUserCommit,
  observePiTurnCommit,
} from "./conversationReconciliation";
import type { JourneyConversation } from "./journeyConversation";

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

export function createMirrorAppendOutboxItem(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
): MirrorAppendOutboxItem {
  const turn = conversation.reconciliation.turns.find((candidate) => candidate.turnId === correlation.turnId);
  const user = conversation.messages.find((message) => message.id === correlation.harnessUserMessageId);
  const assistant = conversation.messages.find((message) => message.id === correlation.harnessAssistantMessageId);
  const conversationId = conversation.liveIdentity.mirrorConversationId;
  if (
    !turn || turn.pi.state !== "committed" || !turn.pi.committedAt || turn.harness.state !== "committed"
    || !conversationId || !user || user.role !== "user" || !user.content
    || !assistant || assistant.role !== "assistant" || !assistant.content
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
  correlation: TurnCorrelation,
  receipt: MirrorAppendReceipt,
  observedAt: string,
): JourneyConversation {
  const ids = receipt.messages.map((message) => message.id);
  if (
    receipt.conversationId !== conversation.liveIdentity.mirrorConversationId
    || receipt.journeyId !== conversation.journeyId
    || ids[0] !== correlation.harnessUserMessageId
    || ids[1] !== correlation.harnessAssistantMessageId
  ) throw new Error("mirror_append_receipt_authority_mismatch");
  let reconciliation = observeMirrorUserCommit(
    conversation.reconciliation, correlation.turnId, ids[0], observedAt,
  );
  reconciliation = observeMirrorTurnCommit(reconciliation, correlation.turnId, {
    userMessageId: ids[0], assistantMessageId: ids[1], messageCount: 2, committedAt: observedAt,
  });
  return { ...conversation, reconciliation };
}
