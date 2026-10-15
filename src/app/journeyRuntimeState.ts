import {
  cancelAgentRun,
  initialAgentRunState,
  reduceAgentRunFromStreamEvent,
  type AgentRunState,
} from "../agent/agentRun";
import { reduceStreamedAssistantMessage, type AgentStreamEvent } from "../agent/agentStream";
import type { NormalizedPiResponse } from "../agent/piResponseNormalizer";
import type { MissionDraft } from "../agent/piTaskPacket";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { RunAuthority } from "../domain/runAuthority";
import {
  initialRuntimeProjectionState,
  reduceRuntimeProjection,
  type RuntimeProjectionState,
} from "./runtimeActivityModel";
import {
  journeyWorkspace,
  runtimeWorkspaceKey,
  workspaceOfAuthority,
  type JourneyWorkspace,
} from "../domain/journeyWorkspaceKey";

const QUARANTINE_LIMIT = 20;

export type JourneyRunIdentity =
  | { readonly kind: "live"; readonly authority: RunAuthority }
  | { readonly kind: "mock"; readonly journeyId: string; readonly runId: string };

export type JourneyRuntimeEntry = {
  journeyId: string;
  /**
   * CR138: the key this entry is stored under. Carrying it on the entry is what makes the internal
   * `replaceEntry` correct by construction — it can no longer re-derive a Journey-grained key and
   * silently overwrite a sibling workspace.
   */
  workspaceKey: string;
  workspace: JourneyWorkspace;
  identity?: JourneyRunIdentity;
  agentRun: AgentRunState;
  isStreaming: boolean;
  isFinalizingTurn: boolean;
  mode?: "mock" | "live";
  /** CR090: the model this run started with, recorded so the render can name it. */
  providerModel?: string;
  missionDraft?: MissionDraft;
  warnings: string[];
  diagnostics: string[];
  safety?: NormalizedPiResponse["safety"];
  runtimeProjection: RuntimeProjectionState;
  runtimeProjectionMessageId?: string;
  streamedAssistantContent: string;
  conversationSnapshot?: JourneyConversation;
};

export type JourneyRuntimeQuarantineItem = {
  journeyId: string;
  runId: string;
  /**
   * CR138: `serial_capacity_rejected` described the Journey grain truthfully and would describe
   * the workspace grain falsely — the refusal is no longer about a Journey's serial capacity but
   * about one workspace already holding a run.
   */
  reason: "authority_mismatch" | "unknown_run" | "same_workspace_occupied";
};

