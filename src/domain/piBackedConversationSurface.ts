import type { ConversationMessage } from "../agent/piTaskPacket";
import { normalizePiResponse } from "../agent/piResponseNormalizer";
import type {
  ChapterDivider,
  JourneyConversation,
  ResponseModelAttribution,
  TerminalAgentActionProjection,
} from "./journeyConversation";
import type { CorrelatedConversationTurn } from "./conversationReconciliation";
import { chapterTitleFromSummary } from "./compactionChapters";
import { boundReasoningBlocks } from "./reasoningBounds";

export type PiConversationSurfaceEntry = {
  entryId: string;
  role: string;
  visibleText: string;
  timestamp: string;
  // Raw Pi entry content blocks; carried by the full transcript inspection and
  // used to reconstruct reasoning and tool-call ordering (CR077).
  nativeContent?: unknown;
  toolCallId?: string | null;
  isError?: boolean | null;
  // CR091: what produced the entry. Absent for user entries and for anything Pi left
  // unattributed.
  provider?: string | null;
  model?: string | null;
};

/** CR080: one per compaction on the active branch, in order. */
export type PiChapterClosure = {
  firstKeptEntryId: string;
  // Nullable because the native inspection writes null where Pi recorded nothing.
  summaryHead?: string | null;
  closedAt?: string | null;
};

export type PiConversationSurfaceInspection = {
  schemaVersion: "0.1.0";
  entries: PiConversationSurfaceEntry[];
  chapterClosures?: PiChapterClosure[];
};

type MessageBinding = { messageId: string; role: ConversationMessage["role"] };

type PendingActivityBlock =
  | { kind: "thinking"; text: string }
  | { kind: "toolCall"; id: string; name: string; arguments?: unknown };

function extractActivityBlocks(nativeContent: unknown): PendingActivityBlock[] {
  if (!Array.isArray(nativeContent)) return [];
  const blocks: PendingActivityBlock[] = [];
  for (const block of nativeContent) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record.type === "thinking" && typeof record.thinking === "string" && record.thinking.trim()) {
      blocks.push({ kind: "thinking", text: record.thinking });
      continue;
    }
    if (record.type === "toolCall" && typeof record.id === "string" && record.id
      && typeof record.name === "string" && record.name) {
      blocks.push({
        kind: "toolCall",
        id: record.id,
        name: record.name,
        ...(record.arguments !== undefined ? { arguments: record.arguments } : {}),
      });
    }
  }
  return blocks;
}

function reconstructAgentActionProjection(
  messageId: string,
  blocks: PendingActivityBlock[],
  resultsByToolCallId: ReadonlyMap<string, boolean>,
): TerminalAgentActionProjection | undefined {
  const thinkingTexts = blocks.filter((block) => block.kind === "thinking").map((block) => block.text);
  if (thinkingTexts.length === 0) return undefined;
  return buildAgentActionProjection(messageId, blocks, resultsByToolCallId, "completed");
}

function buildAgentActionProjection(
  messageId: string,
  blocks: PendingActivityBlock[],
  resultsByToolCallId: ReadonlyMap<string, boolean>,
  status: TerminalAgentActionProjection["status"],
): TerminalAgentActionProjection {
  const thinkingTexts = blocks.filter((block) => block.kind === "thinking").map((block) => block.text);
  const boundedThinking = boundReasoningBlocks(thinkingTexts);

  const projection: TerminalAgentActionProjection = {
    status,
    operations: [],
    reasoningSummaries: [],
    activityOrder: [],
  };
  let thinkingIndex = 0;
  for (const block of blocks) {
    if (block.kind === "thinking") {
      const bounded = boundedThinking[thinkingIndex];
      thinkingIndex += 1;
      const id = `${messageId}:thinking:${thinkingIndex}`;
      projection.reasoningSummaries.push({
        id,
        content: bounded.content,
        status: "completed",
        ...(bounded.truncated ? { truncated: true as const } : {}),
        ...(bounded.elided ? { elided: true as const } : {}),
      });
      projection.activityOrder.push({ type: "reasoning_summary", id });
      continue;
    }
    const result = resultsByToolCallId.get(block.id);
    projection.operations.push({
      id: block.id,
      name: block.name,
      status: result === undefined ? "interrupted" : result ? "failed" : "completed",
      ...(block.arguments !== undefined ? { arguments: block.arguments } : {}),
      ...(result === true ? { isError: true } : {}),
    });
    projection.activityOrder.push({ type: "operation", id: block.id });
  }
  return projection;
}

