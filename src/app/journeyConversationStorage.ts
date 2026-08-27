import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import type { JourneyConversation } from "../domain/journeyConversation";

export async function saveDedicatedJourneyConversation(conversation: JourneyConversation): Promise<void> {
  await invoke("save_dedicated_journey_conversation", {
    journeyId: conversation.journeyId,
    generation: conversation.liveIdentity.generation,
    payload: JSON.stringify(createPersistedJourneyConversation(conversation)),
  });
}

export async function loadDedicatedJourneyConversation(journeyId: string, generation: number): Promise<JourneyConversation | undefined> {
  const payload = await invoke<string | null>("load_dedicated_journey_conversation", { journeyId, generation });
  if (!payload) return undefined;
  try {
    return parsePersistedJourneyConversation(JSON.parse(payload))?.conversation;
  } catch {
    return undefined;
  }
}
