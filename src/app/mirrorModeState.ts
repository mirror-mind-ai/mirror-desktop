import type { ConversationMessage } from "../agent/piTaskPacket";
import type { ImportedConversationActivityEvent } from "../domain/persistedJourneyConversation";
import type { MirrorOperatingMode } from "../domain/journeyConversation";

export type { MirrorOperatingMode } from "../domain/journeyConversation";

export type CertifiedModeTransition = {
  kind: "activate" | "deactivate";
  mode: MirrorOperatingMode;
};

const MODE_SURFACE_PATTERN = /(?:◌\s*MIRROR|■\s*BUILDER|△\s*EXPLORER|☾\s*SOUL) MODE (ACTIVE|DEACTIVATED)\b/gi;

export function extractCertifiedModeTransition(content: string): CertifiedModeTransition | undefined {
  let latest: CertifiedModeTransition | undefined;
  for (const match of content.matchAll(MODE_SURFACE_PATTERN)) {
    const label = match[0].match(/\b(MIRROR|BUILDER|EXPLORER|SOUL)\b/i)?.[1];
    if (!label) {
      continue;
    }
    latest = {
      kind: match[1].toUpperCase() === "ACTIVE" ? "activate" : "deactivate",
      mode: label.toLowerCase() as MirrorOperatingMode,
    };
  }
  return latest;
}

export function extractCertifiedModeTransitionFromActivity(
  event: Pick<ImportedConversationActivityEvent, "kind" | "title" | "content" | "payload">,
): CertifiedModeTransition | undefined {
  if (event.kind === "mirror_mode" && event.payload && typeof event.payload === "object") {
    const payload = event.payload as Record<string, unknown>;
    if (isMirrorOperatingMode(payload.mode)) {
      return {
        kind: String(payload.transition ?? "activate") === "deactivate" ? "deactivate" : "activate",
        mode: payload.mode,
      };
    }
  }
  return extractCertifiedModeTransition(`${event.title}\n${event.content ?? ""}`);
}

export function deriveLatestCertifiedModeTransition(
  messages: ConversationMessage[],
  activity: ImportedConversationActivityEvent[] = [],
): CertifiedModeTransition | undefined {
  let latest: { timestamp: string; transition: CertifiedModeTransition } | undefined;
  for (const message of messages) {
    const transition = extractCertifiedModeTransition(message.content);
    if (transition && (!latest || message.createdAt >= latest.timestamp)) {
      latest = { timestamp: message.createdAt, transition };
    }
  }
  for (const event of activity) {
    const transition = extractCertifiedModeTransitionFromActivity(event);
    if (transition && (!latest || event.timestamp >= latest.timestamp)) {
      latest = { timestamp: event.timestamp, transition };
    }
  }
  return latest?.transition;
}

export function isMirrorOperatingMode(value: unknown): value is MirrorOperatingMode {
  return value === "mirror" || value === "builder" || value === "explorer" || value === "soul";
}

export function mirrorModeDisplay(mode: MirrorOperatingMode): { icon: string; label: string } {
  return {
    mirror: { icon: "◌", label: "Mirror Mode" },
    builder: { icon: "■", label: "Builder Mode" },
    explorer: { icon: "△", label: "Explorer Mode" },
    soul: { icon: "☾", label: "Soul Mode" },
  }[mode];
}
