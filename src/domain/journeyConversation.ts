import type { ConversationMessage } from "../agent/piTaskPacket";
import type { ImportedConversationActivity } from "./persistedJourneyConversation";
import {
  createConversationReconciliationState,
  type ConversationReconciliationState,
} from "./conversationReconciliation";

export type MirrorOperatingMode = "mirror" | "builder" | "explorer" | "soul";

export type LiveConversationIdentity = {
  schemaVersion: "0.1.0";
  journeyId: string;
  harnessConversationId: string;
  piSessionId: string;
  mirrorConversationId?: string;
  generation: number;
  origin: "new" | "continued" | "mirror_import" | "mirror_reconciliation" | "restart" | "legacy";
};

export type AuthoritativeContextStats = {
  piSessionId: string;
  generation: number;
  providerModel: string;
  capturedAt: string;
  usage: {
    tokens: number | null;
    contextWindow: number | null;
    percent: number | null;
  };
};

export type CertifiedMirrorModeState = {
  mode: MirrorOperatingMode | null;
  certifiedAt: string;
  sourceId: string;
};

export type JourneyConversation = {
  id: string;
  journeyId: string;
  createdAt: string;
  messages: ConversationMessage[];
  liveIdentity: LiveConversationIdentity;
  reconciliation: ConversationReconciliationState;
  authoritativeContextStats?: AuthoritativeContextStats;
  certifiedMirrorMode?: CertifiedMirrorModeState;
  importedActivity?: ImportedConversationActivity;
};

export type JourneyConversationSummary = {
  id: string;
  journeyId: string;
  createdAt: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  isFresh: boolean;
  isDirty: boolean;
};

export function createJourneyConversation(input: {
  journeyId: string;
  initialMessages: ConversationMessage[];
  now?: Date;
}): JourneyConversation {
  const now = input.now ?? new Date();
  const id = `journey-conversation-${input.journeyId}-${now.toISOString()}`;
  const liveIdentity: LiveConversationIdentity = {
    schemaVersion: "0.1.0",
    journeyId: input.journeyId,
    harnessConversationId: id,
    piSessionId: `nautilus-${input.journeyId}`,
    generation: 0,
    origin: "new",
  };
  return {
    id,
    journeyId: input.journeyId,
    createdAt: now.toISOString(),
    messages: input.initialMessages,
    liveIdentity,
    reconciliation: createConversationReconciliationState(liveIdentity, now.toISOString()),
  };
}

export function summarizeJourneyConversation(conversation: JourneyConversation): JourneyConversationSummary {
  const userMessageCount = conversation.messages.filter((message) => message.role === "user").length;
  const assistantMessageCount = conversation.messages.filter((message) => message.role === "assistant").length;

  return {
    id: conversation.id,
    journeyId: conversation.journeyId,
    createdAt: conversation.createdAt,
    messageCount: conversation.messages.length,
    userMessageCount,
    assistantMessageCount,
    isFresh: userMessageCount === 0,
    isDirty: userMessageCount > 0,
  };
}

export function resetJourneyConversation(input: {
  conversation: JourneyConversation;
  initialMessages: ConversationMessage[];
  now?: Date;
}): JourneyConversation {
  const restarted = createJourneyConversation({
    journeyId: input.conversation.journeyId,
    initialMessages: input.initialMessages,
    now: input.now,
  });
  const liveIdentity: LiveConversationIdentity = {
    ...restarted.liveIdentity,
    piSessionId: input.conversation.liveIdentity.piSessionId,
    generation: input.conversation.liveIdentity.generation + 1,
    origin: "restart",
  };
  return {
    ...restarted,
    liveIdentity,
    reconciliation: createConversationReconciliationState(
      liveIdentity,
      input.now?.toISOString() ?? restarted.createdAt,
    ),
  };
}

export function replaceJourneyConversationMessages(
  conversation: JourneyConversation,
  messages: ConversationMessage[],
): JourneyConversation {
  return {
    ...conversation,
    messages,
  };
}
