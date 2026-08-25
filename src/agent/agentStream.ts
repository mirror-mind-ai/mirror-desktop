import type { PiGrammarUpdate, PiTaskPacket } from "./piTaskPacket";

export type AgentRunStatus = "starting" | "working" | "completed";
export type AgentOperationStatus = "preparing" | "running" | "completed" | "failed" | "interrupted";

export type TurnCorrelation = {
  schemaVersion: "0.1.0";
  journeyId: string;
  harnessConversationId: string;
  piSessionId: string;
  generation: number;
  turnId: string;
  runId: string;
  harnessUserMessageId: string;
  harnessAssistantMessageId: string;
  mirrorConversationId?: string;
};

export type MirrorCommitEvent = {
  phase: "user" | "assistant";
  status: "committed" | "failed";
  turnId: string;
  runId: string;
  mirrorConversationId?: string;
  mirrorMessageId?: string;
  mirrorMessageCount?: number;
  reasonCode?: string;
  piUserEntryId?: string;
  piEvidence?: {
    userEntryId?: string;
    assistantEntryId?: string;
    leafEntryId?: string;
    entryCount: number;
    sessionFile?: string;
  };
};

export type AgentStreamEvent =
  | { type: "message_delta"; content: string }
  | { type: "reasoning_summary_start" }
  | { type: "reasoning_summary_delta"; content: string }
  | { type: "reasoning_summary_end" }
  | { type: "raw_output"; content: string }
  | { type: "run_status"; status: AgentRunStatus }
  | {
      type: "operation_update";
      operation: {
        id: string;
        kind?: "tool" | "skill" | "compaction";
        name: string;
        status: AgentOperationStatus;
        arguments?: unknown;
        output?: string;
        isError?: boolean;
      };
    }
  | {
      type: "context_usage";
      usage: { tokens: number | null; contextWindow: number | null; percent: number | null };
    }
  | { type: "mirror_commit"; commit: MirrorCommitEvent }
  | { type: "persona_context"; persona: string }
  | { type: "diagnostic"; message: string }
  | { type: "grammar_update"; update: PiGrammarUpdate }
  | { type: "warning"; message: string }
  | { type: "cancelled"; message: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type AgentStreamProvider = (packet: PiTaskPacket) => AsyncGenerator<AgentStreamEvent>;

export async function* mockPiAgentStream(packet: PiTaskPacket): AsyncGenerator<AgentStreamEvent> {
  const latestUserMessage = [...packet.conversation].reverse().find((message) => message.role === "user");
  const intention = latestUserMessage?.content ?? "this journey intention";

  yield { type: "message_delta", content: "I am reading the journey intention. " };
  await delay(160);
  yield { type: "message_delta", content: "For now, I will not execute anything. " };
  await delay(160);
  yield {
    type: "message_delta",
    content: "I will treat this as a candidate Mission for Pi to interpret safely. ",
  };
  await delay(160);
  yield {
    type: "grammar_update",
    update: {
      missionDraft: {
        id: "mission-draft-001",
        title: summarizeIntention(intention),
        purpose: intention,
        status: "draft",
      },
      openQuestions: ["What would make this intention clear enough to be formulated?"],
      confidence: "medium",
    },
  };
  await delay(80);
  yield { type: "done" };
}

export function reduceStreamedAssistantMessage(current: string, event: AgentStreamEvent): string {
  if (event.type !== "message_delta") {
    return current;
  }
  return `${current}${event.content}`;
}

function summarizeIntention(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 72) {
    return trimmed;
  }
  return `${trimmed.slice(0, 69)}...`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
