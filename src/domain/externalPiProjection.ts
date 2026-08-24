import type { ConversationMessage } from "../agent/piTaskPacket";
import {
  markReconciliationConflict,
  materializeExternalPiProjection,
  observeExternalPiAdvancement,
  type PiAdvancement,
} from "./conversationReconciliation";
import type { JourneyConversation } from "./journeyConversation";

export type ExternalPiFileFingerprint = {
  sessionFile: string;
  size: number;
  modifiedMs: number;
  fileId: number;
};

export type ExternalPiProjectedTurn = {
  userEntryId: string;
  assistantEntryId: string;
  userText: string;
  assistantText: string;
  startedAt: string;
  committedAt: string;
};

export type ExternalPiInspection = {
  status: "unchanged" | "waiting" | "advanced" | "conflicted";
  journeyId: string;
  piSessionId: string;
  generation: number;
  sessionFile: string;
  fingerprint: ExternalPiFileFingerprint;
  baseLeafEntryId: string;
  leafEntryId?: string;
  entryCount?: number;
  observedEntryIds?: string[];
  ancestorEntryIds?: string[];
  turns?: ExternalPiProjectedTurn[];
  reasonCode?: string;
};

export type ExternalPiProjectionResult = {
  conversation: JourneyConversation;
  changed: boolean;
  conflictCode?: string;
};

export function projectExternalPiInspection(
  conversation: JourneyConversation,
  inspection: ExternalPiInspection,
  observedAt: string,
): ExternalPiProjectionResult {
  const identity = conversation.liveIdentity;
  if (
    inspection.journeyId !== identity.journeyId
    || inspection.piSessionId !== identity.piSessionId
    || inspection.generation !== identity.generation
  ) {
    return conflict(conversation, "authority_mismatch", observedAt);
  }
  if (inspection.status === "conflicted") {
    return conflict(conversation, boundedConflict(inspection.reasonCode), observedAt);
  }
  if (inspection.status !== "advanced") {
    return { conversation, changed: false };
  }

  if (
    conversation.reconciliation.classification !== "in_sync"
    && conversation.reconciliation.classification !== "pi_advanced"
  ) {
    return conflict(conversation, "authority_mismatch", observedAt);
  }
  const harnessCheckpoint = conversation.reconciliation.checkpoints.harness;
  const piCheckpoint = conversation.reconciliation.checkpoints.pi;
  if (!harnessCheckpoint || !piCheckpoint) {
    return conflict(conversation, "pi_checkpoint_missing", observedAt);
  }
  const lastMessage = conversation.messages.at(-1);
  if (
    conversation.messages.length !== harnessCheckpoint.messageCount
    || lastMessage?.id !== harnessCheckpoint.lastMessageId
  ) {
    return conflict(conversation, "authority_mismatch", observedAt);
  }
  if (
    inspection.baseLeafEntryId !== piCheckpoint.leafEntryId
    || inspection.sessionFile !== piCheckpoint.sessionFile
    || !inspection.leafEntryId
    || inspection.entryCount === undefined
    || !inspection.observedEntryIds?.length
    || !inspection.ancestorEntryIds?.includes(piCheckpoint.leafEntryId)
    || !inspection.turns?.length
  ) {
    return conflict(conversation, "pi_ancestry_mismatch", observedAt);
  }

  const externalMessages = inspection.turns.flatMap(projectTurnMessages);
  const knownIds = new Set(conversation.messages.map((message) => message.id));
  if (externalMessages.some((message) => knownIds.has(message.id))) {
    return conflict(conversation, "native_id_mismatch", observedAt);
  }
  const nextMessages = [...conversation.messages, ...externalMessages];
  const advancement: PiAdvancement = {
    generation: identity.generation,
    baseLeafEntryId: inspection.baseLeafEntryId,
    leafEntryId: inspection.leafEntryId,
    observedEntryIds: inspection.observedEntryIds,
    ancestorEntryIds: inspection.ancestorEntryIds,
    entryCount: inspection.entryCount,
    sessionFile: inspection.sessionFile,
    observedAt,
  };
  const observed = observeExternalPiAdvancement(conversation.reconciliation, advancement);
  if (observed.classification === "conflicted") {
    return { conversation: { ...conversation, reconciliation: observed }, changed: true, conflictCode: observed.reasonCodes.at(-1) };
  }
  const lastTurn = inspection.turns.at(-1) as ExternalPiProjectedTurn;
  const reconciliation = materializeExternalPiProjection(observed, advancement, {
    lastMessageId: externalAssistantMessageId(lastTurn.assistantEntryId),
    lastTurnId: externalTurnId(lastTurn.userEntryId, lastTurn.assistantEntryId),
    messageCount: nextMessages.length,
  });
  return {
    conversation: { ...conversation, messages: nextMessages, reconciliation },
    changed: true,
  };
}

export function externalTurnId(userEntryId: string, assistantEntryId: string): string {
  return `pi-external-${userEntryId}-${assistantEntryId}`;
}

export function externalUserMessageId(entryId: string): string {
  return `pi-user-${entryId}`;
}

export function externalAssistantMessageId(entryId: string): string {
  return `pi-assistant-${entryId}`;
}

function projectTurnMessages(turn: ExternalPiProjectedTurn): ConversationMessage[] {
  return [
    {
      id: externalUserMessageId(turn.userEntryId),
      role: "user",
      content: turn.userText,
      createdAt: turn.startedAt,
    },
    {
      id: externalAssistantMessageId(turn.assistantEntryId),
      role: "assistant",
      content: turn.assistantText,
      createdAt: turn.committedAt,
    },
  ];
}

function conflict(
  conversation: JourneyConversation,
  reasonCode: "authority_mismatch" | "pi_checkpoint_missing" | "pi_ancestry_mismatch" | "native_id_mismatch",
  observedAt: string,
): ExternalPiProjectionResult {
  return {
    conversation: {
      ...conversation,
      reconciliation: markReconciliationConflict(conversation.reconciliation, reasonCode, observedAt),
    },
    changed: true,
    conflictCode: reasonCode,
  };
}

function boundedConflict(value: string | undefined): "authority_mismatch" | "pi_ancestry_mismatch" {
  return value === "authority_mismatch" ? value : "pi_ancestry_mismatch";
}
