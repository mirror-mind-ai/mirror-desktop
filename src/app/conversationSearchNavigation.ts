import type { ConversationMessage } from "../agent/piTaskPacket";

export type ConversationSearchMatch = {
  messageId: string;
  messageRole: ConversationMessage["role"];
  matchOrdinal: number;
  start: number;
  end: number;
};

export type ConversationTurnNavigationItem = {
  messageId: string;
  ordinal: number;
  snippet: string;
};

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeSearchContent(value: string): string {
  return value.toLocaleLowerCase();
}

export function findConversationSearchMatches(
  messages: readonly ConversationMessage[],
  query: string,
): ConversationSearchMatch[] {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const matches: ConversationSearchMatch[] = [];
  for (const message of messages) {
    const searchableContent = normalizeSearchContent(message.content);
    let cursor = 0;
    while (cursor < searchableContent.length) {
      const start = searchableContent.indexOf(normalizedQuery, cursor);
      if (start === -1) {
        break;
      }
      matches.push({
        messageId: message.id,
        messageRole: message.role,
        matchOrdinal: matches.length + 1,
        start,
        end: start + normalizedQuery.length,
      });
      cursor = start + Math.max(normalizedQuery.length, 1);
    }
  }
  return matches;
}

function conversationTurnSnippet(content: string, maxLength = 160): string {
  const plainText = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) return "Empty message";
  return plainText.length > maxLength ? `${plainText.slice(0, maxLength - 1).trimEnd()}…` : plainText;
}

export function createConversationTurnNavigationItems(
  messages: readonly ConversationMessage[],
): ConversationTurnNavigationItem[] {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.map((message, index) => ({
    messageId: message.id,
    ordinal: index + 1,
    snippet: conversationTurnSnippet(message.content),
  })).reverse();
}

export function clampConversationNavigationIndex(nextIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  if (nextIndex < 0) {
    return total - 1;
  }
  if (nextIndex >= total) {
    return 0;
  }
  return nextIndex;
}
