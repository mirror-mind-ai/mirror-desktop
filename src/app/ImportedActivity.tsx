import type { ImportedConversationActivityEvent } from "../domain/persistedJourneyConversation";
import { LinkifiedText } from "./LinkifiedText";
import { mirrorModeDisplay, type MirrorOperatingMode } from "./mirrorModeState";

type ImportedActivityProps = {
  events: ImportedConversationActivityEvent[];
  variant?: "inline" | "summary";
  basePath?: string;
};

export function extractAriadSurfaceEventsFromContent(input: {
  content: string;
  messageId: string;
  createdAt: string;
}): ImportedConversationActivityEvent[] {
  const events: ImportedConversationActivityEvent[] = [];
  const pattern = /<<<\s*ARIAD:([^>\s]+)\s*>>>([\s\S]*?)<<<\s*END:\1\s*>>>/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = pattern.exec(input.content)) !== null) {
    const surfaceType = match[1];
    events.push({
      id: `${input.messageId}-inline-ariad-${index}`,
      kind: "ariad_surface",
      timestamp: input.createdAt,
      title: `Ariad surface: ${surfaceType}`,
      source: { system: "mirror", table: "messages", id: input.messageId.replace(/^mirror-/, "") },
      content: match[0].trim(),
      payload: { surfaceType, detectedAtRenderTime: true },
      related: { messageId: input.messageId },
    });
    index += 1;
  }

  return events;
}

export function stripAriadSurfaceBlocks(content: string): string {
  return content.replace(/<<<\s*ARIAD:([^>\s]+)\s*>>>[\s\S]*?<<<\s*END:\1\s*>>>/g, "").trim();
}

type CapturedSurface = {
  start: number;
  end: number;
  surfaceType: string;
  content: string;
};

export function extractMirrorSurfaceEventsFromContent(input: {
  content: string;
  messageId: string;
  createdAt: string;
}): ImportedConversationActivityEvent[] {
  return captureMirrorSurfaces(input.content).map((surface, index) => ({
    id: `${input.messageId}-inline-surface-${index + 1}`,
    kind: "ariad_surface",
    timestamp: input.createdAt,
    title: `Ariad surface: ${surface.surfaceType}`,
    source: { system: "mirror", table: "messages", id: input.messageId.replace(/^mirror-/, "") },
    content: surface.content,
    payload: { surfaceType: surface.surfaceType, detectedAtRenderTime: true },
    related: { messageId: input.messageId },
  }));
}

export function stripMirrorSurfaceBlocks(content: string): string {
  const surfaces = captureMirrorSurfaces(content);
  let stripped = content;
  for (const surface of [...surfaces].reverse()) {
    stripped = `${stripped.slice(0, surface.start)}${stripped.slice(surface.end)}`;
  }
  return stripped.replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeMirrorSurfaceContent(content: string): string {
  return content.replace(/\r\n/g, "\n").trim();
}

function captureMirrorSurfaces(content: string): CapturedSurface[] {
  const captured: CapturedSurface[] = [];
  collectPatternSurfaces(
    content,
    /<<<\s*ARIAD:([^>\s]+)\s*>>>([\s\S]*?)<<<\s*END:\1\s*>>>/g,
    (match) => ({ surfaceType: match[1], content: match[0].trim() }),
    captured,
  );
  collectPatternSurfaces(
    content,
    /\[\[MIRROR_REQUIRED_SURFACE_BEGIN:([^\]\s]+)\]\]\s*([\s\S]*?)\s*\[\[MIRROR_REQUIRED_SURFACE_END:\1\]\]/g,
    (match) => ({ surfaceType: match[1].toUpperCase(), content: match[2].trim() }),
    captured,
  );
  collectBoxedExplorerSurfaces(content, captured);
  return captured.sort((left, right) => left.start - right.start);
}

function collectPatternSurfaces(
  content: string,
  pattern: RegExp,
  project: (match: RegExpExecArray) => { surfaceType: string; content: string },
  captured: CapturedSurface[],
) {
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (overlapsCapturedRange(match.index, match.index + match[0].length, captured)) {
      continue;
    }
    captured.push({ start: match.index, end: match.index + match[0].length, ...project(match) });
  }
}

