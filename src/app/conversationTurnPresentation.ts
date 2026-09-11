import type { RuntimeProjectionState } from "./runtimeActivityModel";
import type { ImportedConversationActivityEvent } from "../domain/persistedJourneyConversation";
import { stripAnsiControlSequences } from "../agent/terminalText";
import {
  extractMirrorModeEventsFromContent,
  extractMirrorSurfaceEventsFromContent,
  isMirrorModeActivity,
  normalizeMirrorSurfaceContent,
  stripMirrorModeBlocks,
  stripMirrorSurfaceBlocks,
} from "./ImportedActivity";
import { stripMessageSpeakerSignature } from "./conversationPresentation";

export type AgentTurnPresentationInput = {
  messageId: string;
  content: string;
  createdAt: string;
  linkedActivity: ImportedConversationActivityEvent[];
  runtimeProjection?: RuntimeProjectionState;
};

export type AgentTurnPresentation = {
  agentActions?: RuntimeProjectionState;
  systemSurfaces: ImportedConversationActivityEvent[];
  remainingActivity: ImportedConversationActivityEvent[];
  agentComment: string;
};

export function projectAgentTurnPresentation(input: AgentTurnPresentationInput): AgentTurnPresentation {
  const contentWithoutSurfaces = stripMirrorSurfaceBlocks(input.content);
  const contentWithoutSystemBlocks = stripMirrorModeBlocks(contentWithoutSurfaces);
  const renderTimeSurfaces = [
    ...extractMirrorSurfaceEventsFromContent({
      content: input.content,
      messageId: input.messageId,
      createdAt: input.createdAt,
    }),
    ...extractMirrorModeEventsFromContent({
      content: contentWithoutSurfaces,
      messageId: input.messageId,
      createdAt: input.createdAt,
    }),
  ];
  const linkedSystemSurfaces = input.linkedActivity.filter(isSystemSurface);
  const remainingActivity = input.linkedActivity.filter((activity) => !isSystemSurface(activity));
  const runtimeSystemSurfaces = input.runtimeProjection
    ? extractRuntimeSystemSurfaces(input.runtimeProjection)
    : [];

  return {
    ...(input.runtimeProjection && hasSemanticAgentActions(input.runtimeProjection)
      ? { agentActions: input.runtimeProjection }
      : {}),
    systemSurfaces: deduplicateSystemSurfaces([
      ...linkedSystemSurfaces,
      ...renderTimeSurfaces,
      ...runtimeSystemSurfaces,
    ]),
    remainingActivity,
    agentComment: stripMessageSpeakerSignature(contentWithoutSystemBlocks),
  };
}

function hasSemanticAgentActions(projection: RuntimeProjectionState): boolean {
  return projection.operations.length > 0
    || projection.reasoningSummaries.some((summary) => Boolean(summary.content))
    || projection.status === "failed"
    || projection.status === "cancelled";
}

export function isSystemSurface(
  activity: Pick<ImportedConversationActivityEvent, "kind" | "title" | "content">,
): boolean {
  return activity.kind === "ariad_surface" || isMirrorModeActivity(activity);
}

function extractRuntimeSystemSurfaces(projection: RuntimeProjectionState): ImportedConversationActivityEvent[] {
  const surfaces: ImportedConversationActivityEvent[] = [];
  for (const reference of projection.activityOrder) {
    if (reference.type !== "operation") continue;
    const operation = projection.operations.find((candidate) => candidate.id === reference.id);
    if (operation?.output === undefined) continue;
    const content = stripAnsiControlSequences(operation.output);
    const extractedSurfaces = extractMirrorSurfaceEventsFromContent({
      content,
      messageId: `runtime-${operation.id}`,
      createdAt: "live",
    });
    const contentWithoutSurfaces = stripMirrorSurfaceBlocks(content);
    const modeSurfaces = extractMirrorModeEventsFromContent({
      content: contentWithoutSurfaces,
      messageId: `runtime-${operation.id}`,
      createdAt: "live",
    });
    surfaces.push(...[...extractedSurfaces, ...modeSurfaces].map((surface) => ({
      ...surface,
      source: { system: "mirror" as const, table: "runtime", id: operation.id },
    })));
  }
  return surfaces;
}

function deduplicateSystemSurfaces(
  surfaces: ImportedConversationActivityEvent[],
): ImportedConversationActivityEvent[] {
  const seen = new Set<string>();
  return surfaces.filter((surface) => {
    const content = surface.content
      ? normalizeMirrorSurfaceContent(surface.content)
      : "";
    const key = `${surface.kind}:${surface.title}:${content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
