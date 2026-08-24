import {
  createConversationReconciliationState,
  parseConversationReconciliationState,
} from "./conversationReconciliation";
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
  if (!["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0"].includes(String(record.schemaVersion))) {
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

  const importedMirrorConversationId = parseImportedMirrorConversationId(conversation.importedActivity);
  const parsedLiveIdentity = parseLiveConversationIdentity(conversation.liveIdentity, {
    journeyId: conversation.journeyId,
    harnessConversationId: conversation.id,
    mirrorConversationId: importedMirrorConversationId,
  });
  if (!parsedLiveIdentity) {
    return undefined;
  }

  const parsedReconciliation = record.schemaVersion === "0.5.0"
    ? parseConversationReconciliationState(conversation.reconciliation, parsedLiveIdentity)
    : createConversationReconciliationState(parsedLiveIdentity, conversation.createdAt);
  if (!parsedReconciliation) {
    return undefined;
  }
  const { liveIdentity, reconciliation } = normalizeImportedMirrorAuthority(
    parsedLiveIdentity,
    parsedReconciliation,
    importedMirrorConversationId,
  );
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

function normalizeImportedMirrorAuthority(
  identity: LiveConversationIdentity,
  reconciliation: ConversationReconciliationState,
  nativeConversationId: string | undefined,
): { liveIdentity: LiveConversationIdentity; reconciliation: ConversationReconciliationState } {
  const legacyConversationId = identity.mirrorConversationId;
  if (
    identity.origin !== "mirror_import"
    || !nativeConversationId
    || legacyConversationId !== `mirror-${nativeConversationId}`
  ) {
    return { liveIdentity: identity, reconciliation };
  }
  const normalizeConversationId = (value: string) =>
    value === legacyConversationId ? nativeConversationId : value;
  return {
    liveIdentity: { ...identity, mirrorConversationId: nativeConversationId },
    reconciliation: {
      ...reconciliation,
      authority: { ...reconciliation.authority, mirrorConversationId: nativeConversationId },
      checkpoints: {
        ...reconciliation.checkpoints,
        ...(reconciliation.checkpoints.mirror ? {
          mirror: {
            ...reconciliation.checkpoints.mirror,
            conversationId: normalizeConversationId(reconciliation.checkpoints.mirror.conversationId),
          },
        } : {}),
      },
      advancement: {
        ...reconciliation.advancement,
        ...(reconciliation.advancement.mirror ? {
          mirror: {
            ...reconciliation.advancement.mirror,
            conversationId: normalizeConversationId(reconciliation.advancement.mirror.conversationId),
          },
        } : {}),
      },
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
  fallback: { journeyId: string; harnessConversationId: string; mirrorConversationId?: string },
): LiveConversationIdentity | undefined {
  if (value === undefined) {
    return {
      schemaVersion: "0.1.0",
      journeyId: fallback.journeyId,
      harnessConversationId: fallback.harnessConversationId,
      piSessionId: `nautilus-${fallback.journeyId}`,
      ...(fallback.mirrorConversationId ? { mirrorConversationId: fallback.mirrorConversationId } : {}),
      generation: 0,
      origin: fallback.mirrorConversationId ? "mirror_import" : "legacy",
    };
  }
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
    identity.generation < 0 ||
    !["new", "continued", "mirror_import", "restart", "legacy"].includes(String(identity.origin))
  ) {
    return undefined;
  }
  return identity as unknown as LiveConversationIdentity;
}

function parseImportedMirrorConversationId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const activity = value as Record<string, unknown>;
  return typeof activity.sourceConversationId === "string" ? activity.sourceConversationId : undefined;
}
