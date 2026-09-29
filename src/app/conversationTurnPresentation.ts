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
  /** CR083: a restored comment that did not close its turn reads as a note, not as an answer. */
  commentRole?: "trail";
};

export type AgentTurnPresentation = {
  agentActions?: RuntimeProjectionState;
  systemSurfaces: ImportedConversationActivityEvent[];
  remainingActivity: ImportedConversationActivityEvent[];
  /** The whole comment text of the turn, kept intact for copying. */
  agentComment: string;
  /** CR083: comments emitted while work was still running, in order. */
  commentTrail?: string[];
  /** CR083: the comment that closed the turn; absent while it is still open or when it never closed. */
  closingComment?: string;
};

export function projectAgentTurnPresentation(input: AgentTurnPresentationInput): AgentTurnPresentation {
  const comment = stripMessageSpeakerSignature(stripMirrorModeBlocks(stripMirrorSurfaceBlocks(input.content)));
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
    ...projectAgentComments(input.runtimeProjection, comment, input.commentRole),
  };
}

// CR083: an agent comment becomes the turn's answer only by closing the turn. Anything emitted
// while more work was still coming stays a note, and an interrupted run never gains an answer it
// did not produce.
function projectAgentComments(
  projection: RuntimeProjectionState | undefined,
  restoredComment: string,
  restoredRole: "trail" | undefined,
): Pick<AgentTurnPresentation, "commentTrail" | "closingComment"> {
  const comments = (projection?.agentComments ?? [])
    .map((comment) => comment.trim())
    .filter(Boolean);
  if (comments.length === 0) {
    return restoredRole === "trail" && restoredComment.trim()
      ? { commentTrail: [restoredComment] }
      : {};
  }

  if (projection?.status === "completed") {
    const trail = comments.slice(0, -1);
    return {
      ...(trail.length > 0 ? { commentTrail: trail } : {}),
      closingComment: comments[comments.length - 1],
    };
  }

  const interrupted = projection?.status === "cancelled" || projection?.status === "failed";
  // A lone comment still being written is left alone, so an ordinary answer does not first
  // appear as a note and then reflow into an answer.
  return interrupted || comments.length > 1 ? { commentTrail: comments } : {};
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
