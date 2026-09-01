import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { JourneySettlementAuthority } from "../domain/journeySettlementAuthority";

async function saveProjection(
  conversation: JourneyConversation,
  options: {
    mode: "lifecycle" | "active_pre_frontier" | "active_pre_frontier_rollback" | "generation_scoped_post_frontier";
    authority?: JourneySettlementAuthority;
    outbox?: { itemId: string; conversationId: string };
  },
): Promise<void> {
  await invoke("save_dedicated_journey_conversation", {
    journeyId: conversation.journeyId,
    generation: conversation.liveIdentity.generation,
    payload: JSON.stringify(createPersistedJourneyConversation(conversation)),
    mode: options.mode,
    runAuthority: options.authority?.runAuthority,
    outboxItemId: options.outbox?.itemId,
    outboxConversationId: options.outbox?.conversationId,
  });
}

export async function saveDedicatedJourneyConversation(conversation: JourneyConversation): Promise<void> {
  await saveProjection(conversation, { mode: "lifecycle" });
}

export async function saveActiveSettlementProjection(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
): Promise<void> {
  await saveProjection(conversation, { mode: "active_pre_frontier", authority });
}

export async function saveRejectedReservationRollback(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
): Promise<void> {
  await saveProjection(conversation, { mode: "active_pre_frontier_rollback", authority });
}

export async function savePostFrontierReceiptProjection(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
  outbox: { itemId: string; conversationId: string },
): Promise<void> {
  await saveProjection(conversation, { mode: "generation_scoped_post_frontier", authority, outbox });
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
