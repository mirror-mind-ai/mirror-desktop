import { invoke } from "@tauri-apps/api/core";
import { parseConversationCatalog, type ConversationCatalogEntry } from "../domain/conversationSpaces";

const NATIVE_ROOT_SENTINEL = "journey-root-thread-authority";

export async function loadDesktopConversationCatalog(journeyId: string): Promise<ConversationCatalogEntry[]> {
  const payload = await invoke<unknown>("load_desktop_conversation_catalog", { journeyId });
  const parsed = parseNativeCatalog(payload, journeyId);
  if (!parsed) throw new Error("Desktop Conversation Journey authority is invalid.");
  return parsed;
}

export async function createDesktopConversation(input: {
  journeyId: string;
  journeyName: string;
  title?: string;
  sourceConversationId?: string;
  sourceMessageLimit?: number;
}): Promise<Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>> {
  const payload = await invoke<unknown>("create_desktop_conversation", {
    journeyId: input.journeyId,
    journeyName: input.journeyName,
    title: input.title ?? "New conversation",
    sourceConversationId: input.sourceConversationId ?? null,
    sourceMessageLimit: input.sourceMessageLimit ?? null,
  });
  const parsed = parseNativeCatalog({
    schemaVersion: "1.0.0",
    journeyId: (payload as Record<string, unknown> | undefined)?.journeyId,
    entries: [payload],
  }, input.journeyId);
  const entry = parsed?.[0];
  if (!entry || entry.kind !== "desktop_conversation") {
    throw new Error("Desktop Conversation Journey authority is invalid.");
  }
  return entry;
}

function parseNativeCatalog(payload: unknown, journeyId: string): ConversationCatalogEntry[] | undefined {
  const parsed = parseConversationCatalog(payload, { journeyId, rootThreadId: NATIVE_ROOT_SENTINEL });
  if (!parsed || parsed.entries.some((entry) => entry.kind !== "desktop_conversation")) return undefined;
  return parsed.entries;
}
