import {
  cancelAgentRun,
  initialAgentRunState,
  reduceAgentRunFromStreamEvent,
  type AgentRunState,
} from "../agent/agentRun";
import type { AgentStreamEvent } from "../agent/agentStream";
import type { NormalizedPiResponse } from "../agent/piResponseNormalizer";
import type { MissionDraft } from "../agent/piTaskPacket";
import type { RunAuthority } from "../domain/runAuthority";
import {
  initialRuntimeProjectionState,
  reduceRuntimeProjection,
  type RuntimeProjectionState,
} from "./runtimeActivityModel";

const QUARANTINE_LIMIT = 20;

export type JourneyRunIdentity =
  | { readonly kind: "live"; readonly authority: RunAuthority }
  | { readonly kind: "mock"; readonly journeyId: string; readonly runId: string };

export type JourneyRuntimeEntry = {
  journeyId: string;
  identity?: JourneyRunIdentity;
  agentRun: AgentRunState;
  isStreaming: boolean;
  isFinalizingTurn: boolean;
  mode?: "mock" | "live";
  missionDraft?: MissionDraft;
  warnings: string[];
  diagnostics: string[];
  safety?: NormalizedPiResponse["safety"];
  runtimeProjection: RuntimeProjectionState;
  runtimeProjectionMessageId?: string;
  streamedAssistantContent: string;
};

export type JourneyRuntimeQuarantineItem = {
  journeyId: string;
  runId: string;
  reason: "authority_mismatch" | "unknown_run" | "serial_capacity_rejected";
};

export type JourneyRuntimeState = {
  entries: Record<string, JourneyRuntimeEntry>;
  quarantine: JourneyRuntimeQuarantineItem[];
};

type RuntimePatch = Partial<Pick<JourneyRuntimeEntry,
  | "agentRun"
  | "isStreaming"
  | "isFinalizingTurn"
  | "mode"
  | "missionDraft"
  | "warnings"
  | "diagnostics"
  | "safety"
  | "runtimeProjection"
  | "runtimeProjectionMessageId"
  | "streamedAssistantContent"
>>;

export type JourneyRuntimeAction =
  | { type: "register"; identity: JourneyRunIdentity; run: AgentRunState; assistantMessageId: string }
  | { type: "stream_started"; identity: JourneyRunIdentity }
  | { type: "stream_event"; identity: JourneyRunIdentity; event: AgentStreamEvent }
  | { type: "stream_finished"; identity: JourneyRunIdentity }
  | { type: "cancel_requested"; identity: JourneyRunIdentity; message: string }
  | { type: "finalization_started"; identity: JourneyRunIdentity }
  | { type: "finalization_finished"; identity: JourneyRunIdentity }
  | { type: "patch"; journeyId: string; identity?: JourneyRunIdentity; patch: RuntimePatch }
  | { type: "append_warning"; journeyId: string; identity?: JourneyRunIdentity; message: string }
  | { type: "reset"; journeyId: string }
  | { type: "cleanup"; identity: JourneyRunIdentity };

export function createInitialJourneyRuntimeState(): JourneyRuntimeState {
  return { entries: {}, quarantine: [] };
}

export function createEmptyJourneyRuntime(journeyId: string): JourneyRuntimeEntry {
  return {
    journeyId,
    agentRun: initialAgentRunState,
    isStreaming: false,
    isFinalizingTurn: false,
    warnings: [],
    diagnostics: [],
    runtimeProjection: initialRuntimeProjectionState,
    streamedAssistantContent: "",
  };
}

