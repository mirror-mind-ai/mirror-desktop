import type { JourneyConversation, SteeringEvidence, TerminalAgentActionEvidence, TerminalAgentActionProjection } from "../domain/journeyConversation";
import { indexExactTerminalAgentActionEvidence } from "./terminalAgentActionEvidence";

type ReconciliationTurn = JourneyConversation["reconciliation"]["turns"][number];

export type ConversationTranscriptIndex = {
  turnByUserMessageId: ReadonlyMap<string, ReconciliationTurn>;
  steeringByAssistantMessageId: ReadonlyMap<string, SteeringEvidence[]>;
  terminalEvidenceByAssistantMessageId: ReadonlyMap<string, TerminalAgentActionEvidence>;
  reconstructedProjectionByAssistantMessageId: ReadonlyMap<string, TerminalAgentActionProjection>;
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
  // CR097: a correction names the harness assistant message of the run it corrected. For a run that
  // was cancelled that message never existed, so the projection says which message stands in for it
  // and the correction is drawn there instead of nowhere.
  const correctionAnchors = conversation.correctionAnchors ?? {};
  for (const evidence of conversation.steeringEvidence ?? []) {
    const key = correctionAnchors[evidence.assistantMessageId] ?? evidence.assistantMessageId;
    const current = steeringByAssistantMessageId.get(key) ?? [];
    current.push(evidence);
    steeringByAssistantMessageId.set(key, current);
  }
  for (const evidence of steeringByAssistantMessageId.values()) {
    evidence.sort((left, right) => left.sequence - right.sequence);
  }

  return {
    turnByUserMessageId,
    steeringByAssistantMessageId,
    terminalEvidenceByAssistantMessageId: indexExactTerminalAgentActionEvidence(conversation),
    reconstructedProjectionByAssistantMessageId: new Map(
      Object.entries(conversation.reconstructedAgentActions ?? {}),
    ),
  };
}
