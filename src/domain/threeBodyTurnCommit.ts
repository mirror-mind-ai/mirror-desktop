import type { MirrorCommitEvent, TurnCorrelation } from "../agent/agentStream";
import type { MirrorTurnCommitStatus } from "../agent/piProcessStream";
import type { ConversationMessage } from "../agent/piTaskPacket";
import {
  beginNautilusTurn,
  bindMirrorConversation,
  markTurnBodyFailed,
  observeHarnessTurnCommit,
  observeMirrorTurnCommit,
  observeMirrorUserCommit,
  observePiTurnCommit,
  observePiUserEntry,
} from "./conversationReconciliation";
import type { JourneyConversation } from "./journeyConversation";

export type PendingMirrorTurnRepair = {
  correlation: TurnCorrelation;
  sessionFile: string;
  failureCode?: string;
};

export function pendingMirrorTurnRepair(conversation: JourneyConversation): PendingMirrorTurnRepair | undefined {
  const turn = [...conversation.reconciliation.turns].reverse().find((item) =>
    item.origin === "nautilus"
    && item.runId
    && item.harness.state === "committed"
    && item.pi.state === "committed"
    && item.mirror.state !== "committed",
  );
  if (
    !turn?.runId
    || !turn.harness.userMessageId
    || !turn.harness.assistantMessageId
    || !turn.pi.sessionFile
  ) return undefined;
  return {
    correlation: {
      schemaVersion: "0.1.0",
      journeyId: conversation.liveIdentity.journeyId,
      harnessConversationId: conversation.liveIdentity.harnessConversationId,
      piSessionId: conversation.liveIdentity.piSessionId,
      generation: conversation.liveIdentity.generation,
      turnId: turn.turnId,
      runId: turn.runId,
      harnessUserMessageId: turn.harness.userMessageId,
      harnessAssistantMessageId: turn.harness.assistantMessageId,
      ...(conversation.liveIdentity.mirrorConversationId
        ? { mirrorConversationId: conversation.liveIdentity.mirrorConversationId }
        : {}),
    },
    sessionFile: turn.pi.sessionFile,
    ...(turn.mirror.failureCode ? { failureCode: turn.mirror.failureCode } : {}),
  };
}

export function createTurnCorrelation(input: {
  conversation: JourneyConversation;
  runId: string;
  turnId: string;
  userMessageId: string;
  assistantMessageId: string;
}): TurnCorrelation {
  const identity = input.conversation.liveIdentity;
  return {
    schemaVersion: "0.1.0",
    journeyId: identity.journeyId,
    harnessConversationId: identity.harnessConversationId,
    piSessionId: identity.piSessionId,
    generation: identity.generation,
    turnId: input.turnId,
    runId: input.runId,
    harnessUserMessageId: input.userMessageId,
    harnessAssistantMessageId: input.assistantMessageId,
    ...(identity.mirrorConversationId ? { mirrorConversationId: identity.mirrorConversationId } : {}),
  };
}

export function stageCorrelatedTurn(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
  userMessage: ConversationMessage,
  assistantMessage: ConversationMessage,
): JourneyConversation {
  return {
    ...conversation,
    messages: [...conversation.messages, userMessage, assistantMessage],
    reconciliation: beginNautilusTurn(conversation.reconciliation, {
      turnId: correlation.turnId,
      runId: correlation.runId,
      startedAt: userMessage.createdAt,
    }),
  };
}