export function journeyRuntimeReducer(
  state: JourneyRuntimeState,
  action: JourneyRuntimeAction,
): JourneyRuntimeState {
  if (action.type === "register") {
    const journeyId = identityJourneyId(action.identity);
    if (hasActiveOrFinalizingJourneyRuntime(state)) {
      return quarantine(state, action.identity, "serial_capacity_rejected");
    }
    return {
      ...state,
      entries: {
        ...state.entries,
        [journeyId]: {
          ...createEmptyJourneyRuntime(journeyId),
          identity: action.identity,
          agentRun: action.run,
          isStreaming: true,
          mode: action.identity.kind === "live" ? "live" : "mock",
          runtimeProjectionMessageId: action.assistantMessageId,
        },
      },
    };
  }

  if (action.type === "patch" || action.type === "append_warning") {
    const current = state.entries[action.journeyId] ?? createEmptyJourneyRuntime(action.journeyId);
    if (action.identity && !sameJourneyRunIdentity(current.identity, action.identity)) {
      return quarantine(state, action.identity, current.identity ? "authority_mismatch" : "unknown_run");
    }
    return replaceEntry(state, action.type === "patch"
      ? { ...current, ...action.patch }
      : { ...current, warnings: [...current.warnings, action.message] });
  }

  if (action.type === "reset") {
    const current = state.entries[action.journeyId];
    if (!current) return state;
    if (current.isStreaming || current.isFinalizingTurn || current.agentRun.status === "running") return state;
    const entries = { ...state.entries };
    delete entries[action.journeyId];
    return { ...state, entries };
  }

  const identity = action.identity;
  const journeyId = identityJourneyId(identity);
  const current = state.entries[journeyId];
  if (!current) return quarantine(state, identity, "unknown_run");
  if (!sameJourneyRunIdentity(current.identity, identity)) {
    return quarantine(state, identity, "authority_mismatch");
  }

  if (action.type === "stream_started") {
    return replaceEntry(state, { ...current, isStreaming: true });
  }
  if (action.type === "stream_finished") {
    return replaceEntry(state, { ...current, isStreaming: false });
  }
  if (action.type === "cancel_requested") {
    return replaceEntry(state, {
      ...current,
      agentRun: cancelAgentRun(current.agentRun),
      runtimeProjection: reduceRuntimeProjection(
        current.runtimeProjection,
        { type: "cancelled", message: action.message },
      ),
    });
  }
  if (action.type === "finalization_started") {
    return replaceEntry(state, { ...current, isFinalizingTurn: true });
  }
  if (action.type === "finalization_finished") {
    return replaceEntry(state, { ...current, isFinalizingTurn: false });
  }
  if (action.type === "cleanup") {
    if (current.isStreaming || current.isFinalizingTurn || current.agentRun.status === "running") return state;
    const entries = { ...state.entries };
    delete entries[journeyId];
    return { ...state, entries };
  }

  return replaceEntry(state, reduceEntryFromStreamEvent(current, action.event));
}

export function selectJourneyRuntime(state: JourneyRuntimeState, journeyId: string): JourneyRuntimeEntry {
  return state.entries[journeyId] ?? createEmptyJourneyRuntime(journeyId);
}

export function hasActiveOrFinalizingJourneyRuntime(state: JourneyRuntimeState): boolean {
  return Object.values(state.entries).some((entry) =>
    entry.isStreaming || entry.isFinalizingTurn || entry.agentRun.status === "running",
  );
}

export function identityJourneyId(identity: JourneyRunIdentity): string {
  return identity.kind === "live" ? identity.authority.journeyId : identity.journeyId;
}

export function identityRunId(identity: JourneyRunIdentity): string {
  return identity.kind === "live" ? identity.authority.runId : identity.runId;
}

export function sameJourneyRunIdentity(
  left: JourneyRunIdentity | undefined,
  right: JourneyRunIdentity | undefined,
): boolean {
  if (!left || !right || left.kind !== right.kind) return false;
  if (left.kind === "mock" && right.kind === "mock") {
    return left.journeyId === right.journeyId && left.runId === right.runId;
  }
  if (left.kind === "live" && right.kind === "live") {
    const a = left.authority;
    const b = right.authority;
    return a.journeyId === b.journeyId
      && a.runId === b.runId
      && a.turnId === b.turnId
      && a.threadId === b.threadId
      && a.generation === b.generation
      && a.piSessionId === b.piSessionId
      && a.mirrorConversationId === b.mirrorConversationId
      && a.harnessUserMessageId === b.harnessUserMessageId
      && a.harnessAssistantMessageId === b.harnessAssistantMessageId;
  }
  return false;
}

function reduceEntryFromStreamEvent(entry: JourneyRuntimeEntry, event: AgentStreamEvent): JourneyRuntimeEntry {
  let next: JourneyRuntimeEntry = {
    ...entry,
    agentRun: reduceAgentRunFromStreamEvent(entry.agentRun, event),
    runtimeProjection: reduceRuntimeProjection(entry.runtimeProjection, event),
  };
  if (event.type === "message_delta") {
    next = { ...next, streamedAssistantContent: `${entry.streamedAssistantContent}${event.content}` };
  } else if (event.type === "diagnostic") {
    next = { ...next, diagnostics: [...entry.diagnostics, event.message] };
  } else if (event.type === "grammar_update") {
    next = { ...next, missionDraft: event.update.missionDraft, warnings: event.update.openQuestions };
  } else if (event.type === "warning" || event.type === "cancelled" || event.type === "error") {
    next = { ...next, warnings: [...entry.warnings, event.message] };
  }
  return next;
}

function replaceEntry(state: JourneyRuntimeState, entry: JourneyRuntimeEntry): JourneyRuntimeState {
  return { ...state, entries: { ...state.entries, [entry.journeyId]: entry } };
}

function quarantine(
  state: JourneyRuntimeState,
  identity: JourneyRunIdentity,
  reason: JourneyRuntimeQuarantineItem["reason"],
): JourneyRuntimeState {
  const item: JourneyRuntimeQuarantineItem = {
    journeyId: identityJourneyId(identity),
    runId: identityRunId(identity),
    reason,
  };
  return { ...state, quarantine: [...state.quarantine, item].slice(-QUARANTINE_LIMIT) };
}
