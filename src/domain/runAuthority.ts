import type { TurnCorrelation } from "../agent/agentStream";
import type { LiveConversationIdentity } from "./journeyConversation";
import type { NautilusThreadGeneration } from "./nautilusJourneyThread";

export type RunAuthority = {
  readonly schemaVersion: "0.1.0";
  readonly correlation: TurnCorrelation;
  readonly journeyId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly threadId: string;
  readonly harnessConversationId: string;
  readonly generation: number;
  readonly piSessionId: string;
  readonly piSessionFile: string;
  readonly mirrorConversationId: string;
  readonly activationReceiptActivatedAt: string;
  readonly harnessUserMessageId: string;
  readonly harnessAssistantMessageId: string;
  readonly eventAuthority: PiProcessEventAuthority;
};

export type PiProcessEventAuthority = {
  readonly schemaVersion: "0.1.0";
  readonly journeyId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly threadId: string;
  readonly generation: number;
  readonly piSessionId: string;
  readonly mirrorConversationId: string;
  readonly harnessUserMessageId: string;
  readonly harnessAssistantMessageId: string;
};

export function createRunAuthority(
  correlation: TurnCorrelation,
  liveIdentity: LiveConversationIdentity,
  activeGeneration?: NautilusThreadGeneration,
): RunAuthority {
  if (correlation.schemaVersion !== "0.2.0") throw new Error("run_authority_correlation_schema_unsupported");
  if (!correlation.threadId) throw new Error("run_authority_thread_missing");
  if (!correlation.mirrorConversationId) throw new Error("run_authority_mirror_conversation_missing");
  if (!correlation.activationReceiptActivatedAt) throw new Error("run_authority_activation_receipt_missing");
  const piSessionFile = activeGeneration?.piSessionFile ?? liveIdentity.piSessionFile;
  if (!piSessionFile) throw new Error("run_authority_pi_session_file_missing");
  if (correlation.journeyId !== liveIdentity.journeyId) throw new Error("run_authority_journey_mismatch");
  if (correlation.harnessConversationId !== liveIdentity.harnessConversationId) throw new Error("run_authority_thread_mismatch");
  if (correlation.threadId !== liveIdentity.harnessConversationId) throw new Error("run_authority_thread_mismatch");
  if (correlation.generation !== liveIdentity.generation) throw new Error("run_authority_generation_mismatch");
  if (correlation.piSessionId !== liveIdentity.piSessionId) throw new Error("run_authority_pi_session_mismatch");
  if (correlation.mirrorConversationId !== liveIdentity.mirrorConversationId) throw new Error("run_authority_mirror_conversation_mismatch");
  if (correlation.activationReceiptActivatedAt !== liveIdentity.activationReceiptActivatedAt) {
    throw new Error("run_authority_activation_receipt_mismatch");
  }
  if (activeGeneration) {
    if (activeGeneration.status !== "ready") throw new Error("run_authority_generation_not_ready");
    if (activeGeneration.generation !== liveIdentity.generation) throw new Error("run_authority_generation_mismatch");
    if (activeGeneration.piSessionId !== liveIdentity.piSessionId) throw new Error("run_authority_pi_session_mismatch");
    if (activeGeneration.piSessionFile !== liveIdentity.piSessionFile) throw new Error("run_authority_pi_session_file_mismatch");
    if (activeGeneration.mirrorConversationId !== liveIdentity.mirrorConversationId) throw new Error("run_authority_mirror_conversation_mismatch");
    if (activeGeneration.activationReceipt?.activatedAt !== liveIdentity.activationReceiptActivatedAt) {
      throw new Error("run_authority_activation_receipt_mismatch");
    }
  }
  const eventAuthority: PiProcessEventAuthority = Object.freeze({
    schemaVersion: "0.1.0",
    journeyId: correlation.journeyId,
    runId: correlation.runId,
    turnId: correlation.turnId,
    threadId: correlation.threadId,
    generation: correlation.generation,
    piSessionId: correlation.piSessionId,
    mirrorConversationId: correlation.mirrorConversationId,
    harnessUserMessageId: correlation.harnessUserMessageId,
    harnessAssistantMessageId: correlation.harnessAssistantMessageId,
  });
  return Object.freeze({
    schemaVersion: "0.1.0",
    correlation: Object.freeze({ ...correlation }),
    journeyId: correlation.journeyId,
    runId: correlation.runId,
    turnId: correlation.turnId,
    threadId: correlation.threadId,
    harnessConversationId: correlation.harnessConversationId,
    generation: correlation.generation,
    piSessionId: correlation.piSessionId,
    piSessionFile,
    mirrorConversationId: correlation.mirrorConversationId,
    activationReceiptActivatedAt: correlation.activationReceiptActivatedAt,
    harnessUserMessageId: correlation.harnessUserMessageId,
    harnessAssistantMessageId: correlation.harnessAssistantMessageId,
    eventAuthority,
  });
}

export function samePiProcessEventAuthority(
  left: PiProcessEventAuthority | undefined,
  right: RunAuthority,
): boolean {
  return Boolean(left)
    && left?.schemaVersion === "0.1.0"
    && left.journeyId === right.journeyId
    && left.runId === right.runId
    && left.turnId === right.turnId
    && left.threadId === right.threadId
    && left.generation === right.generation
    && left.piSessionId === right.piSessionId
    && left.mirrorConversationId === right.mirrorConversationId
    && left.harnessUserMessageId === right.harnessUserMessageId
    && left.harnessAssistantMessageId === right.harnessAssistantMessageId;
}
