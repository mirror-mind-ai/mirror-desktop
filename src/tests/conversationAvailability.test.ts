import { describe, expect, it } from "vitest";
import {
  decideConversationAvailability,
  type ConversationAvailabilityInput,
} from "../domain/conversationAvailability";

const ready: ConversationAvailabilityInput = {
  runtimeBindingReady: true,
  conversationAuthorityReady: true,
  localAdmissionReady: true,
  sameConversationExecutionActive: false,
  nativeAdmission: "allowed",
  recoveryInspectionActive: false,
  mirrorSynchronizationPending: false,
};

describe("Conversation availability contract", () => {
  it("allows every local action when exact authority is ready", () => {
    expect(decideConversationAvailability(ready)).toEqual({
      condition: "ready",
      canDraft: true,
      canSend: true,
      canStartNewConversation: true,
      canResetAgentContext: true,
      recoveryActions: [],
    });
  });

  it("keeps recoverable Mirror synchronization visible without blocking Send", () => {
    expect(decideConversationAvailability({
      ...ready,
      mirrorSynchronizationPending: true,
    })).toEqual({
      condition: "sync_pending",
      canDraft: true,
      canSend: true,
      canStartNewConversation: true,
      canResetAgentContext: true,
      recoveryActions: ["retry_mirror_sync"],
    });
  });

  it("blocks execution while local Conversation authority is unavailable", () => {
    expect(decideConversationAvailability({
      ...ready,
      conversationAuthorityReady: false,
    })).toMatchObject({
      condition: "conversation_authority_unavailable",
      canDraft: true,
      canSend: false,
      canStartNewConversation: false,
      canResetAgentContext: false,
      recoveryActions: ["inspect_conversation_authority"],
    });
  });

  it("blocks provider execution when local admission cannot be persisted", () => {
    expect(decideConversationAvailability({
      ...ready,
      localAdmissionReady: false,
    })).toMatchObject({
      condition: "local_admission_unavailable",
      canSend: false,
      canStartNewConversation: false,
      recoveryActions: ["repair_local_admission"],
    });
  });

  it("keeps drafting available while the same Conversation owns a live turn", () => {
    expect(decideConversationAvailability({
      ...ready,
      sameConversationExecutionActive: true,
    })).toMatchObject({
      condition: "live_turn",
      canDraft: true,
      canSend: false,
      canStartNewConversation: false,
      canResetAgentContext: false,
      recoveryActions: ["wait_for_live_turn"],
    });
  });

  it("distinguishes an unbound runtime from local Conversation creation", () => {
    expect(decideConversationAvailability({
      ...ready,
      runtimeBindingReady: false,
    })).toMatchObject({
      condition: "runtime_unbound",
      canSend: false,
      canStartNewConversation: true,
      canResetAgentContext: false,
      recoveryActions: ["configure_runtime"],
    });
  });

  it("fails closed while native authority is unknown", () => {
    expect(decideConversationAvailability({
      ...ready,
      nativeAdmission: "inspection_unknown",
    })).toMatchObject({
      condition: "native_authority_unknown",
      canSend: false,
      canStartNewConversation: false,
      recoveryActions: ["inspect_native_authority"],
    });
  });

  it("keeps model-free Conversation creation available when global provider capacity is full", () => {
    expect(decideConversationAvailability({
      ...ready,
      nativeAdmission: "global_capacity_reached",
    })).toMatchObject({
      condition: "native_capacity_full",
      canSend: false,
      canStartNewConversation: true,
      canResetAgentContext: true,
      recoveryActions: ["wait_for_native_capacity"],
    });
  });

  it("blocks Journey-local actions when another surface in the Journey owns the lease", () => {
    expect(decideConversationAvailability({
      ...ready,
      nativeAdmission: "same_journey_occupied",
    })).toMatchObject({
      condition: "journey_lease_occupied",
      canSend: false,
      canStartNewConversation: false,
      canResetAgentContext: false,
      recoveryActions: ["wait_for_journey_lease"],
    });
  });

  it("gives bounded recovery inspection precedence over synchronization debt", () => {
    expect(decideConversationAvailability({
      ...ready,
      recoveryInspectionActive: true,
      mirrorSynchronizationPending: true,
    })).toMatchObject({
      condition: "recovery_inspection",
      canSend: false,
      recoveryActions: ["wait_for_recovery_inspection"],
    });
  });
});
