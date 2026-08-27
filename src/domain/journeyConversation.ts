import type { ConversationMessage } from "../agent/piTaskPacket";
import type { ImportedConversationActivity } from "./persistedJourneyConversation";
import type { NautilusJourneyThread } from "./nautilusJourneyThread";
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
  piSessionFile?: string;
  mirrorConversationId?: string;
  activationReceiptActivatedAt?: string;
  generation: number;
  origin: "new";
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

export function createDedicatedJourneyConversation(input: {
  thread: NautilusJourneyThread;
  initialMessages: ConversationMessage[];
  now?: Date;
}): JourneyConversation {
  const base = createJourneyConversation({ journeyId: input.thread.journeyId, initialMessages: input.initialMessages, now: input.now });
  const generation = input.thread.generations.find((item) => item.generation === input.thread.activeGeneration);
  if (!generation || generation.status !== "ready") return base;
  const liveIdentity: LiveConversationIdentity = {
    schemaVersion: "0.1.0",
    journeyId: input.thread.journeyId,
    harnessConversationId: input.thread.threadId,
    piSessionId: generation.piSessionId,
    piSessionFile: generation.piSessionFile,
    mirrorConversationId: generation.mirrorConversationId,
    activationReceiptActivatedAt: generation.activationReceipt?.activatedAt,
    generation: generation.generation,
    origin: "new",
  };
  return { ...base, id: input.thread.threadId, liveIdentity, reconciliation: createConversationReconciliationState(liveIdentity, base.createdAt) };
}

export function restoreDedicatedJourneyConversation(
  thread: NautilusJourneyThread,
  persisted?: JourneyConversation,
): JourneyConversation {
  const generation = thread.generations.find((item) => item.generation === thread.activeGeneration);
  if (
    persisted
    && generation?.status === "ready"
    && persisted.journeyId === thread.journeyId
    && persisted.liveIdentity.harnessConversationId === thread.threadId
    && persisted.liveIdentity.generation === generation.generation
    && persisted.liveIdentity.piSessionId === generation.piSessionId
    && persisted.liveIdentity.piSessionFile === generation.piSessionFile
    && persisted.liveIdentity.mirrorConversationId === generation.mirrorConversationId
    && persisted.liveIdentity.activationReceiptActivatedAt === generation.activationReceipt?.activatedAt
  ) return persisted;
  return createDedicatedJourneyConversation({ thread, initialMessages: [] });
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

export function replaceJourneyConversationMessages(
  conversation: JourneyConversation,
  messages: ConversationMessage[],
): JourneyConversation {
  return {
    ...conversation,
    messages,
  };
}