// CR089: a run the Navigator cancelled leaves real operations in Pi but never produces the
// assistant text that normally anchors them, so the surface used to discard the whole record of
// what the agent did. The turn record already says the run ended without an answer; pairing it
// with the Pi entries restores the history without inventing anything.
// The run opened somewhere between the entry that preceded it and its own request. A turn record
// only describes this run if it started inside that window, so records belonging to other runs are
// never borrowed.
function selectInterruptedTurn(
  turns: readonly CorrelatedConversationTurn[],
  consumedTurnIds: Set<string>,
  after: string | undefined,
  until: string,
): CorrelatedConversationTurn | undefined {
  for (const turn of turns) {
    if (consumedTurnIds.has(turn.turnId)) continue;
    if (turn.pi?.state !== "failed" || !turn.startedAt) continue;
    if (turn.startedAt > until) continue;
    if (after !== undefined && turn.startedAt <= after) continue;
    return turn;
  }
  return undefined;
}

/**
 * CR089: which interrupted turn each request belongs to, resolved before anything is projected.
 * The identity of a cancelled request has to be known when its message is built, and that happens
 * before the run it opened has finished being read.
 */
function matchInterruptedTurnsByUserEntryId(
  entries: readonly PiConversationSurfaceEntry[],
  turns: readonly CorrelatedConversationTurn[],
): Map<string, CorrelatedConversationTurn> {
  const matched = new Map<string, CorrelatedConversationTurn>();
  const consumed = new Set<string>();
  let userEntryId: string | undefined;
  let after: string | undefined;
  let until: string | undefined;
  let closedWithAnswer = false;
  let previousTimestamp: string | undefined;

  const close = () => {
    if (!userEntryId || !until || closedWithAnswer) return;
    const turn = selectInterruptedTurn(turns, consumed, after, until);
    if (!turn) return;
    consumed.add(turn.turnId);
    matched.set(userEntryId, turn);
  };

  for (const entry of entries) {
    if (!entry || typeof entry.role !== "string" || typeof entry.timestamp !== "string") continue;
    if (entry.role === "user") {
      close();
      userEntryId = entry.entryId;
      after = previousTimestamp;
      until = entry.timestamp;
      closedWithAnswer = false;
    } else if (entry.role === "assistant") {
      const blocks = extractActivityBlocks(entry.nativeContent);
      closedWithAnswer = Boolean(entry.visibleText?.trim())
        && !blocks.some((block) => block.kind === "toolCall");
    } else if (entry.role === "toolResult") {
      closedWithAnswer = false;
    }
    // Session bookkeeping sits between a run's start and its request, so it must not narrow the
    // window used to recognise which turn the run was.
    if (entry.role !== "system") previousTimestamp = entry.timestamp;
  }
  close();

  return matched;
}

function interruptedStatusOf(turn: CorrelatedConversationTurn): TerminalAgentActionProjection["status"] {
  return turn.pi?.failureCode?.includes("cancelled") ? "cancelled" : "failed";
}

