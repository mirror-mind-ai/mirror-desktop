import type { JourneyConversation } from "./journeyConversation";
import type { ConversationSegmentManifest } from "./conversationSegments";

export type ConversationSegmentProjection = {
  segmentId: string;
  status: "closed" | "current";
  conversation: JourneyConversation;
};

export function partitionConversationBySegments(
  conversation: JourneyConversation,
  manifest: ConversationSegmentManifest,
): ConversationSegmentProjection[] {
  if (conversation.journeyId !== manifest.journeyId
    || conversation.liveIdentity.harnessConversationId !== manifest.threadId
    || conversation.liveIdentity.generation !== manifest.generation
    || conversation.liveIdentity.piSessionId !== manifest.piSessionId) {
    throw new Error("Conversation Segment projection authority mismatch.");
  }
  const turns = conversation.reconciliation.turns;
  const starts = manifest.segments.map((segment) => segment.firstTurnId === undefined
    ? (segment.status === "current" ? turns.length : 0)
    : turns.findIndex((turn) => turn.turnId === segment.firstTurnId));
  const firstAvailable = starts.findIndex((start) => start >= 0);
  if (firstAvailable < 0 || starts.slice(firstAvailable).some((start) => start < 0)
    || starts.slice(firstAvailable).some((start, index, available) => index > 0 && start < available[index - 1])) {
    throw new Error("Conversation Segment turn range is invalid.");
  }
  const availableSegments = manifest.segments.slice(firstAvailable);
  const availableStarts = starts.slice(firstAvailable);
  return availableSegments.map((segment, index) => {
    const selectedTurns = turns.slice(availableStarts[index], availableStarts[index + 1] ?? turns.length);
    const messageIds = new Set(selectedTurns.flatMap((turn) => [turn.harness.userMessageId, turn.harness.assistantMessageId]
      .filter((id): id is string => Boolean(id))));
    const runIds = new Set(selectedTurns.flatMap((turn) => turn.runId ? [turn.runId] : []));
    const selectedMessages = conversation.messages.filter((message) => messageIds.has(message.id));
    const terminalAgentActionEvidence = Object.fromEntries(Object.entries(conversation.terminalAgentActionEvidence ?? {})
      .filter(([messageId, evidence]) => messageIds.has(messageId) && runIds.has(evidence.runId)));
    const steeringEvidence = conversation.steeringEvidence?.filter((evidence) => runIds.has(evidence.runId));
    return {
      segmentId: segment.segmentId,
      status: segment.status,
      conversation: {
        ...conversation,
        messages: selectedMessages,
        reconciliation: { ...conversation.reconciliation, turns: selectedTurns },
        ...(Object.keys(terminalAgentActionEvidence).length ? { terminalAgentActionEvidence } : { terminalAgentActionEvidence: undefined }),
        ...(steeringEvidence?.length ? { steeringEvidence } : { steeringEvidence: undefined }),
      },
    };
  });
}

export function combineConversationSegmentProjections(
  projections: readonly ConversationSegmentProjection[],
): JourneyConversation {
  if (!projections.length || projections[projections.length - 1]?.status !== "current"
    || projections.some((projection, index) => projection.segmentId !== `segment-${index + 1}`)) {
    throw new Error("Conversation Segment projection sequence is invalid.");
  }
  const current = projections[projections.length - 1]!.conversation;
  if (projections.some(({ conversation }) => conversation.journeyId !== current.journeyId
    || conversation.id !== current.id
    || conversation.liveIdentity.harnessConversationId !== current.liveIdentity.harnessConversationId
    || conversation.liveIdentity.generation !== current.liveIdentity.generation
    || conversation.liveIdentity.piSessionId !== current.liveIdentity.piSessionId)) {
    throw new Error("Conversation Segment projection authority mismatch.");
  }
  const messages = uniqueBy(projections.flatMap((projection) => projection.conversation.messages), (message) => message.id);
  const turns = uniqueBy(projections.flatMap((projection) => projection.conversation.reconciliation.turns), (turn) => turn.turnId);
  const evidence = Object.assign({}, ...projections.map((projection) => projection.conversation.terminalAgentActionEvidence ?? {}));
  const steering = uniqueBy(projections.flatMap((projection) => projection.conversation.steeringEvidence ?? []), (item) => item.requestId);
  return {
    ...current,
    messages,
    reconciliation: { ...current.reconciliation, turns },
    ...(Object.keys(evidence).length ? { terminalAgentActionEvidence: evidence } : { terminalAgentActionEvidence: undefined }),
    ...(steering.length ? { steeringEvidence: steering } : { steeringEvidence: undefined }),
  };
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
