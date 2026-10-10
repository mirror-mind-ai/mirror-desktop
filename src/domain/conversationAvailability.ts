export type NativeConversationAdmission =
  | "allowed"
  | "inspection_unknown"
  | "same_workspace_occupied"
  /** CR140, restored: work elsewhere in this Journey holds the single per-Journey event route. */
  | "same_journey_occupied"
  /** CR140: the Journey holds its whole share of live invocations; global capacity may be free. */
  | "journey_share_exceeded"
  | "global_capacity_reached";

export type ConversationAvailabilityCondition =
  | "ready"
  | "sync_pending"
  | "runtime_unbound"
  | "conversation_authority_unavailable"
  | "live_turn"
  | "native_authority_unknown"
  | "native_capacity_full"
  | "journey_lease_occupied"
  | "recovery_inspection"
  | "compaction_active";

export type ConversationRecoveryAction =
  | "configure_runtime"
  | "inspect_conversation_authority"
  | "wait_for_live_turn"
  | "inspect_native_authority"
  | "wait_for_native_capacity"
  | "wait_for_journey_lease"
  | "wait_for_recovery_inspection"
  | "wait_for_compaction"
  | "retry_mirror_sync";

export interface ConversationAvailabilityInput {
  runtimeBindingReady: boolean;
  conversationAuthorityReady: boolean;
  sameConversationExecutionActive: boolean;
  nativeAdmission: NativeConversationAdmission;
  recoveryInspectionActive: boolean;
  /** CR080: a manual compaction is rewriting this Journey's session file. */
  compactionActive?: boolean;
  mirrorSynchronizationPending: boolean;
}

export interface ConversationAvailability {
  condition: ConversationAvailabilityCondition;
  canDraft: boolean;
  canSend: boolean;
  canStartNewConversation: boolean;
  canResetAgentContext: boolean;
  recoveryActions: ConversationRecoveryAction[];
}

function blocked(
  condition: ConversationAvailabilityCondition,
  recoveryAction: ConversationRecoveryAction,
  options: {
    canStartNewConversation?: boolean;
    canResetAgentContext?: boolean;
  } = {},
): ConversationAvailability {
  return {
    condition,
    canDraft: true,
    canSend: false,
    canStartNewConversation: options.canStartNewConversation ?? false,
    canResetAgentContext: options.canResetAgentContext ?? false,
    recoveryActions: [recoveryAction],
  };
}

export function decideConversationAvailability(
  input: ConversationAvailabilityInput,
): ConversationAvailability {
  if (!input.conversationAuthorityReady) {
    return blocked("conversation_authority_unavailable", "inspect_conversation_authority");
  }
  if (input.sameConversationExecutionActive) {
    return blocked("live_turn", "wait_for_live_turn");
  }
  if (!input.runtimeBindingReady) {
    return blocked("runtime_unbound", "configure_runtime", { canStartNewConversation: true });
  }
  if (input.nativeAdmission === "inspection_unknown") {
    return blocked("native_authority_unknown", "inspect_native_authority");
  }
  if (input.nativeAdmission === "same_workspace_occupied"
    || input.nativeAdmission === "same_journey_occupied"
    || input.nativeAdmission === "journey_share_exceeded") {
    // CR138 kept these on one condition because both mean "wait for the lease in the way" and
    // neither offers a different route out. CR140 confirmed that and put the distinction where it
    // belongs: the sentence, from `describeAdmissionRefusal`. The condition still differs from
    // `native_capacity_full`, which does offer other routes, because that one clears when *any*
    // Journey frees a slot while these clear only when this Journey's own work finishes.
    return blocked("journey_lease_occupied", "wait_for_journey_lease");
  }
  if (input.nativeAdmission === "global_capacity_reached") {
    return blocked("native_capacity_full", "wait_for_native_capacity", {
      canStartNewConversation: true,
      canResetAgentContext: true,
    });
  }
  if (input.recoveryInspectionActive) {
    return blocked("recovery_inspection", "wait_for_recovery_inspection");
  }
  // A compaction is occupancy: it rewrites the session, so nothing may start on it,
  // including a new Conversation or a context reset, until it settles.
  if (input.compactionActive) {
    return blocked("compaction_active", "wait_for_compaction");
  }
  if (input.mirrorSynchronizationPending) {
    return {
      condition: "sync_pending",
      canDraft: true,
      canSend: true,
      canStartNewConversation: true,
      canResetAgentContext: true,
      recoveryActions: ["retry_mirror_sync"],
    };
  }
  return {
    condition: "ready",
    canDraft: true,
    canSend: true,
    canStartNewConversation: true,
    canResetAgentContext: true,
    recoveryActions: [],
  };
}
