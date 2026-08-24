import { invoke } from "@tauri-apps/api/core";
import type { JourneyConversation } from "../domain/journeyConversation";
import type {
  MirrorConversationInspection,
  MirrorSnapshotFingerprint,
} from "../domain/mirrorOnlyReconciliation";

export async function inspectMirrorConversationActivity(
  conversation: JourneyConversation,
): Promise<MirrorConversationInspection | undefined> {
  const mirror = conversation.reconciliation.checkpoints.mirror;
  const conversationId = conversation.liveIdentity.mirrorConversationId;
  if (!mirror || !conversationId) return undefined;
  const payload = await invoke<string>("inspect_mirror_conversation_activity", {
    journeyId: conversation.journeyId,
    conversationId,
    baseMessageId: mirror.lastMessageId,
    baseMessageCount: mirror.messageCount,
  });
  return JSON.parse(payload) as MirrorConversationInspection;
}

export async function reconcileMirrorConversation(input: {
  conversation: JourneyConversation;
  fingerprint: MirrorSnapshotFingerprint;
  provider: string;
  model: string;
}): Promise<string> {
  return invoke<string>("reconcile_mirror_conversation", {
    journeyId: input.conversation.journeyId,
    expectedGeneration: input.conversation.liveIdentity.generation,
    expectedFingerprint: input.fingerprint,
    provider: input.provider,
    model: input.model,
  });
}