export type JourneyRuntimeState = {
  /** CR138: keyed by `runtimeWorkspaceKey`, not by Journey id. */
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
  | { type: "register"; identity: JourneyRunIdentity; run: AgentRunState; assistantMessageId: string; providerModel?: string; conversationSnapshot?: JourneyConversation }
  | { type: "conversation_snapshot"; identity: JourneyRunIdentity; conversation: JourneyConversation }
  | { type: "stream_started"; identity: JourneyRunIdentity }
  | { type: "stream_event"; identity: JourneyRunIdentity; event: AgentStreamEvent }
  | { type: "stream_finished"; identity: JourneyRunIdentity }
  | { type: "cancel_requested"; identity: JourneyRunIdentity; message: string }
  | { type: "finalization_started"; identity: JourneyRunIdentity }
  | { type: "finalization_finished"; identity: JourneyRunIdentity }
  | { type: "patch"; workspace: JourneyWorkspace; identity?: JourneyRunIdentity; patch: RuntimePatch }
  | { type: "append_warning"; workspace: JourneyWorkspace; identity?: JourneyRunIdentity; message: string }
  | { type: "reset"; workspace: JourneyWorkspace }
  | { type: "cleanup"; identity: JourneyRunIdentity };

export function createInitialJourneyRuntimeState(): JourneyRuntimeState {
  return { entries: {}, quarantine: [] };
}

export function createEmptyJourneyRuntime(workspace: JourneyWorkspace): JourneyRuntimeEntry {
  return {
    journeyId: workspace.journeyId,
    workspace,
    workspaceKey: runtimeWorkspaceKey(workspace),
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
    const workspace = identityWorkspace(action.identity);
    const workspaceKey = runtimeWorkspaceKey(workspace);
    const existing = state.entries[workspaceKey];
    if (existing && isJourneyRuntimeActiveOrFinalizing(existing)) {
      return quarantine(state, action.identity, "same_workspace_occupied");
    }
    return {
      ...state,
      entries: {
        ...state.entries,
        [workspaceKey]: {
          ...createEmptyJourneyRuntime(workspace),
          identity: action.identity,
          agentRun: action.run,
          isStreaming: true,
          mode: action.identity.kind === "live" ? "live" : "mock",
          providerModel: action.providerModel,
          runtimeProjectionMessageId: action.assistantMessageId,
          conversationSnapshot: action.conversationSnapshot && conversationMatchesIdentity(action.conversationSnapshot, action.identity)
            ? action.conversationSnapshot
            : undefined,
        },
      },
    };
  }

  if (action.type === "patch" || action.type === "append_warning") {
    const current = state.entries[runtimeWorkspaceKey(action.workspace)]
      ?? createEmptyJourneyRuntime(action.workspace);
    if (action.identity && !sameJourneyRunIdentity(current.identity, action.identity)) {
      return quarantine(state, action.identity, current.identity ? "authority_mismatch" : "unknown_run");
    }
    return replaceEntry(state, action.type === "patch"
      ? { ...current, ...action.patch }
      : { ...current, warnings: [...current.warnings, action.message] });
  }

  if (action.type === "reset") {
    const resetKey = runtimeWorkspaceKey(action.workspace);
    const current = state.entries[resetKey];
    if (!current) return state;
    if (current.isStreaming || current.isFinalizingTurn || current.agentRun.status === "running") return state;
    const entries = { ...state.entries };
    delete entries[resetKey];
    return { ...state, entries };
  }

  const identity = action.identity;
  const workspaceKey = runtimeWorkspaceKey(identityWorkspace(identity));
  const current = state.entries[workspaceKey];
  if (!current) return quarantine(state, identity, "unknown_run");
  if (!sameJourneyRunIdentity(current.identity, identity)) {
    return quarantine(state, identity, "authority_mismatch");
  }

  if (action.type === "conversation_snapshot") {
    if (!conversationMatchesIdentity(action.conversation, identity)) {
      return quarantine(state, identity, "authority_mismatch");
    }
    return replaceEntry(state, { ...current, conversationSnapshot: action.conversation });
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
    delete entries[workspaceKey];
    return { ...state, entries };
  }

  return replaceEntry(state, reduceEntryFromStreamEvent(current, action.event));
}

/**
 * CR138: the runtime entry for one workspace.
 *
 * The fallback is deliberate and temporary. Re-keying the entries changes *which surface sees a
 * live stream*: today a run registered anywhere in a Journey is visible from that Journey's root,
 * because one entry served the Journey and its conversations alike. Keying by workspace alone
 * would silently end that, and CR138's contract is that nothing changes in the field. While the
 * native registry admits at most one run per Journey there can be only one live entry, so falling
 * back to it reproduces today's behaviour exactly.
 *
 * It retires itself. Once two workspaces can run, the fallback finds two and declines to guess,
 * leaving the surface empty rather than showing a sibling's work — and CR140 owns the decision
 * about what that surface should say.
 */
export function selectJourneyRuntime(
  state: JourneyRuntimeState,
  workspace: JourneyWorkspace,
): JourneyRuntimeEntry {
  const exact = state.entries[runtimeWorkspaceKey(workspace)];
  if (exact) return exact;
  // CR144: a caller that knows its thread gets its own workspace's answer, and the honest answer
  // for a thread with no entry is an empty runtime.
  //
  // This is the line CR140 did not draw. Its fallback ran whenever the exact key missed, including
  // when the thread was known and simply had not run yet in this session — and a conversation that
  // has never run is exactly the one a Navigator opens to start a second turn. With one sibling
  // live, that conversation was handed **the sibling's entry**, so `sendBlocked` read true and Send
  // never enabled. RS024's whole outcome was unreachable from a cold list.
  //
  // CR140's own measured callers both pass `null`: `selectJourney` (`App.tsx:4462`) asks about a
  // Journey whose thread is unresolved, and the selected workspace carries `null` before its
  // catalog loads. So narrowing to those callers removes the defect and changes nothing they do.
  //
  // CR141 drew this same line in `selectWorkspaceNativeLease` and this function was left behind;
  // the two now agree, which is what a shared rule is for.
  if (workspace.threadId !== null) return createEmptyJourneyRuntime(workspace);
  // With one live entry it answers for the Journey, as it always did. With two it declines rather
  // than guessing: showing a sibling's stream on a surface that did not ask for it would be worse
  // than showing nothing, and the caller above only needs a snapshot to carry forward.
  const live = selectJourneyRuntimeEntries(state, workspace.journeyId)
    .filter(isJourneyRuntimeActiveOrFinalizing);
  return live.length === 1 ? live[0] : createEmptyJourneyRuntime(workspace);
}

/** CR138: every workspace entry belonging to one Journey, for the aggregates that need them all. */
export function selectJourneyRuntimeEntries(
  state: JourneyRuntimeState,
  journeyId: string,
): JourneyRuntimeEntry[] {
  return Object.values(state.entries)
    .filter((entry) => entry.journeyId === journeyId)
    .sort((left, right) => left.workspaceKey.localeCompare(right.workspaceKey));
}

export function hasActiveOrFinalizingJourneyRuntime(state: JourneyRuntimeState): boolean {
  return Object.values(state.entries).some(isJourneyRuntimeActiveOrFinalizing);
}

export function isJourneyRuntimeActiveOrFinalizing(entry: JourneyRuntimeEntry): boolean {
  return entry.isStreaming || entry.isFinalizingTurn || entry.agentRun.status === "running";
}

/**
 * CR116: whether this Journey's own run is still producing. Admission and cleanup legitimately
 * refuse while a turn is finalizing, but post-terminal *repair* must not: a settlement that
 * stopped leaves `isFinalizingTurn` set forever, and gating repair on it made the routine refuse
 * exactly the state it exists to heal.
 */
export function isJourneyRuntimeStreaming(entry: JourneyRuntimeEntry): boolean {
  return entry.isStreaming || entry.agentRun.status === "running";
}

export type JourneyRuntimeOwnerPhase = "running" | "finalizing";

/**
 * CR138: a Journey-level aggregate, which is what CR134's status surfaces need — the Journey row
 * must report that work runs somewhere inside it even when that workspace is not selected. With
 * two live workspaces it also names *which* one it is reporting, so the surface is never left to
 * guess an owner.
 *
 * `finalizing` wins over `running` because a settlement that will not end is the state the
 * Navigator needs to see; CR132's exit is attached to it.
 */
export function selectJourneyRuntimeOwnerPhase(
  state: JourneyRuntimeState,
  journeyId: string,
): { phase: JourneyRuntimeOwnerPhase; identity?: JourneyRunIdentity } | undefined {
  const entries = selectJourneyRuntimeEntries(state, journeyId);
  const finalizing = entries.find((entry) => entry.isFinalizingTurn);
  if (finalizing) return { phase: "finalizing", identity: finalizing.identity };
  const running = entries.find((entry) => entry.isStreaming || entry.agentRun.status === "running");
  return running ? { phase: "running", identity: running.identity } : undefined;
}

export function selectJourneyRuntimeConversation(
  state: JourneyRuntimeState,
  workspace: JourneyWorkspace,
  generation: number,
): JourneyConversation | undefined {
  return conversationOfEntry(state.entries[runtimeWorkspaceKey(workspace)], generation);
}

/**
 * CR138: the same question asked of a Journey rather than a workspace. Navigation restore and the
 * selected-surface presentation both look a Journey up and then filter by thread themselves, so
 * they need the Journey form; asking for a workspace would require them to know the thread before
 * they have resolved it.
 */
export function selectJourneyRuntimeConversationInJourney(
  state: JourneyRuntimeState,
  journeyId: string,
  generation: number,
): JourneyConversation | undefined {
  for (const entry of selectJourneyRuntimeEntries(state, journeyId)) {
    const found = conversationOfEntry(entry, generation);
    if (found) return found;
  }
  return undefined;
}

function conversationOfEntry(
  entry: JourneyRuntimeEntry | undefined,
  generation: number,
): JourneyConversation | undefined {
  const snapshot = entry?.conversationSnapshot;
  if (!entry?.identity || !snapshot || !isJourneyRuntimeActiveOrFinalizing(entry)
    || snapshot.liveIdentity.generation !== generation) return undefined;
  return conversationMatchesIdentity(snapshot, entry.identity) ? snapshot : undefined;
}

export function identityJourneyId(identity: JourneyRunIdentity): string {
  return identity.kind === "live" ? identity.authority.journeyId : identity.journeyId;
}

/**
 * CR138: a mock identity carries no thread, so it keys to its Journey alone. A mock and a live run
 * never share a session, so the Journey-only key cannot collide with a real workspace key.
 */
export function identityWorkspace(identity: JourneyRunIdentity): JourneyWorkspace {
  return identity.kind === "live"
    ? workspaceOfAuthority(identity.authority)
    : journeyWorkspace(identity.journeyId, null);
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

function conversationMatchesIdentity(
  conversation: JourneyConversation,
  identity: JourneyRunIdentity,
): boolean {
  if (identity.kind === "mock") return conversation.journeyId === identity.journeyId;
  const authority = identity.authority;
  const correlatedTurn = conversation.reconciliation.turns.find((turn) =>
    turn.turnId === authority.turnId
    && turn.runId === authority.runId
    && turn.harness.userMessageId === authority.harnessUserMessageId
    && turn.harness.assistantMessageId === authority.harnessAssistantMessageId,
  );
  return Boolean(correlatedTurn)
    && conversation.journeyId === authority.journeyId
    && conversation.liveIdentity.journeyId === authority.journeyId
    && conversation.liveIdentity.harnessConversationId === authority.harnessConversationId
    && conversation.liveIdentity.harnessConversationId === authority.threadId
    && conversation.liveIdentity.generation === authority.generation
    && conversation.liveIdentity.piSessionId === authority.piSessionId
    && conversation.liveIdentity.piSessionFile === authority.piSessionFile
    && conversation.liveIdentity.mirrorConversationId === authority.mirrorConversationId
    && conversation.liveIdentity.activationReceiptActivatedAt === authority.activationReceiptActivatedAt;
}

function reduceEntryFromStreamEvent(entry: JourneyRuntimeEntry, event: AgentStreamEvent): JourneyRuntimeEntry {
  let next: JourneyRuntimeEntry = {
    ...entry,
    agentRun: reduceAgentRunFromStreamEvent(entry.agentRun, event),
    runtimeProjection: reduceRuntimeProjection(entry.runtimeProjection, event),
  };
  if (event.type === "run_status" && event.status === "completed") {
    next = { ...next, isStreaming: false, isFinalizingTurn: true };
  } else if (event.type === "message_delta" || event.type === "agent_comment_boundary") {
    next = {
      ...next,
      streamedAssistantContent: reduceStreamedAssistantMessage(entry.streamedAssistantContent, event),
    };
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
  return { ...state, entries: { ...state.entries, [entry.workspaceKey]: entry } };
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
