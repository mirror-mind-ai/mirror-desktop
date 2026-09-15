import { invoke } from "@tauri-apps/api/core";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import { parseConversationCatalog } from "../domain/conversationSpaces";

export async function loadMirrorConversationCatalog(input: {
  journeyId: string;
  rootThreadId: string;
  managedMirrorConversationIds: readonly string[];
  limit?: number;
}): Promise<ConversationCatalogEntry[]> {
  const payload = await invoke<unknown>("load_mirror_conversation_catalog", {
    journeyId: input.journeyId,
    limit: input.limit ?? 30,
  });
  const record = payload as Record<string, unknown> | undefined;
  const parsed = parseConversationCatalog({
    schemaVersion: record?.schemaVersion,
    journeyId: record?.journeyId,
    entries: record?.entries,
  }, { journeyId: input.journeyId, rootThreadId: input.rootThreadId });
  if (!parsed) throw new Error("Mirror returned an invalid conversation catalog.");
  const managed = new Set(input.managedMirrorConversationIds);
  return parsed.entries.filter((entry) => entry.kind !== "mirror_history" || !managed.has(entry.conversationId));
}

export async function renameMirrorConversation(input: {
  journeyId: string;
  conversationId: string;
  title: string;
}): Promise<{ conversationId: string; title: string }> {
  const payload = await invoke<unknown>("rename_mirror_conversation", input);
  const record = payload as Record<string, unknown> | undefined;
  if (record?.status !== "ok" || record.journeyId !== input.journeyId
    || record.conversationId !== input.conversationId || typeof record.title !== "string") {
    throw new Error("Mirror returned invalid title authority.");
  }
  return { conversationId: record.conversationId, title: record.title };
}
