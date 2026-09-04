import type { NautilusViewModel } from "../domain/nautilusViewModel";
import type { LiveConversationIdentity } from "../domain/journeyConversation";
import type { ConversationAttachmentProvenance } from "../domain/contextAttachments";
import type { AgentFileReference, FileAttachment } from "../domain/fileAttachments";

export type PiTaskOperation = "extract_mission" | "refine_mission" | "summarize_state";

export type PiTaskSafetyMode = "manual_handoff" | "read_only_local_process";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: Array<ConversationAttachmentProvenance | FileAttachment>;
};

export type MissionDraft = {
  id?: string;
  title?: string;
  purpose?: string;
  status: "draft" | "formulated";
};

export type NautilusGrammarState = {
  identity: {
    name: "Nautilus";
    methodVersion: string;
    protocolVersion: string;
    schemaVersion: string;
    grammarStatus: "experimental";
  };
  missionDraft?: MissionDraft;
};

export type PiTaskPacket = {
  schemaVersion: "0.1.0";
  operation: PiTaskOperation;
  safetyMode: PiTaskSafetyMode;
  conversation: ConversationMessage[];
  currentState: NautilusGrammarState;
  journeyId?: string;
  liveConversation?: LiveConversationIdentity;
  fileAttachments?: AgentFileReference[];
  instruction: string;
  constraints: string[];
};

export type PiGrammarUpdate = {
  missionDraft?: MissionDraft;
  openQuestions: string[];
  confidence: "low" | "medium" | "high";
};

export type PiTaskResponse = {
  schemaVersion: "0.1.0";
  status: "ok" | "needs_clarification" | "blocked";
  assistantMessage: ConversationMessage;
  grammarUpdate: PiGrammarUpdate;
  warnings: string[];
  requestedNextAction?: string;
};

export function grammarStateFromViewModel(model: NautilusViewModel): NautilusGrammarState {
  return {
    identity: {
      name: "Nautilus",
      methodVersion: model.identity.methodVersion,
      protocolVersion: model.identity.protocolVersion,
      schemaVersion: model.identity.schemaVersion,
      grammarStatus: "experimental",
    },
    missionDraft: model.mission
      ? {
          id: model.mission.id,
          title: model.mission.title,
          purpose: model.mission.purpose,
          status: "formulated",
        }
      : undefined,
  };
}

export function createUserConversationMessage(content: string, createdAt: Date = new Date()): ConversationMessage {
  return {
    id: `user-${createdAt.toISOString()}`,
    role: "user",
    content,
    createdAt: createdAt.toISOString(),
  };
}

export function createMissionExtractionPacket(input: {
  conversation: ConversationMessage[];
  currentState: NautilusGrammarState;
  journeyId?: string;
  liveConversation?: LiveConversationIdentity;
  fileAttachments?: AgentFileReference[];
}): PiTaskPacket {
  return {
    schemaVersion: "0.1.0",
    operation: "extract_mission",
    safetyMode: "manual_handoff",
    conversation: input.conversation,
    currentState: input.currentState,
    journeyId: input.journeyId,
    liveConversation: input.liveConversation,
    ...(input.fileAttachments?.length ? { fileAttachments: input.fileAttachments } : {}),
    instruction:
      "Interpret the conversation and return a Nautilus Mission draft as structured data. Do not execute the Mission.",
    constraints: [
      "Do not execute commands.",
      "Do not mutate files.",
      "Do not require Mirror context.",
      "Do not invoke Pi automatically from Mirror Desktop.",
      "Return a structured Mission draft and an assistant message.",
      "Preserve uncertainty with open questions when the Mission is underspecified.",
      ...(input.fileAttachments?.length
        ? ["Use the explicitly selected file paths as references; decide with available tools whether and how to read them."]
        : []),
    ],
  };
}
