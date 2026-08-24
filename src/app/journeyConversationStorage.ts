import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import type { JourneyConversation } from "../domain/journeyConversation";

export async function saveJourneyConversation(conversation: JourneyConversation): Promise<void> {
  await invoke("save_journey_conversation", {
    journeyId: conversation.journeyId,
    payload: JSON.stringify(createPersistedJourneyConversation(conversation)),
  });
}

export type MirrorConversationCandidate = {
  id: string;
  code: string;
  title: string;
  startedAt: string;
  lastUpdatedAt: string;
  messageCount: number;
};

export async function listMirrorConversations(journeyId: string): Promise<MirrorConversationCandidate[]> {
  const payload = await invoke<string>("list_mirror_conversations", { journeyId });
  const parsed = JSON.parse(payload) as { conversations?: MirrorConversationCandidate[] };
  return Array.isArray(parsed.conversations) ? parsed.conversations : [];
}

export async function generateMirrorConversationTitle(journeyId: string, conversationId: string): Promise<void> {
  await invoke<string>("generate_mirror_conversation_title", { journeyId, conversationId });
}

export async function reloadJourneyFromMirror(journeyId: string, conversationId?: string): Promise<string> {
  return invoke<string>("reload_journey_from_mirror", { journeyId, conversationId });
}

export async function loadJourneyConversation(journeyId: string): Promise<JourneyConversation | undefined> {
  const payload = await invoke<string | null>("load_journey_conversation", { journeyId });
  if (!payload) {
    return undefined;
  }

  try {
    return parsePersistedJourneyConversation(JSON.parse(payload))?.conversation;
  } catch {
    return undefined;
  }
}
