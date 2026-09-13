import type {
  JourneyConversation,
  SteeringEvidence,
  TerminalAgentActionEvidence,
} from "../../domain/journeyConversation";
import { createDedicatedJourneyConversation } from "../../domain/journeyConversation";
import { readyThread } from "./readyThread";

export const LONG_CONVERSATION_TURN_COUNT = 500;
export const LONG_CONVERSATION_MIN_PROJECTION_CHARS = 10_000_000;

export function createLongConversationFixture(): JourneyConversation {
  const thread = readyThread("mirror-desktop");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const messages: JourneyConversation["messages"] = [];
  const turns: JourneyConversation["reconciliation"]["turns"] = [];
  const terminalAgentActionEvidence: Record<string, TerminalAgentActionEvidence> = {};
  const steeringEvidence: SteeringEvidence[] = [];
  const output = "x".repeat(Math.ceil(LONG_CONVERSATION_MIN_PROJECTION_CHARS / LONG_CONVERSATION_TURN_COUNT));

  for (let index = 1; index <= LONG_CONVERSATION_TURN_COUNT; index += 1) {
    const userMessageId = `long-user-${index}`;
    const assistantMessageId = `long-assistant-${index}`;
    const turnId = `long-turn-${index}`;
    const runId = `long-run-${index}`;
    const createdAt = new Date(Date.UTC(2026, 8, 13, 10, 0, index)).toISOString();
    messages.push(
      { id: userMessageId, role: "user", content: `Request ${index}\n${"context ".repeat(60)}`, createdAt },
      { id: assistantMessageId, role: "assistant", content: `Answer ${index}\n\n${"result ".repeat(60)}`, createdAt },
    );
    turns.push({
      turnId,
      runId,
      origin: "nautilus",
      startedAt: createdAt,
      harness: { state: "committed", userMessageId, assistantMessageId, committedAt: createdAt },
      pi: {
        state: "committed",
        userEntryId: `pi-user-${index}`,
        assistantEntryId: `pi-assistant-${index}`,
        leafEntryId: `pi-assistant-${index}`,
        committedAt: createdAt,
      },
      mirror: {
        state: "committed",
        userMessageId: `mirror-user-${index}`,
        assistantMessageId: `mirror-assistant-${index}`,
        committedAt: createdAt,
      },
    });
    terminalAgentActionEvidence[assistantMessageId] = {
      schemaVersion: "0.1.0",
      journeyId: "mirror-desktop",
      generation: base.liveIdentity.generation,
      runId,
      turnId,
      assistantMessageId,
      projection: {
        status: "completed",
        operations: [{ id: `operation-${index}`, name: "read", status: "completed", output }],
        reasoningSummaries: [{ id: `summary-${index}`, content: `Inspecting turn ${index}`, status: "completed" }],
        activityOrder: [
          { type: "reasoning_summary", id: `summary-${index}` },
          { type: "operation", id: `operation-${index}` },
        ],
      },
    };
    if (index <= 8) {
      steeringEvidence.push({
        schemaVersion: "0.1.0",
        requestId: `long-steering-${index}`,
        sequence: 1,
        journeyId: "mirror-desktop",
        generation: base.liveIdentity.generation,
        runId,
        turnId,
        assistantMessageId,
        text: `Correction ${index}`,
        status: "applied",
        createdAt,
        updatedAt: createdAt,
        piUserEntryId: `pi-steering-${index}`,
      });
    }
  }

  return {
    ...base,
    messages,
    reconciliation: {
      ...base.reconciliation,
      turns,
      classification: "in_sync",
      classifiedAt: "2026-09-13T10:10:00.000Z",
    },
    terminalAgentActionEvidence,
    steeringEvidence,
  };
}
