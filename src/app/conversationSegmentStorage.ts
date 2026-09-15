import { invoke } from "@tauri-apps/api/core";
import {
  parseConversationSegmentManifest,
  type ConversationSegmentManifest,
} from "../domain/conversationSegments";
import { createPersistedJourneyConversation, parsePersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import {
  combineConversationSegmentProjections,
  type ConversationSegmentProjection,
} from "../domain/conversationSegmentProjection";
import type { JourneyConversation } from "../domain/journeyConversation";

type SegmentAuthority = {
  journeyId: string;
  threadId: string;
  generation: number;
  sessionId: string;
  sessionFile: string;
};

export async function refreshConversationSegments(authority: SegmentAuthority): Promise<ConversationSegmentManifest> {
  const value = await invoke<unknown>("refresh_conversation_segments", authority);
  const parsed = parseConversationSegmentManifest(value, {
    journeyId: authority.journeyId,
    threadId: authority.threadId,
    generation: authority.generation,
    piSessionId: authority.sessionId,
  });
  if (!parsed) throw new Error("Conversation Segment authority is invalid.");
  return parsed;
}

export async function publishConversationSegmentProjections(
  authority: SegmentAuthority,
  projections: readonly ConversationSegmentProjection[],
): Promise<number> {
  return invoke<number>("publish_conversation_segment_projections", {
    ...authority,
    projections: projections.map((projection) => ({
      segmentId: projection.segmentId,
      status: projection.status,
      payload: JSON.stringify(createPersistedJourneyConversation(
        projection.conversation,
        new Date(projection.conversation.createdAt),
      )),
    })),
  });
}

export async function loadCurrentConversationSegmentProjection(
  authority: SegmentAuthority,
): Promise<JourneyConversation | undefined> {
  const payload = await invoke<string | null>("load_current_conversation_segment_projection", authority);
  if (!payload) return undefined;
  try {
    const conversation = parsePersistedJourneyConversation(JSON.parse(payload))?.conversation;
    return conversation?.journeyId === authority.journeyId
      && conversation.id === authority.threadId
      && conversation.liveIdentity.harnessConversationId === authority.threadId
      && conversation.liveIdentity.generation === authority.generation
      && conversation.liveIdentity.piSessionId === authority.sessionId
      ? conversation : undefined;
  } catch {
    return undefined;
  }
}

export async function loadCompleteConversationSegmentHistory(
  authority: SegmentAuthority,
): Promise<JourneyConversation> {
  const values = await invoke<unknown[]>("load_conversation_segment_projections", authority);
  const projections = values.map((value, index): ConversationSegmentProjection => {
    if (!value || typeof value !== "object") throw new Error("Conversation Segment history is invalid.");
    const record = value as Record<string, unknown>;
    const status = index === values.length - 1 ? "current" : "closed";
    if (record.segmentId !== `segment-${index + 1}` || record.status !== status || typeof record.payload !== "string") {
      throw new Error("Conversation Segment history sequence is invalid.");
    }
    const conversation = parsePersistedJourneyConversation(JSON.parse(record.payload))?.conversation;
    if (!conversation) throw new Error("Conversation Segment history projection is invalid.");
    return { segmentId: record.segmentId, status, conversation };
  });
  return combineConversationSegmentProjections(projections);
}

export async function loadConversationSegments(
  authority: Omit<SegmentAuthority, "sessionFile">,
): Promise<ConversationSegmentManifest | undefined> {
  const value = await invoke<unknown | null>("load_conversation_segments", {
    journeyId: authority.journeyId,
    threadId: authority.threadId,
    generation: authority.generation,
    sessionId: authority.sessionId,
  });
  if (value === null) return undefined;
  const parsed = parseConversationSegmentManifest(value, {
    journeyId: authority.journeyId,
    threadId: authority.threadId,
    generation: authority.generation,
    piSessionId: authority.sessionId,
  });
  if (!parsed) throw new Error("Conversation Segment authority is invalid.");
  return parsed;
}
