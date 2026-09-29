import { useMemo, useState } from "react";
import type { ConversationMessage } from "../agent/piTaskPacket";
import type { MessageSpeaker } from "./conversationPresentation";
import type { AgentTurnPresentation } from "./conversationTurnPresentation";
import { projectAgentActionGroups } from "./agentActionProjection";
import type { AssistantTurnProximity } from "./turnProximity";
import type { ResponseModelBadge } from "./responseModelAttribution";
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
  highlightQuery?: string;
  /** CR091: the model Pi recorded for this answer, absent where none was attributed. */
  responseModel?: ResponseModelBadge;
};

export function AgentTurn({
  message,
  speaker,
  presentation,
  proximity = "latest_completed",
  basePath,
  onLocalPathClick,
  highlightQuery,
  responseModel,
}: AgentTurnProps) {
  const hasContent = Boolean(
    presentation.agentActions
    || presentation.systemSurfaces.length > 0
    || presentation.agentComment
    || presentation.interruptedFragment,
  );
  const [historicalDetailOpen, setHistoricalDetailOpen] = useState(false);
  const suppressedSurfaceContents = presentation.systemSurfaces
    .map((surface) => surface.content)
    .filter((content): content is string => Boolean(content));
  const actionGroups = useMemo(
    () => presentation.agentActions ? projectAgentActionGroups(presentation.agentActions) : [],
    [presentation.agentActions],
  );
  const actionCount = actionGroups.length;
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
        actionGroups={actionGroups}
      />
    </section>
  ) : null;
  const surfaces = presentation.systemSurfaces.length > 0 ? (
    <section className="agent-turn-region system-surfaces" aria-label="System Surfaces">
      <span className="runtime-region-label">System Surfaces</span>
      <ImportedActivity events={presentation.systemSurfaces} basePath={basePath} />
    </section>
  ) : null;
  const renderComment = (content: string) => (
    <MessageContent
      content={content}
      basePath={basePath}
      onLocalPathClick={onLocalPathClick}
      copyCodeBlocks
      highlightQuery={highlightQuery}
    />
  );
  // CR083: notes the agent left while it was still working read as a trail, and the comment that
  // closed the turn keeps the weight of an answer. Both stay visible; neither hides behind a click.
  const trail = presentation.commentTrail?.length ? (
    <ol className="agent-comment-trail" aria-label="Agent progress notes">
      {presentation.commentTrail.map((note, index) => (
        <li key={index} className="agent-comment-note">{renderComment(note)}</li>
      ))}
    </ol>
  ) : null;
  const closing = trail
    ? (presentation.closingComment ? renderComment(presentation.closingComment) : null)
    : (presentation.agentComment ? renderComment(presentation.agentComment) : null);
  const comments = presentation.agentComment ? (
    <section className="agent-turn-region agent-comments" aria-label="Agent Comments">
      <span className="runtime-region-label">Agent Comments</span>
      {trail}
      {closing}
    </section>
  ) : null;
  // CR089: what had already arrived when the Navigator interrupted the turn. It is shown as an
  // unfinished fragment, never as an answer, because the agent never finished saying it.
  const interrupted = presentation.interruptedFragment ? (
    <section className="agent-turn-region agent-interrupted-fragment" aria-label="Interrupted response">
      <span className="runtime-region-label">Interrupted</span>
      {renderComment(presentation.interruptedFragment)}
    </section>
  ) : null;

  return (
    <div className="message-cluster">
      {hasContent ? (
        <article className={`message assistant speaker-${speaker.kind}`}>
          <div className="message-speaker-row">
            <MessageSpeakerAvatar speakerKind={speaker.kind} fallback={speaker.avatar} />
            <span className="message-role">{speaker.label}</span>
            {responseModel ? (
              <span
                className={`response-model-badge${responseModel.changed ? " is-changed" : ""}`}
                title={`Answered by ${responseModel.label}`}
              >
                {responseModel.label}
              </span>
            ) : null}
            {presentation.agentComment ? <MessageCopyAction body={presentation.agentComment} /> : null}
          </div>
          {proximity === "historical" ? (
            <>
              {comments}
              {interrupted}
              {hasHistoricalDetail ? (
                <details
                  className="historical-turn-disclosure"
                  onToggle={(event) => setHistoricalDetailOpen(event.currentTarget.open)}
                >
                  <summary>{historicalDetailLabel(actionCount, presentation.systemSurfaces.length)}</summary>
                  {historicalDetailOpen ? (
                    <div className="historical-turn-detail-body">
                      {actions}
                      {surfaces}
                    </div>
                  ) : null}
                </details>
              ) : null}
            </>
          ) : (
            <>
              {actions}
              {surfaces}
              {comments}
              {interrupted}
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
