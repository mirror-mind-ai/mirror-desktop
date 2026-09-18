import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { JourneySettlementAuthority } from "../domain/journeySettlementAuthority";
import { partitionConversationBySegments } from "../domain/conversationSegmentProjection";
import {
  loadConversationSegments,
  loadCurrentConversationSegmentProjection,
  publishConversationSegmentProjections,
} from "./conversationSegmentStorage";

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

export async function loadDedicatedJourneyConversation(
  journeyId: string,
  generation: number,
  threadId?: string,
  session?: { sessionId: string; sessionFile: string },
): Promise<JourneyConversation | undefined> {
  const segmentAuthority = threadId && session
    ? { journeyId, threadId, generation, ...session }
    : undefined;
  if (segmentAuthority) {
    const current = await loadCurrentConversationSegmentProjection(segmentAuthority).catch(() => undefined);
    if (current) return current;
  }
  const payload = await invoke<string | null>("load_dedicated_journey_conversation", {
    journeyId, generation, ...(threadId ? { threadId } : {}),
  });
  if (!payload) return undefined;
  try {
    const conversation = parsePersistedJourneyConversation(JSON.parse(payload))?.conversation;
    if (!conversation || !segmentAuthority) return conversation;
    const manifest = await loadConversationSegments(segmentAuthority);
    if (!manifest) return conversation;
    const projections = partitionConversationBySegments(conversation, manifest);
    await publishConversationSegmentProjections(segmentAuthority, projections);
    return projections[projections.length - 1]?.conversation;
  } catch {
    return undefined;
  }
}