function collectBoxedExplorerSurfaces(content: string, captured: CapturedSurface[]) {
  const linePattern = /.*(?:\n|$)/g;
  const lines: Array<{ text: string; start: number; end: number }> = [];
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = linePattern.exec(content)) !== null && lineMatch[0]) {
    lines.push({ text: lineMatch[0].replace(/\n$/, ""), start: lineMatch.index, end: lineMatch.index + lineMatch[0].length });
  }
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*╭[─━═]+╮\s*$/.test(lines[index].text)) {
      continue;
    }
    const endIndex = lines.findIndex((line, candidate) => candidate > index && /^\s*╰[─━═]+╯\s*$/.test(line.text));
    if (endIndex < 0) {
      continue;
    }
    const heading = lines
      .slice(index + 1, endIndex)
      .map((line) => line.text.match(/[│|]\s*△\s+([A-Z][A-Z ]*?[A-Z])\s+[│|]\s*$/)?.[1]?.trim())
      .find(Boolean);
    if (!heading || /\bMODE (?:ACTIVE|DEACTIVATED)\b/.test(heading)) {
      index = endIndex;
      continue;
    }
    const includeMirrorPrefix = index > 0 && /^\s*Mirror\s*$/.test(lines[index - 1].text);
    const start = includeMirrorPrefix ? lines[index - 1].start : lines[index].start;
    const end = lines[endIndex].end;
    if (!overlapsCapturedRange(start, end, captured)) {
      captured.push({
        start,
        end,
        surfaceType: heading.replace(/\s+/g, "_"),
        content: content.slice(start, end).trim(),
      });
    }
    index = endIndex;
  }
}

function overlapsCapturedRange(start: number, end: number, captured: CapturedSurface[]): boolean {
  return captured.some((surface) => start < surface.end && end > surface.start);
}

export function extractMirrorModeEventsFromContent(input: {
  content: string;
  messageId: string;
  createdAt: string;
}): ImportedConversationActivityEvent[] {
  const block = findMirrorModeBlock(input.content);
  if (!block) {
    return [];
  }

  const transition = block.match(/\b(MIRROR|BUILDER|EXPLORER|SOUL) MODE (ACTIVE|DEACTIVATED)\b/i);
  const mode = transition?.[1] ?? "MIRROR";
  const action = transition?.[2].toUpperCase() === "DEACTIVATED" ? "deactivate" : "activate";
  return [
    {
      id: `${input.messageId}-inline-mode`,
      kind: "mirror_mode",
      timestamp: input.createdAt,
      title: `${capitalize(mode)} Mode ${action === "activate" ? "Active" : "Deactivated"}`,
      source: { system: "mirror", table: "messages", id: input.messageId.replace(/^mirror-/, "") },
      content: block.trim(),
      payload: { mode: mode.toLowerCase(), transition: action, detectedAtRenderTime: true },
      related: { messageId: input.messageId },
    },
  ];
}

export function stripMirrorModeBlocks(content: string): string {
  const block = findMirrorModeBlock(content);
  return block ? content.replace(block, "").replace(/^\s*Mirror\s*(?=\n|$)/i, "").trim() : content;
}

function findMirrorModeBlock(content: string): string | undefined {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let modeLine = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/\b(MIRROR|BUILDER|EXPLORER|SOUL) MODE (?:ACTIVE|DEACTIVATED)\b/i.test(lines[index])) {
      modeLine = index;
    }
  }
  if (modeLine < 0) {
    return undefined;
  }

  let start = modeLine;
  while (start > 0 && isDecorativeModeLine(lines[start - 1])) {
    start -= 1;
  }

  let end = modeLine + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (/^\s*[◇✦]\s*(?:Persona:)?/i.test(line)) {
      break;
    }
    if (!line.trim() && end > start) {
      break;
    }
    end += 1;
  }

  while (end < lines.length && isDecorativeModeLine(lines[end])) {
    end += 1;
  }

  return lines.slice(start, end).join("\n");
}

function isDecorativeModeLine(line: string): boolean {
  const trimmed = line.trim();
  return !trimmed || /^Mirror$/i.test(trimmed) || /^[│|╭╮╰╯─━═┌┐└┘╔╗╚╝╠╣╦╩╬\s]+$/.test(trimmed);
}

