import { parseConversationReconciliationState } from "./conversationReconciliation";
import type { ConversationReconciliationState } from "./conversationReconciliation";
import { normalizeConversationAttachmentProvenance } from "./contextAttachments";
import { normalizePersistedFileAttachment } from "./fileAttachments";
import type {
  AuthoritativeContextStats,
  CertifiedMirrorModeState,
  JourneyConversation,
  LiveConversationIdentity,
  TerminalAgentActionEvidence,
  TerminalAgentActionProjection,
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
  schemaVersion: "0.8.0";
  conversation: JourneyConversation;
  savedAt: string;
};

export function createPersistedJourneyConversation(
  conversation: JourneyConversation,
  now: Date = new Date(),
): PersistedJourneyConversation {
  return {
    schemaVersion: "0.8.0",
    conversation,
    savedAt: now.toISOString(),
  };
}

export function parsePersistedJourneyConversation(value: unknown): PersistedJourneyConversation | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (!["0.5.0", "0.6.0", "0.7.0", "0.8.0"].includes(String(record.schemaVersion))) {
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
        typeof (message as Record<string, unknown>).createdAt === "string" &&
        ((message as Record<string, unknown>).attachments === undefined
          || Array.isArray((message as Record<string, unknown>).attachments)),
    )
  ) {
    return undefined;
  }
  let parsedMessages;
  try {
    parsedMessages = messages.map((message) => {
      const item = message as Record<string, unknown>;
      const attachments = item.attachments as unknown[] | undefined;
      if (record.schemaVersion === "0.5.0" && attachments?.length) throw new Error("Legacy conversations cannot carry attachments.");
      const parsedAttachments = attachments?.map((attachment) => {
        const schemaVersion = (attachment as Record<string, unknown> | undefined)?.schemaVersion;
        if (schemaVersion === "0.2.0") {
          if (!["0.7.0", "0.8.0"].includes(String(record.schemaVersion))) throw new Error("File references require conversation schema 0.7.0 or newer.");
          return normalizePersistedFileAttachment(attachment, conversation.journeyId as string);
        }
        return normalizeConversationAttachmentProvenance(attachment, conversation.journeyId as string);
      });
      return {
        id: item.id as string,
        role: item.role as "user" | "assistant",
        content: item.content as string,
        createdAt: item.createdAt as string,
        ...(parsedAttachments?.length ? { attachments: parsedAttachments } : {}),
      };
    });
  } catch {
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
  const terminalAgentActionEvidence = record.schemaVersion === "0.8.0"
    ? parseTerminalAgentActionEvidenceMap(conversation.terminalAgentActionEvidence, {
        journeyId: conversation.journeyId as string,
        generation: liveIdentity.generation,
        messages: parsedMessages,
        turns: reconciliation.turns,
      })
    : undefined;
  const {
    authoritativeContextStats: _unparsedContextStats,
    certifiedMirrorMode: _unparsedMirrorMode,
    reconciliation: _unparsedReconciliation,
    terminalAgentActionEvidence: _unparsedTerminalActionEvidence,
    ...conversationWithoutRuntimeState
  } = conversation;

  return {
    schemaVersion: "0.8.0",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date(0).toISOString(),
    conversation: {
      ...(conversationWithoutRuntimeState as unknown as JourneyConversation),
      messages: parsedMessages,
      liveIdentity,
      reconciliation,
      ...(authoritativeContextStats ? { authoritativeContextStats } : {}),
      ...(certifiedMirrorMode ? { certifiedMirrorMode } : {}),
      ...(terminalAgentActionEvidence ? { terminalAgentActionEvidence } : {}),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseTerminalAgentActionEvidenceMap(
  value: unknown,
  authority: {
    journeyId: string;
    generation: number;
    messages: Array<{ id: string; role: "user" | "assistant" }>;
    turns: ConversationReconciliationState["turns"];
  },
): Record<string, TerminalAgentActionEvidence> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, TerminalAgentActionEvidence> = {};
  for (const [messageId, candidate] of Object.entries(value)) {
    const evidence = parseTerminalAgentActionEvidence(candidate);
    const turn = evidence && authority.turns.find((item) => (
      item.turnId === evidence.turnId
      && item.runId === evidence.runId
      && item.harness.assistantMessageId === messageId
    ));
    if (!evidence || !turn
      || evidence.assistantMessageId !== messageId
      || evidence.journeyId !== authority.journeyId
      || evidence.generation !== authority.generation
      || !authority.messages.some((message) => message.role === "assistant" && message.id === messageId)) continue;
    result[messageId] = evidence;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseTerminalAgentActionEvidence(value: unknown): TerminalAgentActionEvidence | undefined {
  if (!isRecord(value) || value.schemaVersion !== "0.1.0"
    || typeof value.journeyId !== "string" || typeof value.generation !== "number"
    || typeof value.runId !== "string" || typeof value.turnId !== "string"
    || typeof value.assistantMessageId !== "string") return undefined;
  const projection = parseTerminalAgentActionProjection(value.projection);
  return projection ? { ...(value as Omit<TerminalAgentActionEvidence, "projection">), projection } : undefined;
}

function parseTerminalAgentActionProjection(value: unknown): TerminalAgentActionProjection | undefined {
  if (!isRecord(value) || !["completed", "cancelled", "failed"].includes(String(value.status))
    || !Array.isArray(value.operations) || !Array.isArray(value.reasoningSummaries)
    || !Array.isArray(value.activityOrder)) return undefined;
  const operationsValid = value.operations.every((item) => isRecord(item)
    && typeof item.id === "string" && typeof item.name === "string"
    && ["completed", "failed", "interrupted"].includes(String(item.status))
    && (item.output === undefined || typeof item.output === "string"));
  const summariesValid = value.reasoningSummaries.every((item) => isRecord(item)
    && typeof item.id === "string" && typeof item.content === "string"
    && ["completed", "interrupted"].includes(String(item.status)));
  const orderValid = value.activityOrder.every((item) => isRecord(item)
    && ["operation", "reasoning_summary"].includes(String(item.type))
    && typeof item.id === "string");
  if (!operationsValid || !summariesValid || !orderValid
    || (value.terminalMessage !== undefined && typeof value.terminalMessage !== "string")) return undefined;
  return value as unknown as TerminalAgentActionProjection;
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
