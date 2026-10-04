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
  // CR118: an anchor the ledger cannot resolve is a cut, wherever it sits. The earlier rule only
  // skipped *leading* unresolvable Segments, which covered a manifest older than the turns the
  // ledger starts with. Prefix truncation of the durable ledger leaves unresolvable anchors in the
  // middle instead, and those threw — deterministically, on every settlement of the Journey. What
  // the ledger cannot see is left as already published rather than republished from nothing, so the
  // cut omits those Segments instead of returning them empty over the files holding their history.
  const anchors = manifest.segments.map((segment) => (segment.firstTurnId === undefined
    ? undefined
    : turns.findIndex((turn) => turn.turnId === segment.firstTurnId)));
  const lastUnresolvable = anchors.reduce<number>(
    (last, anchor, index) => (anchor === -1 ? index : last),
    -1,
  );
  // The current Segment is always returned. Cutting it away would leave the caller with an empty
  // bundle, which fails publication — the same settlement break under a different message.
  const cut = Math.max(0, Math.min(lastUnresolvable + 1, manifest.segments.length - 1));
  // Resolved from the right, so a Segment with no anchor of its own inherits the next Segment's
  // start and yields an empty range. Mapping it to 0 made `starts` non-monotonic between two
  // anchored Segments and threw for a condition that is merely an empty chapter.
  const starts: number[] = [];
  for (let index = manifest.segments.length - 1; index >= cut; index -= 1) {
    const anchor = anchors[index];
    starts[index] = anchor === undefined || anchor < 0 ? (starts[index + 1] ?? turns.length) : anchor;
  }
  const availableStarts = starts.slice(cut);
  if (!availableStarts.length
    || availableStarts.some((start, index, available) => index > 0 && start < available[index - 1]!)) {
    throw new Error("Conversation Segment turn range is invalid.");
  }
  const availableSegments = manifest.segments.slice(cut);
  return availableSegments.map((segment, index) => {
    const selectedTurns = turns.slice(availableStarts[index], availableStarts[index + 1] ?? turns.length);
    const messageIds = new Set(selectedTurns.flatMap((turn) => [turn.harness.userMessageId, turn.harness.assistantMessageId]
      .filter((id): id is string => Boolean(id))));
    const runIds = new Set(selectedTurns.flatMap((turn) => turn.runId ? [turn.runId] : []));
    const selectedMessages = conversation.messages.filter((message) => messageIds.has(message.id));
    const terminalAgentActionEvidence = Object.fromEntries(Object.entries(conversation.terminalAgentActionEvidence ?? {})
      .filter(([messageId, evidence]) => messageIds.has(messageId) && runIds.has(evidence.runId)));
    const steeringEvidence = conversation.steeringEvidence?.filter((evidence) => runIds.has(evidence.runId));
    // CR114: a Segment describes its own Segment. These maps are keyed by message, so spreading the
    // source Conversation copied the whole generation into every file — one production Segment held
    // 16 messages in 5.86 MB. Scoping them keeps a Segment's size proportional to its own messages
    // even when the caller hands over a fully projected surface.
    const selectedMessageIds = new Set(selectedMessages.map((message) => message.id));
    const ownedByMessage = <T>(map: Record<string, T> | undefined): Record<string, T> | undefined => {
      if (!map) return undefined;
      const scoped = Object.fromEntries(Object.entries(map).filter(([messageId]) => selectedMessageIds.has(messageId)));
      return Object.keys(scoped).length ? scoped : undefined;
    };
    return {
      segmentId: segment.segmentId,
      status: segment.status,
      conversation: {
        ...conversation,
        messages: selectedMessages,
        reconciliation: { ...conversation.reconciliation, turns: selectedTurns },
        ...(Object.keys(terminalAgentActionEvidence).length ? { terminalAgentActionEvidence } : { terminalAgentActionEvidence: undefined }),
        ...(steeringEvidence?.length ? { steeringEvidence } : { steeringEvidence: undefined }),
        reconstructedAgentActions: ownedByMessage(conversation.reconstructedAgentActions),
        responseModels: ownedByMessage(conversation.responseModels),
        agentCommentRoles: ownedByMessage(conversation.agentCommentRoles),
        interruptedFragments: ownedByMessage(conversation.interruptedFragments),
        chapterDividers: ownedByMessage(conversation.chapterDividers),
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
  const messages = requireUniqueBy(
    projections.flatMap((projection) => projection.conversation.messages),
    (message) => message.id,
    "message",
  );
  const turns = requireUniqueBy(
    projections.flatMap((projection) => projection.conversation.reconciliation.turns),
    (turn) => turn.turnId,
    "turn",
  );
  const evidenceEntries = projections.flatMap((projection) =>
    Object.entries(projection.conversation.terminalAgentActionEvidence ?? {}));
  const evidence = Object.fromEntries(requireUniqueBy(evidenceEntries, ([messageId]) => messageId, "terminal evidence"));
  const steering = requireUniqueBy(
    projections.flatMap((projection) => projection.conversation.steeringEvidence ?? []),
    (item) => item.requestId,
    "Steering evidence",
  );
  return {
    ...current,
    messages,
    reconciliation: { ...current.reconciliation, turns },
    ...(Object.keys(evidence).length ? { terminalAgentActionEvidence: evidence } : { terminalAgentActionEvidence: undefined }),
    ...(steering.length ? { steeringEvidence: steering } : { steeringEvidence: undefined }),
  };
}

function requireUniqueBy<T>(items: readonly T[], key: (item: T) => string, kind: string): T[] {
  const seen = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) {
      throw new Error(`Conversation Segment projection has duplicate ${kind} authority.`);
    }
    seen.add(value);
  }
  return [...items];
}