export function mergeImportedActivityEvents(
  importedEvents: ImportedConversationActivityEvent[],
  fallbackEvents: ImportedConversationActivityEvent[],
): ImportedConversationActivityEvent[] {
  const seen = new Set(importedEvents.map((event) => `${event.kind}:${event.title}:${event.content ?? ""}`));
  return [
    ...importedEvents,
    ...fallbackEvents.filter((event) => {
      const key = `${event.kind}:${event.title}:${event.content ?? ""}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  ];
}

export function groupImportedActivityByMessage(events: ImportedConversationActivityEvent[]): {
  byMessageId: Map<string, ImportedConversationActivityEvent[]>;
  unlinked: ImportedConversationActivityEvent[];
} {
  const byMessageId = new Map<string, ImportedConversationActivityEvent[]>();
  const unlinked: ImportedConversationActivityEvent[] = [];

  for (const event of events) {
    const messageId = event.related?.messageId;
    if (!messageId) {
      unlinked.push(event);
      continue;
    }

    byMessageId.set(messageId, [...(byMessageId.get(messageId) ?? []), event]);
  }

  return { byMessageId, unlinked };
}

export function activityKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    mirror_mode: "Mode",
    ariad_surface: "Ariad",
    metadata: "Metadata",
    attachment_reference: "Attachment",
    operation_event: "Operation",
    command: "Command",
    tool_call: "Tool",
    error: "Error",
  };
  return labels[kind] ?? "Activity";
}

export function isMirrorModeActivity(event: Pick<ImportedConversationActivityEvent, "kind" | "title" | "content">): boolean {
  return event.kind === "mirror_mode" || /\b(MIRROR|BUILDER|EXPLORER|SOUL) MODE (?:ACTIVE|DEACTIVATED)\b/i.test(`${event.title}\n${event.content ?? ""}`);
}

export function mirrorModeLabel(event: Pick<ImportedConversationActivityEvent, "title" | "content">): string {
  const match = `${event.title}\n${event.content ?? ""}`.match(/\b(MIRROR|BUILDER|EXPLORER|SOUL) MODE (?:ACTIVE|DEACTIVATED)\b/i);
  return match ? `${capitalize(match[1])} Mode` : "Mirror Mode";
}

export function mirrorModeIcon(event: Pick<ImportedConversationActivityEvent, "title" | "content">): string {
  const match = `${event.title}\n${event.content ?? ""}`.match(/\b(MIRROR|BUILDER|EXPLORER|SOUL) MODE (?:ACTIVE|DEACTIVATED)\b/i);
  const mode = (match?.[1].toLowerCase() ?? "mirror") as MirrorOperatingMode;
  return mirrorModeDisplay(mode).icon;
}

export function isTerminalLikeActivity(kind: string): boolean {
  return ["mirror_mode", "ariad_surface", "operation_event", "command", "tool_call", "error"].includes(kind);
}

export function ImportedActivity({ events, variant = "inline", basePath }: ImportedActivityProps) {
  if (events.length === 0) {
    return null;
  }

  const eventViews = events.map((event) => (
    <ImportedActivityEventView key={event.id} event={event} basePath={basePath} />
  ));
  if (variant === "summary") {
    return (
      <details className="imported-context-disclosure" aria-label="Imported Mirror context">
        <summary>
          <span>Imported context</span>
          <strong>{events.length} {events.length === 1 ? "record" : "records"}</strong>
        </summary>
        <div className="imported-activity imported-activity-summary">
          {eventViews}
        </div>
      </details>
    );
  }

  return (
    <div className="imported-activity imported-activity-inline" aria-label="Imported Mirror activity">
      {eventViews}
    </div>
  );
}

function ImportedActivityEventView({ event, basePath }: { event: ImportedConversationActivityEvent; basePath?: string }) {
  const terminalLike = isTerminalLikeActivity(event.kind);
  const modeActivity = isMirrorModeActivity(event);
  const statusText = [event.status, event.severity].filter(Boolean).join(" · ");
  const label = modeActivity ? "MODE ACTIVATED" : activityKindLabel(event.kind);
  const title = modeActivity ? mirrorModeLabel(event) : event.title;

  return (
    <details className={`activity-event activity-${event.kind} ${modeActivity ? "activity-mode" : ""}`} open={event.kind === "error"}>
      <summary>
        <span className="activity-kind">{label}</span>
        <strong>
          {modeActivity ? <span className="activity-mode-icon" aria-hidden="true">{mirrorModeIcon(event)}</span> : null}
          {title}
        </strong>
        {statusText ? <small>{statusText}</small> : null}
      </summary>
      <div className="activity-body">
        {event.content ? (
          terminalLike ? (
            <pre className="activity-terminal"><code><LinkifiedText text={event.content} basePath={basePath} /></code></pre>
          ) : (
            <p><LinkifiedText text={event.content} basePath={basePath} /></p>
          )
        ) : null}
        {event.payload ? <PayloadPreview payload={event.payload} basePath={basePath} /> : null}
        <p className="activity-provenance">
          {event.source.table} · {event.source.id} · {event.timestamp}
        </p>
      </div>
    </details>
  );
}

function PayloadPreview({ payload, basePath }: { payload: unknown; basePath?: string }) {
  return (
    <pre className="activity-payload"><code><LinkifiedText text={JSON.stringify(payload, null, 2)} basePath={basePath} /></code></pre>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
