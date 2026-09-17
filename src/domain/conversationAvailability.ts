export type NativeConversationAdmission =
  | "allowed"
  | "inspection_unknown"
  | "same_journey_occupied"
  | "global_capacity_reached";

export type ConversationAvailabilityCondition =
  | "ready"
  | "sync_pending"
  | "runtime_unbound"
  | "conversation_authority_unavailable"
  | "local_admission_unavailable"
  | "live_turn"
  | "native_authority_unknown"
  | "native_capacity_full"
  | "journey_lease_occupied"
  | "recovery_inspection";

export type ConversationRecoveryAction =
  | "configure_runtime"
  | "inspect_conversation_authority"
  | "repair_local_admission"
  | "wait_for_live_turn"
  | "inspect_native_authority"
  | "wait_for_native_capacity"
  | "wait_for_journey_lease"
  | "wait_for_recovery_inspection"
  | "retry_mirror_sync";

export interface ConversationAvailabilityInput {
  runtimeBindingReady: boolean;
  conversationAuthorityReady: boolean;
  localAdmissionReady: boolean;
  sameConversationExecutionActive: boolean;
  nativeAdmission: NativeConversationAdmission;
  recoveryInspectionActive: boolean;
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
  if (!input.localAdmissionReady) {
    return blocked("local_admission_unavailable", "repair_local_admission");
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
  if (input.nativeAdmission === "same_journey_occupied") {
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