export function projectPiBackedConversationSurface(
  metadata: JourneyConversation,
  inspection: PiConversationSurfaceInspection,
): JourneyConversation {
  if (inspection.schemaVersion !== "0.1.0" || !Array.isArray(inspection.entries)) {
    throw new Error("pi_surface_inspection_invalid");
  }

  const bindings = new Map<string, MessageBinding>();
  for (const turn of metadata.reconciliation.turns) {
    if (turn.pi.userEntryId && turn.harness.userMessageId) {
      bind(bindings, turn.pi.userEntryId, { messageId: turn.harness.userMessageId, role: "user" });
    }
    if (turn.pi.assistantEntryId && turn.harness.assistantMessageId) {
      bind(bindings, turn.pi.assistantEntryId, { messageId: turn.harness.assistantMessageId, role: "assistant" });
    }
  }

  // CR089: an interrupted turn has no Pi execution evidence, so it never recorded which entry was
  // its request and its identity was lost on every reconstruction. The turn record still names the
  // request, which is what links it back to its own steering and turn evidence.
  const interruptedTurnByUserEntryId = matchInterruptedTurnsByUserEntryId(
    inspection.entries,
    metadata.reconciliation.turns,
  );
  for (const [entryId, turn] of interruptedTurnByUserEntryId) {
    if (turn.harness.userMessageId) {
      bind(bindings, entryId, { messageId: turn.harness.userMessageId, role: "user" });
    }
  }
  // The assistant side is deliberately left unbound: the harness models one answer per turn while
  // Pi recorded several messages, so there is no honest one-to-one identity to restore.

  const resultsByToolCallId = new Map<string, boolean>();
  for (const entry of inspection.entries) {
    if (entry && entry.role === "toolResult" && typeof entry.toolCallId === "string" && entry.toolCallId) {
      resultsByToolCallId.set(entry.toolCallId, entry.isError === true);
    }
  }

  const projectedById = new Map(metadata.messages.map((message) => [message.id, message]));
  const nativeIds = new Set<string>();
  const messageIds = new Set<string>();
  const messages: ConversationMessage[] = [];
  const reconstructedAgentActions: Record<string, TerminalAgentActionProjection> = {};
  const responseModels: Record<string, ResponseModelAttribution> = {};
  // A chapter opens at the first entry Pi retained. If that entry projects to nothing
  // visible, the divider waits for the next message that does, so the moment is never lost.
  const closuresByRetainedEntryId = new Map(
    (inspection.chapterClosures ?? []).map((closure) => [closure.firstKeptEntryId, closure]),
  );
  const chapterDividers: Record<string, ChapterDivider> = {};
  let pendingDivider: ChapterDivider | undefined;
  let pendingBlocks: PendingActivityBlock[] = [];
  // CR089: where the orphan work started, so an interrupted run can be anchored to its own entry.
  let pendingAnchor: { entryId: string; timestamp: string } | undefined;
  // CR089: whether a run is interrupted is a fact about the run, not about one entry, so the
  // decision is resolved per request rather than per entry.
  let runMessageBlocks: Array<{ id: string; blocks: PendingActivityBlock[] }> = [];
  let runUntil: string | undefined;
  const interruptedAssistantMessageIds = new Set<string>();
  const interruptedFragments: Record<string, string> = {};
  let runUserEntryId: string | undefined;
  const closeRun = () => {
    const turn = runUserEntryId ? interruptedTurnByUserEntryId.get(runUserEntryId) : undefined;
    const fragment = turn?.harness.assistantMessageId
      ? metadata.terminalAgentActionEvidence?.[turn.harness.assistantMessageId]?.interruptedFragment
      : undefined;

    for (const { id, blocks } of runMessageBlocks) {
      if (!turn) {
        const reconstructed = reconstructAgentActionProjection(id, blocks, resultsByToolCallId);
        if (reconstructed) reconstructedAgentActions[id] = reconstructed;
        continue;
      }
      interruptedAssistantMessageIds.add(id);
      // An interrupted run is audit material, so its operations are kept even when the provider
      // exposed no reasoning to go with them.
      const projection = buildAgentActionProjection(id, blocks, resultsByToolCallId, interruptedStatusOf(turn));
      if (projection.operations.length > 0 || projection.reasoningSummaries.length > 0) {
        reconstructedAgentActions[id] = projection;
      }
    }

    // An interrupted run needs an anchor of its own when work or prose outlived its last committed
    // message. The anchor carries no words; it only gives that evidence somewhere to live.
    const anchorsTrailingWork = Boolean(pendingAnchor) && pendingBlocks.length > 0;
    if (turn && (anchorsTrailingWork || fragment)) {
      const id = anchorsTrailingWork && pendingAnchor
        ? `pi-${pendingAnchor.entryId}`
        : `pi-interrupted-${runUserEntryId ?? turn.turnId}`;
      if (!messageIds.has(id)) {
        messageIds.add(id);
        if (anchorsTrailingWork) {
          reconstructedAgentActions[id] = buildAgentActionProjection(
            id,
            pendingBlocks,
            resultsByToolCallId,
            interruptedStatusOf(turn),
          );
        }
        if (fragment) interruptedFragments[id] = fragment;
        if (pendingDivider) {
          chapterDividers[id] = pendingDivider;
          pendingDivider = undefined;
        }
        messages.push({
          id,
          role: "assistant",
          content: "",
          createdAt: pendingAnchor?.timestamp ?? runUntil ?? metadata.createdAt,
        });
      }
    }

    runUserEntryId = undefined;
    runMessageBlocks = [];
    pendingBlocks = [];
    pendingAnchor = undefined;
  };
  for (const entry of inspection.entries) {
    if (!entry || typeof entry.entryId !== "string" || !entry.entryId
      || typeof entry.role !== "string" || typeof entry.visibleText !== "string"
      || typeof entry.timestamp !== "string" || nativeIds.has(entry.entryId)) {
      throw new Error("pi_surface_inspection_invalid");
    }
    nativeIds.add(entry.entryId);
    const closure = closuresByRetainedEntryId.get(entry.entryId);
    if (closure) {
      pendingDivider = {
        title: chapterTitleFromSummary(closure.summaryHead ?? ""),
        ...(closure.closedAt ? { closedAt: closure.closedAt } : {}),
      };
    }
    if (entry.role === "assistant") {
      const blocks = extractActivityBlocks(entry.nativeContent);
      if (blocks.length > 0 && !pendingAnchor) {
        pendingAnchor = { entryId: entry.entryId, timestamp: entry.timestamp };
      }
      pendingBlocks.push(...blocks);
    } else if (entry.role === "user") {
      // The request that follows closes whatever the agent was doing before it.
      closeRun();
      runUntil = entry.timestamp;
      runUserEntryId = entry.entryId;
    }
    if ((entry.role !== "user" && entry.role !== "assistant") || !entry.visibleText.trim()) continue;

    const role = entry.role;
    const binding = bindings.get(entry.entryId);
    const compatibleBinding = binding?.role === role ? binding : undefined;
    const projected = compatibleBinding ? projectedById.get(compatibleBinding.messageId) : undefined;
    let id = compatibleBinding?.messageId ?? `pi-${entry.entryId}`;
    if (messageIds.has(id)) id = `pi-${entry.entryId}`;
    if (messageIds.has(id)) throw new Error("pi_surface_inspection_invalid");
    messageIds.add(id);

    if (role === "assistant") {
      // Live-captured terminal evidence is authoritative and richer than a
      // session reconstruction; only messages without it are reconstructed.
      if (!metadata.terminalAgentActionEvidence?.[id]) {
        runMessageBlocks.push({ id, blocks: pendingBlocks });
      }
      pendingBlocks = [];
      pendingAnchor = undefined;
      // Only a complete pair is attribution; half of one would be a guess.
      if (entry.provider && entry.model) {
        responseModels[id] = { provider: entry.provider, model: entry.model };
      }
    }

    if (pendingDivider) {
      chapterDividers[id] = pendingDivider;
      pendingDivider = undefined;
    }

    messages.push({
      id,
      role,
      content: role === "assistant"
        ? normalizePiResponse(entry.visibleText).assistantMessage
        : entry.visibleText,
      createdAt: entry.timestamp || projected?.createdAt || metadata.createdAt,
      ...(role === "user" && projected?.role === "user" && projected.attachments?.length
        ? { attachments: projected.attachments }
        : {}),
    });
  }

  // A run interrupted at the very end of the session has no following request to close it.
  closeRun();

  return {
    ...metadata,
    messages,
    ...(() => {
      const roles = projectAgentCommentRoles(messages);
      // An interrupted run produced no answer, so none of its comments may be presented as one.
      for (const message of messages) {
        if (interruptedAssistantMessageIds.has(message.id) && message.content.trim()) {
          roles[message.id] = "trail";
        }
      }
      return Object.keys(roles).length > 0 ? { agentCommentRoles: roles } : {};
    })(),
    ...(Object.keys(interruptedFragments).length > 0 ? { interruptedFragments } : {}),
    ...(Object.keys(reconstructedAgentActions).length > 0 ? { reconstructedAgentActions } : {}),
    ...(Object.keys(responseModels).length > 0 ? { responseModels } : {}),
    ...(Object.keys(chapterDividers).length > 0 ? { chapterDividers } : {}),
  };
}

// CR083: a turn's last agent comment is the one that answered; everything the agent said before it,
// while more work was still coming, was a note. The rule is structural, so no text is interpreted.
function projectAgentCommentRoles(
  messages: readonly { id: string; role: string }[],
): Record<string, "trail"> {
  const roles: Record<string, "trail"> = {};
  let run: string[] = [];
  const closeRun = () => {
    for (const id of run.slice(0, -1)) roles[id] = "trail";
    run = [];
  };
  for (const message of messages) {
    if (message.role === "assistant") run.push(message.id);
    else closeRun();
  }
  closeRun();
  return roles;
}

function bind(bindings: Map<string, MessageBinding>, entryId: string, binding: MessageBinding): void {
  const existing = bindings.get(entryId);
  if (existing && (existing.messageId !== binding.messageId || existing.role !== binding.role)) {
    throw new Error("pi_surface_metadata_conflict");
  }
  bindings.set(entryId, binding);
}
