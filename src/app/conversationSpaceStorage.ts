import { invoke } from "@tauri-apps/api/core";
import { parseConversationCatalog, type ConversationCatalogEntry } from "../domain/conversationSpaces";
import type { AgentProviderConfig } from "../agent/providerConfig";

const NATIVE_ROOT_SENTINEL = "journey-root-thread-authority";

export async function loadDesktopConversationCatalog(journeyId: string): Promise<ConversationCatalogEntry[]> {
  const payload = await invoke<unknown>("load_desktop_conversation_catalog", { journeyId });
  const parsed = parseNativeCatalog(payload, journeyId);
  if (!parsed) throw new Error("Desktop Conversation Journey authority is invalid.");
  return parsed;
}

export async function deleteDesktopConversation(input: {
  journeyId: string;
  conversationId: string;
}): Promise<void> {
  await invoke<void>("delete_desktop_conversation", input);
}

export async function suggestDesktopConversationTitle(input: {
  journeyId: string;
  conversationId: string;
  excerpts: string[];
  config: AgentProviderConfig;
}): Promise<string> {
  return invoke<string>("suggest_desktop_conversation_title", input);
}

export async function renameDesktopConversation(input: {
  journeyId: string;
  conversationId: string;
  title: string;
}): Promise<Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>> {
  const payload = await invoke<unknown>("rename_desktop_conversation", input);
  const parsed = parseNativeCatalog({ schemaVersion: "1.0.0", journeyId: input.journeyId, entries: [payload] }, input.journeyId);
  const entry = parsed?.[0];
  if (!entry || entry.kind !== "desktop_conversation" || entry.conversationId !== input.conversationId) {
    throw new Error("Renamed Desktop Conversation authority is invalid.");
  }
  return entry;
}

export async function restartDesktopConversation(input: {
  journeyId: string;
  conversationId: string;
}): Promise<Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>> {
  const payload = await invoke<unknown>("restart_desktop_conversation", input);
  const parsed = parseNativeCatalog({
    schemaVersion: "1.0.0",
    journeyId: (payload as Record<string, unknown> | undefined)?.journeyId,
    entries: [payload],
  }, input.journeyId);
  const entry = parsed?.[0];
  if (!entry || entry.kind !== "desktop_conversation" || entry.conversationId !== input.conversationId) {
    throw new Error("Reset Desktop Conversation Journey authority is invalid.");
  }
  return entry;
}

export async function reconcileDesktopConversationCatalogEntry(input: {
  journeyId: string;
  threadId: string;
  generation: number;
  updatedAt: string;
  messageCount: number;
}): Promise<Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>> {
  const payload = await invoke<unknown>("reconcile_desktop_conversation_catalog_entry", input);
  const parsed = parseNativeCatalog({ schemaVersion: "1.0.0", journeyId: input.journeyId, entries: [payload] }, input.journeyId);
  const entry = parsed?.[0];
  if (!entry || entry.kind !== "desktop_conversation" || entry.threadId !== input.threadId
    || entry.authority.activeGeneration !== input.generation) {
    throw new Error("Desktop Conversation catalog reconciliation authority is invalid.");
  }
  return entry;
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
    title: input.title ?? "New Conversation #1",
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
