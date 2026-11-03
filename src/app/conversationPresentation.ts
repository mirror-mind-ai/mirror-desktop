import type { ConversationMessage } from "../agent/piTaskPacket";

export type MessageSpeaker = {
  label: string;
  avatar: string;
  kind: "user" | "agent" | "persona";
};

const personaSignaturePattern = /^(?:\s|[│|╭╮╰╯─━═┌┐└┘╔╗╚╝╠╣╦╩╬])*[◇✦]\s*(?:Persona:\s*)?([^\n]+?)\s*(?:\n|$)/i;
const embeddedCertifiedPersonaPattern = /✦\s*Persona:\s*([a-z0-9-]+)\s*/i;
// CR188: the 0.3 Core asks the model to `sign ◇ <persona>`, and the model signs on the last line.
const trailingPersonaSignaturePattern = /\n[ \t]*[◇✦][ \t]*(?:Persona:[ \t]*)?([a-z0-9]+(?:-[a-z0-9]+)*)[ \t]*\s*$/i;

export function inferMessageSpeaker(message: Pick<ConversationMessage, "role" | "content">): MessageSpeaker {
  if (message.role === "user") {
    return { label: "You", avatar: "N", kind: "user" };
  }

  const persona = message.content.match(personaSignaturePattern)?.[1]?.trim()
    ?? message.content.match(embeddedCertifiedPersonaPattern)?.[1]?.trim()
    ?? message.content.match(trailingPersonaSignaturePattern)?.[1]?.trim();
  if (persona) {
    return { label: persona, avatar: personaAvatar(persona), kind: "persona" };
  }

  return { label: "Agent", avatar: "π", kind: "agent" };
}

/** CR188: the persona the Mirror delivered names the speaker; the text's own signature is the fallback. */
export function personaSpeaker(
  message: Pick<ConversationMessage, "role" | "content">,
  deliveredPersona: string | undefined,
): MessageSpeaker {
  if (message.role === "assistant" && deliveredPersona) {
    return { label: deliveredPersona, avatar: personaAvatar(deliveredPersona), kind: "persona" };
  }
  return inferMessageSpeaker(message);
}

export function stripMessageSpeakerSignature(content: string): string {
  return content
    .replace(personaSignaturePattern, "")
    .replace(embeddedCertifiedPersonaPattern, "")
    .replace(trailingPersonaSignaturePattern, "")
    .trimStart()
    .trimEnd();
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
