import { memo, useMemo } from "react";
import type { ConversationMessage } from "../agent/piTaskPacket";
import type { JourneyConversation, SteeringEvidence } from "../domain/journeyConversation";
import { AgentTurn } from "./AgentTurn";
import {
  extractMirrorModeEventsFromContent,
  extractMirrorSurfaceEventsFromContent,
  ImportedActivity,
  mergeImportedActivityEvents,
  stripMirrorModeBlocks,
  stripMirrorSurfaceBlocks,
  type groupImportedActivityByMessage,
} from "./ImportedActivity";
import { MessageAttachmentProvenance } from "./MessageAttachmentProvenance";
import { MessageContent } from "./MessageContent";
import { MessageCopyAction } from "./MessageCopyAction";
import { MessageFileAttachments } from "./MessageFileAttachments";
import { SteeringMessages } from "./SteeringMessages";
import { MessageSpeakerAvatar } from "./UserAvatar";
import { inferMessageSpeaker, stripMessageSpeakerSignature } from "./conversationPresentation";
import { projectAgentTurnPresentation } from "./conversationTurnPresentation";
import type { RuntimeProjectionState } from "./runtimeActivityModel";
import type { AssistantTurnProximity } from "./turnProximity";
import { buildConversationTranscriptIndex } from "./conversationTranscriptModel";

type GroupedImportedActivity = ReturnType<typeof groupImportedActivityByMessage>;
const EMPTY_ACTIVITY: GroupedImportedActivity["unlinked"] = [];
const EMPTY_STEERING: SteeringEvidence[] = [];

type ConversationTranscriptProps = {
  messages: ConversationMessage[];
  conversation: JourneyConversation;
  importedActivity: GroupedImportedActivity;
  assistantTurnProximity: ReadonlyMap<string, AssistantTurnProximity>;
  runtimeProjection: RuntimeProjectionState;
  runtimeProjectionMessageId?: string;
  basePath?: string;
  userAvatar?: string;
  onLocalPathClick: (path: string) => void;
};

type ConversationMessageRowProps = {
  message: ConversationMessage;
  linkedActivity: GroupedImportedActivity["unlinked"];
  proximity?: AssistantTurnProximity;
  exactRuntimeProjection?: RuntimeProjectionState;
  steering: SteeringEvidence[];
  basePath?: string;
  userAvatar?: string;
  onLocalPathClick: (path: string) => void;
};

const ConversationMessageRow = memo(function ConversationMessageRow({
  message,
  linkedActivity,
  proximity,
  exactRuntimeProjection,
  steering,
  basePath,
  userAvatar,
  onLocalPathClick,
}: ConversationMessageRowProps) {
  const contentWithoutSurfaces = stripMirrorSurfaceBlocks(message.content);
  const renderedContent = stripMirrorModeBlocks(contentWithoutSurfaces);
  const speaker = inferMessageSpeaker({ ...message, content: renderedContent });

  if (message.role === "assistant") {
    const presentation = projectAgentTurnPresentation({
      messageId: message.id,
      content: message.content,
      createdAt: message.createdAt,
      linkedActivity,
      ...(exactRuntimeProjection ? { runtimeProjection: exactRuntimeProjection } : {}),
    });
    return (
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={presentation}
        proximity={proximity}
        basePath={basePath}
        onLocalPathClick={onLocalPathClick}
      />
    );
  }

  const renderTimeActivity = [
    ...extractMirrorSurfaceEventsFromContent({
      content: message.content,
      messageId: message.id,
      createdAt: message.createdAt,
    }),
    ...extractMirrorModeEventsFromContent({
      content: contentWithoutSurfaces,
      messageId: message.id,
      createdAt: message.createdAt,
    }),
  ];
  const messageActivity = mergeImportedActivityEvents(linkedActivity, renderTimeActivity);
  const bodyContent = stripMessageSpeakerSignature(renderedContent);

  return (
    <div className="message-cluster">
      {bodyContent ? (
        <article className={`message ${message.role} speaker-${speaker.kind}`}>
          <div className="message-speaker-row">
            <MessageSpeakerAvatar speakerKind={speaker.kind} fallback={speaker.avatar} userAvatar={userAvatar} />
            <span className="message-role">{speaker.label}</span>
            <MessageCopyAction body={bodyContent} />
          </div>
          <MessageContent
            content={bodyContent}
            basePath={basePath}
            onLocalPathClick={onLocalPathClick}
            preserveParagraphLineBreaks
          />
          <MessageFileAttachments attachments={message.attachments} />
          <MessageAttachmentProvenance attachments={message.attachments} />
        </article>
      ) : null}
      <SteeringMessages evidence={steering} />
      <ImportedActivity events={messageActivity} basePath={basePath} />
    </div>
  );
});

export const ConversationTranscript = memo(function ConversationTranscript({
  messages,
  conversation,
  importedActivity,
  assistantTurnProximity,
  runtimeProjection,
  runtimeProjectionMessageId,
  basePath,
  userAvatar,
  onLocalPathClick,
}: ConversationTranscriptProps) {
  const index = useMemo(() => buildConversationTranscriptIndex(conversation), [conversation]);

  return (
    <>
      <ImportedActivity events={importedActivity.unlinked} variant="summary" basePath={basePath} />
      {messages.map((message) => {
        const linkedActivity = importedActivity.byMessageId.get(message.id) ?? EMPTY_ACTIVITY;
        const owningAssistantMessageId = index.turnByUserMessageId.get(message.id)?.harness.assistantMessageId;
        const steering = owningAssistantMessageId
          ? index.steeringByAssistantMessageId.get(owningAssistantMessageId) ?? EMPTY_STEERING
          : EMPTY_STEERING;
        const exactRuntimeProjection = message.role === "assistant"
          ? runtimeProjectionMessageId === message.id
            ? runtimeProjection
            : index.terminalEvidenceByAssistantMessageId.get(message.id)?.projection
          : undefined;
        return (
          <ConversationMessageRow
            key={message.id}
            message={message}
            linkedActivity={linkedActivity}
            proximity={assistantTurnProximity.get(message.id)}
            exactRuntimeProjection={exactRuntimeProjection}
            steering={steering}
            basePath={basePath}
            userAvatar={userAvatar}
            onLocalPathClick={onLocalPathClick}
          />
        );
      })}
    </>
  );
});
