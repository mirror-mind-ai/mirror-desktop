export type ReconciliationAuthority = {
  journeyId: string;
  harnessConversationId: string;
  piSessionId: string;
  generation: number;
  mirrorConversationId?: string;
};

export type BodyCommitState = "unknown" | "pending" | "committed" | "failed";
export type ReconciliationClassification =
  | "uninitialized"
  | "in_sync"
  | "commit_pending"
  | "commit_failed"
  | "conflicted";
export type ReconciliationReasonCode =
  | "turn_identity_mismatch"
  | "native_id_mismatch"
  | "checkpoint_regression"
  | "mirror_conversation_mismatch";

export type HarnessCheckpoint = {
  lastMessageId: string;
  lastTurnId: string;
  messageCount: number;
};

export type PiCheckpoint = {
  leafEntryId: string;
  entryCount: number;
  sessionFile?: string;
};

export type MirrorCheckpoint = {
  conversationId: string;
  lastMessageId: string;
  messageCount: number;
  updatedAt?: string;
};

export type HarnessTurnEvidence = {
  state: BodyCommitState;
  userMessageId?: string;
  assistantMessageId?: string;
  committedAt?: string;
  failureCode?: string;
};

export type PiTurnEvidence = {
  state: BodyCommitState;
  userEntryId?: string;
  assistantEntryId?: string;
  leafEntryId?: string;
  sessionFile?: string;
  committedAt?: string;
  failureCode?: string;
};

export type MirrorTurnEvidence = {
  state: BodyCommitState;
  userMessageId?: string;
  assistantMessageId?: string;
  committedAt?: string;
  failureCode?: string;
};

export type CorrelatedConversationTurn = {
  turnId: string;
  runId?: string;
  origin: "nautilus";
  startedAt: string;
  harness: HarnessTurnEvidence;
  pi: PiTurnEvidence;
  mirror: MirrorTurnEvidence;
};

export type ConversationReconciliationState = {
  schemaVersion: "0.1.0";
  authority: ReconciliationAuthority;
  checkpoints: {
    harness?: HarnessCheckpoint;
    pi?: PiCheckpoint;
    mirror?: MirrorCheckpoint;
  };
  turns: CorrelatedConversationTurn[];
  classification: ReconciliationClassification;
  classifiedAt: string;
  reasonCodes: ReconciliationReasonCode[];
};

type HarnessCommit = Omit<HarnessCheckpoint, "lastMessageId" | "lastTurnId"> & {
  userMessageId: string;
  assistantMessageId: string;
  committedAt: string;
};

type PiCommit = Omit<PiCheckpoint, "leafEntryId"> & {
  userEntryId: string;
  assistantEntryId: string;
  leafEntryId: string;
  committedAt: string;
};

type MirrorCommit = Omit<MirrorCheckpoint, "conversationId" | "lastMessageId"> & {
  userMessageId: string;
  assistantMessageId: string;
  committedAt: string;
};

export function createConversationReconciliationState(
  authority: ReconciliationAuthority,
  classifiedAt: string = new Date().toISOString(),
): ConversationReconciliationState {
  return {
    schemaVersion: "0.1.0",
    authority: cloneAuthority(authority),
    checkpoints: {},
    turns: [],
    classification: "uninitialized",
    classifiedAt,
    reasonCodes: [],
  };
}

export function beginNautilusTurn(
  state: ConversationReconciliationState,
  input: { turnId: string; runId: string; startedAt: string },
): ConversationReconciliationState {
  const existing = state.turns.find((turn) => turn.turnId === input.turnId);
  if (existing) {
    return existing.runId === input.runId && existing.origin === "nautilus"
      ? state
      : conflict(state, "turn_identity_mismatch", input.startedAt);
  }
  const turn: CorrelatedConversationTurn = {
    turnId: input.turnId,
    runId: input.runId,
    origin: "nautilus",
    startedAt: input.startedAt,
    harness: { state: "pending" },
    pi: { state: "pending" },
    mirror: { state: "pending" },
  };
  return classify({
    ...state,
    turns: [...state.turns, turn],
    classifiedAt: input.startedAt,
    reasonCodes: clearNonConflictReasons(state.reasonCodes),
  });
}

export function bindMirrorConversation(
  state: ConversationReconciliationState,
  conversationId: string,
  boundAt: string,
): ConversationReconciliationState {
  if (!isNonEmpty(conversationId)) return conflict(state, "mirror_conversation_mismatch", boundAt);
  if (state.authority.mirrorConversationId === conversationId) return state;
  if (state.authority.mirrorConversationId || state.checkpoints.mirror) {
    return conflict(state, "mirror_conversation_mismatch", boundAt);
  }
  return classify({
    ...state,
    authority: { ...state.authority, mirrorConversationId: conversationId },
    classifiedAt: boundAt,
  });
}

