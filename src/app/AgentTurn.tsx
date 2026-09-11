import type { ConversationMessage } from "../agent/piTaskPacket";
import type { MessageSpeaker } from "./conversationPresentation";
import type { AgentTurnPresentation } from "./conversationTurnPresentation";
import { projectAgentActionGroups } from "./agentActionProjection";
import type { AssistantTurnProximity } from "./turnProximity";
import { ImportedActivity } from "./ImportedActivity";
import { LiveRuntimeActivity } from "./LiveRuntimeActivity";
import { MessageAttachmentProvenance } from "./MessageAttachmentProvenance";
import { MessageContent } from "./MessageContent";
import { MessageCopyAction } from "./MessageCopyAction";
import { MessageFileAttachments } from "./MessageFileAttachments";
import { MessageSpeakerAvatar } from "./UserAvatar";

type AgentTurnProps = {
  message: ConversationMessage;
  speaker: MessageSpeaker;
  presentation: AgentTurnPresentation;
  proximity?: AssistantTurnProximity;
  basePath?: string;
  onLocalPathClick?: (path: string) => void;
};

export function AgentTurn({
  message,
  speaker,
  presentation,
  proximity = "latest_completed",
  basePath,
  onLocalPathClick,
}: AgentTurnProps) {
  const hasContent = Boolean(
    presentation.agentActions
    || presentation.systemSurfaces.length > 0
    || presentation.agentComment,
  );
  const suppressedSurfaceContents = presentation.systemSurfaces
    .map((surface) => surface.content)
    .filter((content): content is string => Boolean(content));
  const actionCount = presentation.agentActions
    ? projectAgentActionGroups(presentation.agentActions).length
    : 0;
  const hasHistoricalDetail = actionCount > 0 || presentation.systemSurfaces.length > 0;
  const actions = presentation.agentActions ? (
    <section className="agent-turn-region agent-actions" aria-label="Agent Actions">
      <span className="runtime-region-label">Agent Actions</span>
      <LiveRuntimeActivity
        projection={presentation.agentActions}
        basePath={basePath}
        suppressedSurfaceContents={suppressedSurfaceContents}
        showRegionLabel={false}
        showSuccessfulTerminalStatus={false}
      />
    </section>
  ) : null;
  const surfaces = presentation.systemSurfaces.length > 0 ? (
    <section className="agent-turn-region system-surfaces" aria-label="System Surfaces">
      <span className="runtime-region-label">System Surfaces</span>
      <ImportedActivity events={presentation.systemSurfaces} basePath={basePath} />
    </section>
  ) : null;
  const comments = presentation.agentComment ? (
    <section className="agent-turn-region agent-comments" aria-label="Agent Comments">
      <span className="runtime-region-label">Agent Comments</span>
      <MessageContent
        content={presentation.agentComment}
        basePath={basePath}
        onLocalPathClick={onLocalPathClick}
        copyCodeBlocks
      />
    </section>
  ) : null;

  return (
    <div className="message-cluster">
      {hasContent ? (
        <article className={`message assistant speaker-${speaker.kind}`}>
          <div className="message-speaker-row">
            <MessageSpeakerAvatar speakerKind={speaker.kind} fallback={speaker.avatar} />
            <span className="message-role">{speaker.label}</span>
            {presentation.agentComment ? <MessageCopyAction body={presentation.agentComment} /> : null}
          </div>
          {proximity === "historical" ? (
            <>
              {comments}
              {hasHistoricalDetail ? (
                <details className="historical-turn-disclosure">
                  <summary>{historicalDetailLabel(actionCount, presentation.systemSurfaces.length)}</summary>
                  <div className="historical-turn-detail-body">
                    {actions}
                    {surfaces}
                  </div>
                </details>
              ) : null}
            </>
          ) : (
            <>
              {actions}
              {surfaces}
              {comments}
            </>
          )}
          <MessageFileAttachments attachments={message.attachments} />
          <MessageAttachmentProvenance attachments={message.attachments} />
        </article>
      ) : null}
      <ImportedActivity events={presentation.remainingActivity} basePath={basePath} />
    </div>
  );
}

function historicalDetailLabel(actionCount: number, surfaceCount: number): string {
  const details = [
    actionCount > 0 ? `${actionCount} ${actionCount === 1 ? "action" : "actions"}` : undefined,
    surfaceCount > 0 ? `${surfaceCount} ${surfaceCount === 1 ? "surface" : "surfaces"}` : undefined,
  ].filter(Boolean);
  return `Show turn details · ${details.join(" · ")}`;
}
