import { parseConversationReconciliationState } from "./conversationReconciliation";
import type { ConversationReconciliationState } from "./conversationReconciliation";
import type {
  AuthoritativeContextStats,
  CertifiedMirrorModeState,
  JourneyConversation,
  LiveConversationIdentity,
} from "./journeyConversation";

export type ImportedConversationActivityEvent = {
  id: string;
  kind: string;
  timestamp: string;
  title: string;
  source: {
    system: "mirror";
    table: string;
    id: string;
  };
  content?: string;
  payload?: unknown;
  status?: string;
  severity?: string;
  related?: {
    messageId?: string;
    conversationId?: string;
  };
};

export type ImportedConversationActivity = {
  schemaVersion: "0.1.0";
  source: "mirror";
  sourceConversationId: string;
  events: ImportedConversationActivityEvent[];
};

export type PersistedJourneyConversation = {
  schemaVersion: "0.5.0";
  conversation: JourneyConversation;
  savedAt: string;
};

export function createPersistedJourneyConversation(
  conversation: JourneyConversation,
  now: Date = new Date(),
): PersistedJourneyConversation {
  return {
    schemaVersion: "0.5.0",
    conversation,
    savedAt: now.toISOString(),
  };
}

export function parsePersistedJourneyConversation(value: unknown): PersistedJourneyConversation | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "0.5.0") {
    return undefined;
  }
  if (!record.conversation || typeof record.conversation !== "object") {
    return undefined;
  }

  const conversation = record.conversation as Record<string, unknown>;
  if (
    typeof conversation.id !== "string" ||
    typeof conversation.journeyId !== "string" ||
    typeof conversation.createdAt !== "string" ||
    !Array.isArray(conversation.messages)
  ) {
    return undefined;
  }

  const messages = conversation.messages;
  if (
    !messages.every(
      (message) =>
        message &&
        typeof message === "object" &&
        typeof (message as Record<string, unknown>).id === "string" &&
        ((message as Record<string, unknown>).role === "user" ||
          (message as Record<string, unknown>).role === "assistant") &&
        typeof (message as Record<string, unknown>).content === "string" &&
        typeof (message as Record<string, unknown>).createdAt === "string",
    )
  ) {
    return undefined;
  }

  const parsedLiveIdentity = parseLiveConversationIdentity(conversation.liveIdentity, {
    journeyId: conversation.journeyId,
    harnessConversationId: conversation.id,
  });
  if (!parsedLiveIdentity) {
    return undefined;
  }

  const parsedReconciliation = parseConversationReconciliationState(conversation.reconciliation, parsedLiveIdentity);
  if (!parsedReconciliation) {
    return undefined;
  }
  const liveIdentity = parsedLiveIdentity;
  const reconciliation = parsedReconciliation;
  const authoritativeContextStats = parseAuthoritativeContextStats(conversation.authoritativeContextStats);
  const certifiedMirrorMode = parseCertifiedMirrorModeState(conversation.certifiedMirrorMode);
  const {
    authoritativeContextStats: _unparsedContextStats,
    certifiedMirrorMode: _unparsedMirrorMode,
    reconciliation: _unparsedReconciliation,
    ...conversationWithoutRuntimeState
  } = conversation;

  return {
    schemaVersion: "0.5.0",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date(0).toISOString(),
    conversation: {
      ...(conversationWithoutRuntimeState as unknown as JourneyConversation),
      liveIdentity,
      reconciliation,
      ...(authoritativeContextStats ? { authoritativeContextStats } : {}),
      ...(certifiedMirrorMode ? { certifiedMirrorMode } : {}),
    },
  };
}

function parseCertifiedMirrorModeState(value: unknown): CertifiedMirrorModeState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const state = value as Record<string, unknown>;
  if (
    !(state.mode === null || ["mirror", "builder", "explorer", "soul"].includes(String(state.mode)))
    || typeof state.certifiedAt !== "string"
    || typeof state.sourceId !== "string"
  ) {
    return undefined;
  }
  return state as unknown as CertifiedMirrorModeState;
}

function parseAuthoritativeContextStats(value: unknown): AuthoritativeContextStats | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const stats = value as Record<string, unknown>;
  const usage = stats.usage as Record<string, unknown> | undefined;
  const validMetric = (metric: unknown) => metric === null || typeof metric === "number";
  if (
    typeof stats.piSessionId !== "string" ||
    typeof stats.generation !== "number" ||
    !Number.isInteger(stats.generation) ||
    stats.generation < 0 ||
    typeof stats.providerModel !== "string" ||
    typeof stats.capturedAt !== "string" ||
    !usage ||
    !validMetric(usage.tokens) ||
    !validMetric(usage.contextWindow) ||
    !validMetric(usage.percent)
  ) {
    return undefined;
  }
  return stats as unknown as AuthoritativeContextStats;
}

function parseLiveConversationIdentity(
  value: unknown,
  fallback: { journeyId: string; harnessConversationId: string },
): LiveConversationIdentity | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const identity = value as Record<string, unknown>;
  if (
    identity.schemaVersion !== "0.1.0" ||
    identity.journeyId !== fallback.journeyId ||
    identity.harnessConversationId !== fallback.harnessConversationId ||
    typeof identity.piSessionId !== "string" ||
    typeof identity.generation !== "number" ||
    !Number.isInteger(identity.generation) ||
    identity.generation < 1 ||
    identity.origin !== "new" ||
    typeof identity.mirrorConversationId !== "string" ||
    typeof identity.activationReceiptActivatedAt !== "string"
  ) {
    return undefined;
  }
  return identity as unknown as LiveConversationIdentity;
}
