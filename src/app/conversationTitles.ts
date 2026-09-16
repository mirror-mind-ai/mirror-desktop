import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

export const MAX_CONVERSATION_TITLE_CHARS = 160;

export function normalizeConversationTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function conversationTitleKey(value: string): string {
  return normalizeConversationTitle(value).toLocaleLowerCase();
}

export function conversationTitleExists(
  entries: readonly ConversationCatalogEntry[],
  title: string,
  excluding?: { kind: ConversationCatalogEntry["kind"]; conversationId: string },
): boolean {
  const key = conversationTitleKey(title);
  return entries.some((entry) => (
    !(excluding && entry.kind === excluding.kind && entry.conversationId === excluding.conversationId)
    && conversationTitleKey(entry.title) === key
  ));
}

export function nextDesktopConversationTitle(entries: readonly ConversationCatalogEntry[]): string {
  const keys = new Set(entries.map((entry) => conversationTitleKey(entry.title)));
  for (let number = 1; number <= entries.length + 1; number += 1) {
    const title = `New Conversation #${number}`;
    if (!keys.has(conversationTitleKey(title))) return title;
  }
  throw new Error("A unique Conversation title is unavailable.");
}

export function validateConversationTitle(
  entries: readonly ConversationCatalogEntry[],
  value: string,
  excluding?: { kind: ConversationCatalogEntry["kind"]; conversationId: string },
): string | undefined {
  const title = normalizeConversationTitle(value);
  if (!title) return "Enter a Conversation title.";
  if ([...title].length > MAX_CONVERSATION_TITLE_CHARS) return "Conversation titles can contain at most 160 characters.";
  if (conversationTitleExists(entries, title, excluding)) return "Another Conversation already uses this title.";
  return undefined;
}
