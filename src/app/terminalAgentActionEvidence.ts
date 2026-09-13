import type { TurnCorrelation } from "../agent/agentStream";
import { stripAnsiControlSequences } from "../agent/terminalText";
import type {
  JourneyConversation,
  TerminalAgentActionEvidence,
  TerminalAgentActionProjection,
} from "../domain/journeyConversation";
import type { RuntimeProjectionState } from "./runtimeActivityModel";

export function createTerminalAgentActionEvidence(input: {
  correlation: TurnCorrelation;
  projection: RuntimeProjectionState;
  terminalStatus?: "completed" | "cancelled" | "failed";
}): TerminalAgentActionEvidence {
  const terminalStatus = input.terminalStatus ?? input.projection.status;
  if (terminalStatus === "starting" || terminalStatus === "working") {
    throw new Error("terminal_agent_action_evidence_requires_settled_projection");
  }
  const projection: TerminalAgentActionProjection = {
    status: terminalStatus,
    operations: input.projection.operations.map((operation) => ({
      ...operation,
      status: operation.status === "preparing" || operation.status === "running"
        ? terminalStatus === "failed" ? "failed" : "interrupted"
        : operation.status,
      ...(operation.output !== undefined ? { output: stripAnsiControlSequences(operation.output) } : {}),
    })),
    reasoningSummaries: input.projection.reasoningSummaries.map((summary) => ({
      ...summary,
      status: summary.status === "streaming" ? "interrupted" : summary.status,
    })),
    activityOrder: input.projection.activityOrder.map((reference) => ({ ...reference })),
    ...(input.projection.terminalMessage ? { terminalMessage: input.projection.terminalMessage } : {}),
  };
  return {
    schemaVersion: "0.1.0",
    journeyId: input.correlation.journeyId,
    generation: input.correlation.generation,
    runId: input.correlation.runId,
    turnId: input.correlation.turnId,
    assistantMessageId: input.correlation.harnessAssistantMessageId,
    projection,
  };
}

export function attachTerminalAgentActionEvidence(
  conversation: JourneyConversation,
  evidence: TerminalAgentActionEvidence,
): JourneyConversation {
  if (!evidenceMatchesConversation(conversation, evidence, evidence.assistantMessageId)) {
    throw new Error("terminal_agent_action_evidence_authority_mismatch");
  }
  return {
    ...conversation,
    terminalAgentActionEvidence: {
      ...conversation.terminalAgentActionEvidence,
      [evidence.assistantMessageId]: evidence,
    },
  };
}

export function indexExactTerminalAgentActionEvidence(
  conversation: JourneyConversation,
): ReadonlyMap<string, TerminalAgentActionEvidence> {
  const result = new Map<string, TerminalAgentActionEvidence>();
  const turnByAssistantMessageId = new Map(
    conversation.reconciliation.turns.map((turn) => [turn.harness.assistantMessageId, turn]),
  );
  for (const [assistantMessageId, evidence] of Object.entries(conversation.terminalAgentActionEvidence ?? {})) {
    const turn = turnByAssistantMessageId.get(assistantMessageId);
    if (evidenceMatchesConversation(conversation, evidence, assistantMessageId, turn)) {
      result.set(assistantMessageId, evidence);
    }
  }
  return result;
}

export function selectExactTerminalAgentActionEvidence(
  conversation: JourneyConversation,
  assistantMessageId: string,
): TerminalAgentActionEvidence | undefined {
  const evidence = conversation.terminalAgentActionEvidence?.[assistantMessageId];
  return evidence && evidenceMatchesConversation(conversation, evidence, assistantMessageId)
    ? evidence
    : undefined;
}

function evidenceMatchesConversation(
  conversation: JourneyConversation,
  evidence: TerminalAgentActionEvidence,
  assistantMessageId: string,
  indexedTurn?: JourneyConversation["reconciliation"]["turns"][number],
): boolean {
  const turn = indexedTurn ?? conversation.reconciliation.turns.find((candidate) => (
    candidate.harness.assistantMessageId === assistantMessageId
  ));
  return Boolean(turn
      && turn.turnId === evidence.turnId
      && turn.runId === evidence.runId)
    && evidence.schemaVersion === "0.1.0"
    && evidence.assistantMessageId === assistantMessageId
    && evidence.journeyId === conversation.journeyId
    && evidence.journeyId === conversation.liveIdentity.journeyId
    && evidence.generation === conversation.liveIdentity.generation;
}