export function observePiUserEntry(
  state: ConversationReconciliationState,
  turnId: string,
  userEntryId: string,
  observedAt: string,
): ConversationReconciliationState {
  const turn = findTurn(state, turnId);
  if (!turn || !isNonEmpty(userEntryId)) return conflict(state, "turn_identity_mismatch", observedAt);
  if (turn.pi.userEntryId && turn.pi.userEntryId !== userEntryId) {
    return conflict(state, "native_id_mismatch", observedAt);
  }
  if (turn.pi.userEntryId === userEntryId) return state;
  return classify({
    ...state,
    ...replaceTurn(state, turnId, { ...turn, pi: { ...turn.pi, userEntryId } }),
    classifiedAt: observedAt,
  });
}

export function observeMirrorUserCommit(
  state: ConversationReconciliationState,
  turnId: string,
  userMessageId: string,
  observedAt: string,
): ConversationReconciliationState {
  const turn = findTurn(state, turnId);
  if (!turn || !isNonEmpty(userMessageId)) return conflict(state, "turn_identity_mismatch", observedAt);
  if (turn.mirror.userMessageId && turn.mirror.userMessageId !== userMessageId) {
    return conflict(state, "native_id_mismatch", observedAt);
  }
  if (turn.mirror.userMessageId === userMessageId && turn.mirror.state === "pending") return state;
  return classify({
    ...state,
    ...replaceTurn(state, turnId, {
      ...turn,
      mirror: { state: "pending", userMessageId },
    }),
    classifiedAt: observedAt,
  });
}

export function observeHarnessTurnCommit(
  state: ConversationReconciliationState,
  turnId: string,
  commit: HarnessCommit,
): ConversationReconciliationState {
  const turn = findTurn(state, turnId);
  if (!turn) return conflict(state, "turn_identity_mismatch", commit.committedAt);
  const evidence: HarnessTurnEvidence = {
    state: "committed",
    userMessageId: commit.userMessageId,
    assistantMessageId: commit.assistantMessageId,
    committedAt: commit.committedAt,
  };
  if (turn.harness.state === "committed") {
    return sameEvidence(turn.harness, evidence) ? state : conflict(state, "native_id_mismatch", commit.committedAt);
  }
  if (checkpointRegressed(state.checkpoints.harness?.messageCount, commit.messageCount)) {
    return conflict(state, "checkpoint_regression", commit.committedAt);
  }
  return classify({
    ...state,
    ...replaceTurn(state, turnId, { ...turn, harness: evidence }),
    checkpoints: {
      ...state.checkpoints,
      harness: {
        lastMessageId: commit.assistantMessageId,
        lastTurnId: turnId,
        messageCount: commit.messageCount,
      },
    },
    classifiedAt: commit.committedAt,
  });
}

export function observePiTurnCommit(
  state: ConversationReconciliationState,
  turnId: string,
  commit: PiCommit,
): ConversationReconciliationState {
  const turn = findTurn(state, turnId);
  if (!turn) return conflict(state, "turn_identity_mismatch", commit.committedAt);
  const evidence: PiTurnEvidence = {
    state: "committed",
    userEntryId: commit.userEntryId,
    assistantEntryId: commit.assistantEntryId,
    leafEntryId: commit.leafEntryId,
    ...(commit.sessionFile ? { sessionFile: commit.sessionFile } : {}),
    committedAt: commit.committedAt,
  };
  if (turn.pi.state === "committed") {
    return sameEvidence(turn.pi, evidence) ? state : conflict(state, "native_id_mismatch", commit.committedAt);
  }
  if (checkpointRegressed(state.checkpoints.pi?.entryCount, commit.entryCount)) {
    return conflict(state, "checkpoint_regression", commit.committedAt);
  }
  return classify({
    ...state,
    ...replaceTurn(state, turnId, { ...turn, pi: evidence }),
    checkpoints: {
      ...state.checkpoints,
      pi: {
        leafEntryId: commit.leafEntryId,
        entryCount: commit.entryCount,
        ...(commit.sessionFile ? { sessionFile: commit.sessionFile } : {}),
      },
    },
    classifiedAt: commit.committedAt,
  });
}