export function applyMirrorCommitEvent(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
  commit: MirrorCommitEvent,
  observedAt: string,
): JourneyConversation {
  if (commit.turnId !== correlation.turnId || commit.runId !== correlation.runId) {
    return {
      ...conversation,
      reconciliation: markTurnBodyFailed(
        conversation.reconciliation,
        correlation.turnId,
        "mirror",
        "commit_authority_mismatch",
        observedAt,
      ),
    };
  }

  let liveIdentity = conversation.liveIdentity;
  let reconciliation = conversation.reconciliation;
  if (commit.mirrorConversationId) {
    if (liveIdentity.mirrorConversationId && liveIdentity.mirrorConversationId !== commit.mirrorConversationId) {
      return {
        ...conversation,
        reconciliation: markTurnBodyFailed(
          reconciliation,
          correlation.turnId,
          "mirror",
          "mirror_conversation_mismatch",
          observedAt,
        ),
      };
    }
    if (!liveIdentity.mirrorConversationId) {
      liveIdentity = { ...liveIdentity, mirrorConversationId: commit.mirrorConversationId };
      reconciliation = bindMirrorConversation(reconciliation, commit.mirrorConversationId, observedAt);
    }
  }

  if (commit.phase === "user") {
    if (commit.piUserEntryId) {
      reconciliation = observePiUserEntry(reconciliation, correlation.turnId, commit.piUserEntryId, observedAt);
    }
    reconciliation = commit.status === "committed" && commit.mirrorMessageId
      ? observeMirrorUserCommit(reconciliation, correlation.turnId, commit.mirrorMessageId, observedAt)
      : markTurnBodyFailed(
          reconciliation,
          correlation.turnId,
          "mirror",
          boundedReason(commit.reasonCode, "mirror_user_commit_failed"),
          observedAt,
        );
    return { ...conversation, liveIdentity, reconciliation };
  }

  const pi = commit.piEvidence;
  if (
    pi?.userEntryId
    && pi.assistantEntryId
    && pi.leafEntryId
    && Number.isInteger(pi.entryCount)
    && pi.entryCount >= 0
  ) {
    reconciliation = observePiTurnCommit(reconciliation, correlation.turnId, {
      userEntryId: pi.userEntryId,
      assistantEntryId: pi.assistantEntryId,
      leafEntryId: pi.leafEntryId,
      entryCount: pi.entryCount,
      ...(pi.sessionFile ? { sessionFile: pi.sessionFile } : {}),
      committedAt: observedAt,
    });
  } else {
    reconciliation = markTurnBodyFailed(
      reconciliation,
      correlation.turnId,
      "pi",
      "pi_native_evidence_missing",
      observedAt,
    );
  }

  const turn = reconciliation.turns.find((item) => item.turnId === correlation.turnId);
  reconciliation = commit.status === "committed" && commit.mirrorMessageId && turn?.mirror.userMessageId
    ? observeMirrorTurnCommit(reconciliation, correlation.turnId, {
        userMessageId: turn.mirror.userMessageId,
        assistantMessageId: commit.mirrorMessageId,
        messageCount: commit.mirrorMessageCount ?? Math.max(
          reconciliation.checkpoints.mirror?.messageCount ?? 0,
          2,
        ),
        committedAt: observedAt,
      })
    : markTurnBodyFailed(
        reconciliation,
        correlation.turnId,
        "mirror",
        boundedReason(commit.reasonCode, "mirror_assistant_commit_failed"),
        observedAt,
      );
  return { ...conversation, liveIdentity, reconciliation };
}

export function applyMirrorTurnCommitStatus(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
  status: MirrorTurnCommitStatus,
  observedAt: string,
): JourneyConversation {
  if (!status.conversationId) return conversation;
  let liveIdentity = conversation.liveIdentity;
  let reconciliation = conversation.reconciliation;
  if (!liveIdentity.mirrorConversationId) {
    liveIdentity = { ...liveIdentity, mirrorConversationId: status.conversationId };
    reconciliation = bindMirrorConversation(reconciliation, status.conversationId, observedAt);
  }
  if (liveIdentity.mirrorConversationId !== status.conversationId) {
    return {
      ...conversation,
      reconciliation: markTurnBodyFailed(
        reconciliation, correlation.turnId, "mirror", "mirror_conversation_mismatch", observedAt,
      ),
    };
  }
  if (status.userMessageId) {
    reconciliation = observeMirrorUserCommit(
      reconciliation, correlation.turnId, status.userMessageId, observedAt,
    );
  }
  if (status.userMessageId && status.assistantMessageId) {
    reconciliation = observeMirrorTurnCommit(reconciliation, correlation.turnId, {
      userMessageId: status.userMessageId,
      assistantMessageId: status.assistantMessageId,
      messageCount: status.messageCount,
      committedAt: observedAt,
    });
  }
  return { ...conversation, liveIdentity, reconciliation };
}

export function commitHarnessTurn(
  conversation: JourneyConversation,
  correlation: TurnCorrelation,
  committedAt: string,
): JourneyConversation {
  const assistant = conversation.messages.find((message) => message.id === correlation.harnessAssistantMessageId);
  if (!assistant?.content.trim()) return conversation;
  return {
    ...conversation,
    reconciliation: observeHarnessTurnCommit(conversation.reconciliation, correlation.turnId, {
      userMessageId: correlation.harnessUserMessageId,
      assistantMessageId: correlation.harnessAssistantMessageId,
      messageCount: conversation.messages.length,
      committedAt,
    }),
  };
}

function boundedReason(value: string | undefined, fallback: string): string {
  return value && /^[a-z0-9_]{1,80}$/.test(value) ? value : fallback;
}
