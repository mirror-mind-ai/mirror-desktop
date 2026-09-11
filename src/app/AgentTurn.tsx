import type { ConversationMessage } from "../agent/piTaskPacket";
import type { MessageSpeaker } from "./conversationPresentation";
import type { AgentTurnPresentation } from "./conversationTurnPresentation";
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
  basePath?: string;
  onLocalPathClick?: (path: string) => void;
};

export function AgentTurn({
  message,
  speaker,
  presentation,
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

  return (
    <div className="message-cluster">
      {hasContent ? (
        <article className={`message assistant speaker-${speaker.kind}`}>
          <div className="message-speaker-row">
            <MessageSpeakerAvatar speakerKind={speaker.kind} fallback={speaker.avatar} />
            <span className="message-role">{speaker.label}</span>
            {presentation.agentComment ? <MessageCopyAction body={presentation.agentComment} /> : null}
          </div>
          {presentation.agentActions ? (
            <section className="agent-turn-region agent-actions" aria-label="Agent Actions">
              <span className="runtime-region-label">Agent Actions</span>
              <LiveRuntimeActivity
                projection={presentation.agentActions}
                basePath={basePath}
                suppressedSurfaceContents={suppressedSurfaceContents}
                showRegionLabel={false}
              />
            </section>
          ) : null}
          {presentation.systemSurfaces.length > 0 ? (
            <section className="agent-turn-region system-surfaces" aria-label="System Surfaces">
              <span className="runtime-region-label">System Surfaces</span>
              <ImportedActivity events={presentation.systemSurfaces} basePath={basePath} />
            </section>
          ) : null}
          {presentation.agentComment ? (
            <section className="agent-turn-region agent-comments" aria-label="Agent Comments">
              <span className="runtime-region-label">Agent Comments</span>
              <MessageContent content={presentation.agentComment} basePath={basePath} onLocalPathClick={onLocalPathClick} />
            </section>
          ) : null}
          <MessageFileAttachments attachments={message.attachments} />
          <MessageAttachmentProvenance attachments={message.attachments} />
        </article>
      ) : null}
      <ImportedActivity events={presentation.remainingActivity} basePath={basePath} />
    </div>
  );
}
