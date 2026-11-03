import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { JourneySettlementAuthority } from "../domain/journeySettlementAuthority";

/**
 * CR114: the single seam where a bounded surface meets durable storage. Every write path hands
 * over whatever it currently has on screen, which can be only the current chapter, so the stored
 * record is composed rather than replaced: the surface owns the messages it loaded, and everything
 * before them is preserved.
 * CR184: the composing is the native save's (`preserve_durable_conversation_history`), which
 * already reads the stored record. Done here, it read and parsed the whole generation on the main
 * thread before every write.
 */
async function saveProjection(
  conversation: JourneyConversation,
  options: {
    mode: "lifecycle" | "admitted_pre_frontier" | "active_pre_frontier" | "generation_scoped_post_frontier";
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

export async function saveAdmittedTurnProjection(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
): Promise<void> {
  await saveProjection(conversation, { mode: "admitted_pre_frontier", authority });
}

export async function saveActiveSettlementProjection(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
): Promise<void> {
  await saveProjection(conversation, { mode: "active_pre_frontier", authority });
}

export async function savePostFrontierReceiptProjection(
  conversation: JourneyConversation,
  authority: JourneySettlementAuthority,
  outbox: { itemId: string; conversationId: string },
): Promise<void> {
  await saveProjection(conversation, { mode: "generation_scoped_post_frontier", authority, outbox });
}

/**
 * CR184: identity and the turn ledger, with no messages. For the reads that only check durable
 * authority, which used to receive and parse the whole generation to do it.
 */
export async function loadDedicatedJourneyConversationMetadata(
  journeyId: string,
  generation: number,
  threadId: string,
): Promise<JourneyConversation | undefined> {
  const payload = await invoke<string | null>("load_dedicated_journey_conversation_metadata", {
    journeyId, generation, threadId,
  });
  if (!payload) return undefined;
  try {
    return parsePersistedJourneyConversation(JSON.parse(payload))?.conversation;
  } catch {
    return undefined;
  }
}

export async function loadDedicatedJourneyConversation(
  journeyId: string,
  generation: number,
  threadId?: string,
  session?: { sessionId: string; sessionFile: string },
): Promise<JourneyConversation | undefined> {
  void session;
  const payload = await invoke<string | null>("load_dedicated_journey_conversation", {
    journeyId, generation, ...(threadId ? { threadId } : {}),
  });
  if (!payload) return undefined;
  try {
    return parsePersistedJourneyConversation(JSON.parse(payload))?.conversation;
  } catch {
    return undefined;
  }
}
