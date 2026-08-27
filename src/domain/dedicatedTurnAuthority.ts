import type { TurnCorrelation } from "../agent/agentStream";
import { classifyNautilusJourneyThread, type NautilusJourneyThread } from "./nautilusJourneyThread";

export type DedicatedTurnAuthorityReason =
  | "thread_not_ready"
  | "journey_mismatch"
  | "thread_mismatch"
  | "generation_mismatch"
  | "pi_session_mismatch"
  | "mirror_conversation_mismatch"
  | "activation_receipt_mismatch";

export function createDedicatedTurnAuthority(
  thread: NautilusJourneyThread,
  runId: string,
  turnId: string,
  userMessageId: string,
  assistantMessageId: string,
): TurnCorrelation {
  const readiness = classifyNautilusJourneyThread(thread, thread.journeyId);
  if (readiness.kind !== "ready") throw new Error("Dedicated Journey thread is not ready for invocation.");
  return {
    schemaVersion: "0.2.0",
    journeyId: thread.journeyId,
    threadId: thread.threadId,
    harnessConversationId: thread.threadId,
    piSessionId: readiness.activeGeneration.piSessionId,
    mirrorConversationId: readiness.activeGeneration.mirrorConversationId,
    generation: readiness.activeGeneration.generation,
    activationReceiptActivatedAt: readiness.activeGeneration.activationReceipt!.activatedAt,
    turnId,
    runId,
    harnessUserMessageId: userMessageId,
    harnessAssistantMessageId: assistantMessageId,
  };
}

export function validateDedicatedTurnAuthority(
  authority: TurnCorrelation,
  thread: NautilusJourneyThread,
  selectedJourneyId: string,
): { valid: boolean; reasonCodes: DedicatedTurnAuthorityReason[] } {
  const reasons: DedicatedTurnAuthorityReason[] = [];
  const readiness = classifyNautilusJourneyThread(thread, selectedJourneyId);
  if (readiness.kind !== "ready") return { valid: false, reasonCodes: ["thread_not_ready"] };
  if (authority.journeyId !== selectedJourneyId) reasons.push("journey_mismatch");
  if (authority.threadId !== thread.threadId || authority.harnessConversationId !== thread.threadId) reasons.push("thread_mismatch");
  if (authority.generation !== readiness.activeGeneration.generation) reasons.push("generation_mismatch");
  if (authority.piSessionId !== readiness.activeGeneration.piSessionId) reasons.push("pi_session_mismatch");
  if (authority.mirrorConversationId !== readiness.activeGeneration.mirrorConversationId) reasons.push("mirror_conversation_mismatch");
  if (authority.activationReceiptActivatedAt !== readiness.activeGeneration.activationReceipt?.activatedAt) reasons.push("activation_receipt_mismatch");
  return { valid: reasons.length === 0, reasonCodes: reasons };
}
