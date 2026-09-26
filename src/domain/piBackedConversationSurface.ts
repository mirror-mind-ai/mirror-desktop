import type { ConversationMessage } from "../agent/piTaskPacket";
import { normalizePiResponse } from "../agent/piResponseNormalizer";
import type {
  JourneyConversation,
  ResponseModelAttribution,
  TerminalAgentActionProjection,
} from "./journeyConversation";
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

export type PiConversationSurfaceInspection = {
  schemaVersion: "0.1.0";
  entries: PiConversationSurfaceEntry[];
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
  const boundedThinking = boundReasoningBlocks(thinkingTexts);

  const projection: TerminalAgentActionProjection = {
    status: "completed",
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
  let pendingBlocks: PendingActivityBlock[] = [];
  for (const entry of inspection.entries) {
    if (!entry || typeof entry.entryId !== "string" || !entry.entryId
      || typeof entry.role !== "string" || typeof entry.visibleText !== "string"
      || typeof entry.timestamp !== "string" || nativeIds.has(entry.entryId)) {
      throw new Error("pi_surface_inspection_invalid");
    }
    nativeIds.add(entry.entryId);
    if (entry.role === "assistant") {
      pendingBlocks.push(...extractActivityBlocks(entry.nativeContent));
    } else if (entry.role === "user") {
      pendingBlocks = [];
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
        const reconstructed = reconstructAgentActionProjection(id, pendingBlocks, resultsByToolCallId);
        if (reconstructed) reconstructedAgentActions[id] = reconstructed;
      }
      pendingBlocks = [];
      // Only a complete pair is attribution; half of one would be a guess.
      if (entry.provider && entry.model) {
        responseModels[id] = { provider: entry.provider, model: entry.model };
      }
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

  return {
    ...metadata,
    messages,
    ...(Object.keys(reconstructedAgentActions).length > 0 ? { reconstructedAgentActions } : {}),
    ...(Object.keys(responseModels).length > 0 ? { responseModels } : {}),
  };
}

function bind(bindings: Map<string, MessageBinding>, entryId: string, binding: MessageBinding): void {
  const existing = bindings.get(entryId);
  if (existing && (existing.messageId !== binding.messageId || existing.role !== binding.role)) {
    throw new Error("pi_surface_metadata_conflict");
  }
  bindings.set(entryId, binding);
}