export function observeMirrorTurnCommit(
  state: ConversationReconciliationState,
  turnId: string,
  commit: MirrorCommit,
): ConversationReconciliationState {
  const turn = findTurn(state, turnId);
  if (!turn) return conflict(state, "turn_identity_mismatch", commit.committedAt);
  const conversationId = state.authority.mirrorConversationId;
  if (!conversationId) return conflict(state, "mirror_conversation_mismatch", commit.committedAt);
  const evidence: MirrorTurnEvidence = {
    state: "committed",
    userMessageId: commit.userMessageId,
    assistantMessageId: commit.assistantMessageId,
    committedAt: commit.committedAt,
  };
  if (turn.mirror.state === "committed") {
    return sameEvidence(turn.mirror, evidence) ? state : conflict(state, "native_id_mismatch", commit.committedAt);
  }
  if (checkpointRegressed(state.checkpoints.mirror?.messageCount, commit.messageCount)) {
    return conflict(state, "checkpoint_regression", commit.committedAt);
  }
  return classify({
    ...state,
    ...replaceTurn(state, turnId, { ...turn, mirror: evidence }),
    checkpoints: {
      ...state.checkpoints,
      mirror: {
        conversationId,
        lastMessageId: commit.assistantMessageId,
        messageCount: commit.messageCount,
        ...(commit.updatedAt ? { updatedAt: commit.updatedAt } : {}),
      },
    },
    classifiedAt: commit.committedAt,
  });
}

export function markTurnBodyFailed(
  state: ConversationReconciliationState,
  turnId: string,
  body: "harness" | "pi" | "mirror",
  failureCode: string,
  failedAt: string,
): ConversationReconciliationState {
  const turn = findTurn(state, turnId);
  if (!turn) return conflict(state, "turn_identity_mismatch", failedAt);
  const nextTurn = { ...turn, [body]: { state: "failed", failureCode } } as CorrelatedConversationTurn;
  return classify({
    ...state,
    ...replaceTurn(state, turnId, nextTurn),
    classifiedAt: failedAt,
  });
}

export function parseConversationReconciliationState(
  value: unknown,
  expectedAuthority: ReconciliationAuthority,
): ConversationReconciliationState | undefined {
  if (!isRecord(value) || value.schemaVersion !== "0.1.0") return undefined;
  if (!isAuthority(value.authority) || !sameAuthority(value.authority, expectedAuthority)) return undefined;
  if (!isRecord(value.checkpoints) || !Array.isArray(value.turns)) return undefined;
  if (!isClassification(value.classification) || typeof value.classifiedAt !== "string") return undefined;
  if (!Array.isArray(value.reasonCodes) || !value.reasonCodes.every(isReasonCode)) return undefined;

  const checkpoints = value.checkpoints;
  if (checkpoints.harness !== undefined && !isHarnessCheckpoint(checkpoints.harness)) return undefined;
  if (checkpoints.pi !== undefined && !isPiCheckpoint(checkpoints.pi)) return undefined;
  if (checkpoints.mirror !== undefined && !isMirrorCheckpoint(checkpoints.mirror)) return undefined;
  if (
    isRecord(checkpoints.mirror)
    && checkpoints.mirror.conversationId !== expectedAuthority.mirrorConversationId
  ) return undefined;

  const turns = value.turns;
  if (!turns.every(isTurn)) return undefined;
  const turnIds = turns.map((turn) => turn.turnId);
  if (new Set(turnIds).size !== turnIds.length) return undefined;

  const candidate = value as unknown as ConversationReconciliationState;
  if (deriveClassification(candidate) !== candidate.classification) return undefined;
  return candidate;
}

function classify(state: ConversationReconciliationState): ConversationReconciliationState {
  return { ...state, classification: deriveClassification(state) };
}

function deriveClassification(state: ConversationReconciliationState): ReconciliationClassification {
  if (state.reasonCodes.some(isConflictReason)) return "conflicted";
  const failed = state.turns.some((turn) => [turn.harness, turn.pi, turn.mirror].some((body) => body.state === "failed"));
  const unresolved = state.turns.some((turn) => [turn.harness, turn.pi, turn.mirror]
    .some((body) => body.state === "pending" || body.state === "unknown"));
  if (failed) return "commit_failed";
  if (unresolved) return "commit_pending";
  if (state.turns.length > 0) return "in_sync";
  return "uninitialized";
}

function conflict(
  state: ConversationReconciliationState,
  reason: ReconciliationReasonCode,
  at: string,
): ConversationReconciliationState {
  return {
    ...state,
    classification: "conflicted",
    classifiedAt: at,
    reasonCodes: [...new Set([...state.reasonCodes, reason])],
  };
}

function clearNonConflictReasons(reasons: ReconciliationReasonCode[]): ReconciliationReasonCode[] {
  return reasons;
}

