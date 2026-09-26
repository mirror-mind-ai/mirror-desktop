import { memo, useCallback, useMemo, useRef, useState } from "react";
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
import { projectResponseModelBadges, type ResponseModelBadge } from "./responseModelAttribution";
import {
  clampConversationNavigationIndex,
  createConversationTurnNavigationItems,
  findConversationSearchMatches,
} from "./conversationSearchNavigation";

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
  searchOpen?: boolean;
  turnNavigatorOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  onTurnNavigatorOpenChange?: (open: boolean) => void;
  /** CR091: model captured on the live run, for the answer Pi has not recorded yet. */
  liveResponseModel?: { messageId: string; label: string };
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
  highlightQuery?: string;
  responseModel?: ResponseModelBadge;
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
  highlightQuery,
  responseModel,
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
        highlightQuery={highlightQuery}
        responseModel={responseModel}
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
            highlightQuery={highlightQuery}
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
  searchOpen = false,
  turnNavigatorOpen = false,
  onSearchOpenChange,
  onTurnNavigatorOpenChange,
  liveResponseModel,
}: ConversationTranscriptProps) {
  const index = useMemo(() => buildConversationTranscriptIndex(conversation), [conversation]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const responseModelBadges = useMemo(
    () => projectResponseModelBadges({
      messages,
      ...(conversation.responseModels ? { responseModels: conversation.responseModels } : {}),
      ...(liveResponseModel ? { liveAttribution: liveResponseModel } : {}),
    }),
    [messages, conversation.responseModels, liveResponseModel],
  );
  const searchMatches = useMemo(() => findConversationSearchMatches(messages, searchQuery), [messages, searchQuery]);
  const turnItems = useMemo(() => createConversationTurnNavigationItems(messages), [messages]);
  const activeMatch = searchMatches[clampConversationNavigationIndex(currentMatchIndex, searchMatches.length)];

  const scrollToMessage = useCallback((messageId: string) => {
    messageRefs.current.get(messageId)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const moveSearch = useCallback((direction: 1 | -1) => {
    if (searchMatches.length === 0) {
      return;
    }
    const nextIndex = clampConversationNavigationIndex(currentMatchIndex + direction, searchMatches.length);
    setCurrentMatchIndex(nextIndex);
    scrollToMessage(searchMatches[nextIndex].messageId);
  }, [currentMatchIndex, scrollToMessage, searchMatches]);

  const updateSearchQuery = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentMatchIndex(0);
  }, []);

  const searchStatus = !searchQuery.trim()
    ? "Search is scoped to loaded content in this Conversation."
    : searchMatches.length === 0
      ? "No matches in loaded Conversation content."
      : `Match ${clampConversationNavigationIndex(currentMatchIndex, searchMatches.length) + 1} of ${searchMatches.length} in loaded Conversation content.`;

  return (
    <>
      {messages.length > 0 && searchOpen ? (
        <section className="conversation-search-panel" role="search" aria-label="Search loaded Conversation content">
          <button
            type="button"
            className="conversation-panel-close"
            onClick={() => onSearchOpenChange?.(false)}
            aria-label="Close conversation search"
            title="Close"
          >
            ×
          </button>
          <label>
            <span>Search loaded Conversation content</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => updateSearchQuery(event.target.value)}
              placeholder="Find text in this Conversation"
              autoFocus
            />
          </label>
          <p role="status">{searchStatus}</p>
          <div className="conversation-search-controls">
            <button type="button" className="secondary-button" disabled={searchMatches.length === 0} onClick={() => moveSearch(-1)}>Previous</button>
            <button type="button" className="secondary-button" disabled={searchMatches.length === 0} onClick={() => moveSearch(1)}>Next</button>
          </div>
        </section>
      ) : null}
      {messages.length > 0 && turnNavigatorOpen ? (
        <aside className="conversation-turn-panel" aria-label="Conversation turns">
          <button
            type="button"
            className="conversation-panel-close"
            onClick={() => onTurnNavigatorOpenChange?.(false)}
            aria-label="Close turn navigator"
            title="Close"
          >
            ×
          </button>
          <p>User turns, from newest to oldest.</p>
          <ol>
            {turnItems.map((item) => (
              <li key={item.messageId}>
                <button type="button" onClick={() => scrollToMessage(item.messageId)} aria-label={`Go to user turn ${item.ordinal}: ${item.snippet}`}>
                  <MessageSpeakerAvatar speakerKind="user" fallback="N" userAvatar={userAvatar} />
                  <q>{item.snippet}</q>
                  <span className="conversation-turn-number" aria-hidden="true">{item.ordinal}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
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
              ?? index.reconstructedProjectionByAssistantMessageId.get(message.id)
          : undefined;
        return (
          <div
            key={message.id}
            ref={(element) => {
              if (element) {
                messageRefs.current.set(message.id, element);
              } else {
                messageRefs.current.delete(message.id);
              }
            }}
            className={activeMatch?.messageId === message.id ? "conversation-message-search-current" : undefined}
            data-conversation-message-id={message.id}
          >
            <ConversationMessageRow
              message={message}
              linkedActivity={linkedActivity}
              proximity={assistantTurnProximity.get(message.id)}
              exactRuntimeProjection={exactRuntimeProjection}
              steering={steering}
              basePath={basePath}
              userAvatar={userAvatar}
              onLocalPathClick={onLocalPathClick}
              highlightQuery={searchOpen ? searchQuery : undefined}
              responseModel={responseModelBadges[message.id]}
            />
          </div>
        );
      })}
    </>
  );
});
