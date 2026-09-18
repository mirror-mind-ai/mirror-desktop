import type { ConversationMessage } from "../agent/piTaskPacket";
import { normalizePiResponse } from "../agent/piResponseNormalizer";
import type { JourneyConversation } from "./journeyConversation";

export type PiConversationSurfaceEntry = {
  entryId: string;
  role: string;
  visibleText: string;
  timestamp: string;
};

export type PiConversationSurfaceInspection = {
  schemaVersion: "0.1.0";
  entries: PiConversationSurfaceEntry[];
};

type MessageBinding = { messageId: string; role: ConversationMessage["role"] };

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

  const projectedById = new Map(metadata.messages.map((message) => [message.id, message]));
  const nativeIds = new Set<string>();
  const messageIds = new Set<string>();
  const messages: ConversationMessage[] = [];
  for (const entry of inspection.entries) {
    if (!entry || typeof entry.entryId !== "string" || !entry.entryId
      || typeof entry.role !== "string" || typeof entry.visibleText !== "string"
      || typeof entry.timestamp !== "string" || nativeIds.has(entry.entryId)) {
      throw new Error("pi_surface_inspection_invalid");
    }
    nativeIds.add(entry.entryId);
    if ((entry.role !== "user" && entry.role !== "assistant") || !entry.visibleText.trim()) continue;

    const role = entry.role;
    const binding = bindings.get(entry.entryId);
    const compatibleBinding = binding?.role === role ? binding : undefined;
    const projected = compatibleBinding ? projectedById.get(compatibleBinding.messageId) : undefined;
    let id = compatibleBinding?.messageId ?? `pi-${entry.entryId}`;
    if (messageIds.has(id)) id = `pi-${entry.entryId}`;
    if (messageIds.has(id)) throw new Error("pi_surface_inspection_invalid");
    messageIds.add(id);

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

  return { ...metadata, messages };
}

function bind(bindings: Map<string, MessageBinding>, entryId: string, binding: MessageBinding): void {
  const existing = bindings.get(entryId);
  if (existing && (existing.messageId !== binding.messageId || existing.role !== binding.role)) {
    throw new Error("pi_surface_metadata_conflict");
  }
  bindings.set(entryId, binding);
}
