import type { ConversationMessage } from "../agent/piTaskPacket";

export type MessageSpeaker = {
  label: string;
  avatar: string;
  kind: "user" | "agent" | "persona";
};

const personaSignaturePattern = /^(?:\s|[│|╭╮╰╯─━═┌┐└┘╔╗╚╝╠╣╦╩╬])*[◇✦]\s*(?:Persona:\s*)?([^\n]+?)\s*(?:\n|$)/i;
const embeddedCertifiedPersonaPattern = /✦\s*Persona:\s*([a-z0-9-]+)\s*/i;

export function inferMessageSpeaker(message: Pick<ConversationMessage, "role" | "content">): MessageSpeaker {
  if (message.role === "user") {
    return { label: "You", avatar: "N", kind: "user" };
  }

  const persona = message.content.match(personaSignaturePattern)?.[1]?.trim()
    ?? message.content.match(embeddedCertifiedPersonaPattern)?.[1]?.trim();
  if (persona) {
    return { label: persona, avatar: personaAvatar(persona), kind: "persona" };
  }

  return { label: "Agent", avatar: "π", kind: "agent" };
}

export function stripMessageSpeakerSignature(content: string): string {
  return content.replace(personaSignaturePattern, "").replace(embeddedCertifiedPersonaPattern, "").trimStart().trimEnd();
}

export function withCertifiedPersona(content: string, persona: string): string {
  const marker = `✦ Persona: ${persona}`;
  const withoutExistingMarker = content
    .replace(new RegExp(`(?:^|\\n)?[◇✦]\\s*(?:Persona:\\s*)?${escapeRegExp(persona)}\\s*`, "i"), "")
    .trimStart();
  return withoutExistingMarker ? `${marker}\n\n${withoutExistingMarker}` : `${marker}\n\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function personaAvatar(persona: string): string {
  return persona
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "✦";
}
