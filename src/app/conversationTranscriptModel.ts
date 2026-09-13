import type { JourneyConversation, SteeringEvidence, TerminalAgentActionEvidence } from "../domain/journeyConversation";
import { indexExactTerminalAgentActionEvidence } from "./terminalAgentActionEvidence";

type ReconciliationTurn = JourneyConversation["reconciliation"]["turns"][number];

export type ConversationTranscriptIndex = {
  turnByUserMessageId: ReadonlyMap<string, ReconciliationTurn>;
  steeringByAssistantMessageId: ReadonlyMap<string, SteeringEvidence[]>;
  terminalEvidenceByAssistantMessageId: ReadonlyMap<string, TerminalAgentActionEvidence>;
};

export function buildConversationTranscriptIndex(
  conversation: JourneyConversation,
): ConversationTranscriptIndex {
  const turnByUserMessageId = new Map<string, ReconciliationTurn>();
  for (const turn of conversation.reconciliation.turns) {
    if (turn.harness.userMessageId) {
      turnByUserMessageId.set(turn.harness.userMessageId, turn);
    }
  }

  const steeringByAssistantMessageId = new Map<string, SteeringEvidence[]>();
  for (const evidence of conversation.steeringEvidence ?? []) {
    const current = steeringByAssistantMessageId.get(evidence.assistantMessageId) ?? [];
    current.push(evidence);
    steeringByAssistantMessageId.set(evidence.assistantMessageId, current);
  }
  for (const evidence of steeringByAssistantMessageId.values()) {
    evidence.sort((left, right) => left.sequence - right.sequence);
  }

  return {
    turnByUserMessageId,
    steeringByAssistantMessageId,
    terminalEvidenceByAssistantMessageId: indexExactTerminalAgentActionEvidence(conversation),
  };
}