function isConflictReason(): boolean {
  return true;
}

function findTurn(state: ConversationReconciliationState, turnId: string) {
  return state.turns.find((turn) => turn.turnId === turnId);
}

function replaceTurn(
  state: ConversationReconciliationState,
  turnId: string,
  replacement: CorrelatedConversationTurn,
): Pick<ConversationReconciliationState, "turns"> {
  return { turns: state.turns.map((turn) => turn.turnId === turnId ? replacement : turn) };
}

function checkpointRegressed(previous: number | undefined, next: number): boolean {
  return !Number.isInteger(next) || next < 0 || (previous !== undefined && next < previous);
}

function sameEvidence(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
  );
}

function cloneAuthority(authority: ReconciliationAuthority): ReconciliationAuthority {
  return {
    journeyId: authority.journeyId,
    harnessConversationId: authority.harnessConversationId,
    piSessionId: authority.piSessionId,
    generation: authority.generation,
    ...(authority.mirrorConversationId ? { mirrorConversationId: authority.mirrorConversationId } : {}),
  };
}

function sameAuthority(left: ReconciliationAuthority, right: ReconciliationAuthority): boolean {
  return left.journeyId === right.journeyId
    && left.harnessConversationId === right.harnessConversationId
    && left.piSessionId === right.piSessionId
    && left.generation === right.generation
    && left.mirrorConversationId === right.mirrorConversationId;
}

function isAuthority(value: unknown): value is ReconciliationAuthority {
  return isRecord(value)
    && isNonEmpty(value.journeyId)
    && isNonEmpty(value.harnessConversationId)
    && isNonEmpty(value.piSessionId)
    && isNonNegativeInteger(value.generation)
    && (value.mirrorConversationId === undefined || isNonEmpty(value.mirrorConversationId));
}

function isHarnessCheckpoint(value: unknown): value is HarnessCheckpoint {
  return isRecord(value) && isNonEmpty(value.lastMessageId) && isNonEmpty(value.lastTurnId) && isNonNegativeInteger(value.messageCount);
}

function isPiCheckpoint(value: unknown): value is PiCheckpoint {
  return isRecord(value) && isNonEmpty(value.leafEntryId) && isNonNegativeInteger(value.entryCount)
    && (value.sessionFile === undefined || isNonEmpty(value.sessionFile));
}

function isMirrorCheckpoint(value: unknown): value is MirrorCheckpoint {
  return isRecord(value) && isNonEmpty(value.conversationId) && isNonEmpty(value.lastMessageId)
    && isNonNegativeInteger(value.messageCount) && (value.updatedAt === undefined || typeof value.updatedAt === "string");
}

function isTurn(value: unknown): value is CorrelatedConversationTurn {
  if (!isRecord(value) || !isNonEmpty(value.turnId) || typeof value.startedAt !== "string") return false;
  if (value.runId !== undefined && !isNonEmpty(value.runId)) return false;
  if (value.origin !== "nautilus") return false;
  return isHarnessEvidence(value.harness) && isPiEvidence(value.pi) && isMirrorEvidence(value.mirror);
}

function isHarnessEvidence(value: unknown): value is HarnessTurnEvidence {
  return isBodyEvidence(value) && (value.state !== "committed" || (isNonEmpty(value.userMessageId) && isNonEmpty(value.assistantMessageId)));
}

function isPiEvidence(value: unknown): value is PiTurnEvidence {
  return isBodyEvidence(value) && (value.state !== "committed" || (
    isNonEmpty(value.userEntryId) && isNonEmpty(value.assistantEntryId) && isNonEmpty(value.leafEntryId)
  ));
}

function isMirrorEvidence(value: unknown): value is MirrorTurnEvidence {
  return isBodyEvidence(value) && (value.state !== "committed" || (isNonEmpty(value.userMessageId) && isNonEmpty(value.assistantMessageId)));
}

function isBodyEvidence(value: unknown): value is Record<string, unknown> & { state: BodyCommitState } {
  if (!isRecord(value) || !["unknown", "pending", "committed", "failed"].includes(String(value.state))) return false;
  if (value.state === "failed" && !isNonEmpty(value.failureCode)) return false;
  return true;
}

function isClassification(value: unknown): value is ReconciliationClassification {
  return ["uninitialized", "in_sync", "commit_pending", "commit_failed", "conflicted"].includes(String(value));
}

function isReasonCode(value: unknown): value is ReconciliationReasonCode {
  return ["turn_identity_mismatch", "native_id_mismatch", "checkpoint_regression", "mirror_conversation_mismatch"].includes(String(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
