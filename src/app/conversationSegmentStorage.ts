import { invoke } from "@tauri-apps/api/core";
import {
  parseConversationSegmentManifest,
  type ConversationSegmentManifest,
} from "../domain/conversationSegments";

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
