import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import { decideConversationAvailability } from "../domain/conversationAvailability";
import { decideConversationRecoveryRoutes } from "../domain/conversationRecovery";

const availability = decideConversationAvailability({
  runtimeBindingReady: true,
  conversationAuthorityReady: true,
  localAdmissionReady: true,
  sameConversationExecutionActive: false,
  nativeAdmission: "allowed",
  recoveryInspectionActive: false,
  mirrorSynchronizationPending: true,
});

function routeIds(input: Parameters<typeof decideConversationRecoveryRoutes>[0]) {
  return decideConversationRecoveryRoutes(input).map((route) => route.id);
}

describe("explicit Conversation recovery routes", () => {
  it("offers exact Mirror delivery plus model-free escape routes for synchronization debt", () => {
    expect(routeIds({
      availability,
      mirrorSynchronization: "exact_repair_available",
      canCreateDesktopConversation: true,
    })).toEqual(["retry_mirror_sync", "start_new_conversation", "reset_agent_context"]);
  });

  it("does not pretend a legacy payload gap can be retried", () => {
    expect(routeIds({
      availability,
      mirrorSynchronization: "legacy_gap",
      canCreateDesktopConversation: true,
    })).toEqual(["start_new_conversation", "reset_agent_context"]);
  });

  it("offers deterministic response recovery and honest continuation for fresh completed evidence", () => {
    expect(routeIds({
      availability: { ...availability, canStartNewConversation: false, canResetAgentContext: false },
      blockingTurn: {
        phase: "terminal_durable",
        terminalOutcome: "completed",
        hasFreshCompletePiEvidence: true,
        exactRunInactive: true,
      },
      canCreateDesktopConversation: true,
    })).toEqual(["recover_preserved_response", "preserve_attempt_and_continue"]);
  });

  it("offers only preserve-and-continue for incomplete or failed inactive attempts", () => {
    expect(routeIds({
      availability,
      blockingTurn: {
        phase: "running",
        terminalOutcome: null,
        hasFreshCompletePiEvidence: false,
        exactRunInactive: true,
      },
      canCreateDesktopConversation: true,
    })).toEqual(["preserve_attempt_and_continue"]);
    expect(routeIds({
      availability,
      blockingTurn: {
        phase: "terminal_durable",
        terminalOutcome: "process_died",
        hasFreshCompletePiEvidence: false,
        exactRunInactive: true,
      },
      canCreateDesktopConversation: true,
    })).toEqual(["preserve_attempt_and_continue"]);
    expect(routeIds({
      availability,
      blockingTurn: {
        phase: "projected",
        terminalOutcome: "completed",
        hasFreshCompletePiEvidence: false,
        exactRunInactive: true,
      },
      canCreateDesktopConversation: true,
    })).toEqual(["preserve_attempt_and_continue"]);
  });

  it("offers no mutation while the exact run may still be active", () => {
    expect(routeIds({
      availability,
      blockingTurn: {
        phase: "terminal_durable",
        terminalOutcome: "completed",
        hasFreshCompletePiEvidence: true,
        exactRunInactive: false,
      },
      canCreateDesktopConversation: true,
    })).toEqual([]);
  });

  it("does not surface recovery actions for an ordinary ready Conversation", () => {
    expect(routeIds({
      availability: { ...availability, condition: "ready", recoveryActions: [] },
      mirrorSynchronization: "none",
      canCreateDesktopConversation: true,
    })).toEqual([]);
  });

  it("dispatches exact model-free operations instead of retrying the provider", () => {
    const handler = appSource.slice(
      appSource.indexOf("async function performRecoveryRoute"),
      appSource.indexOf("async function persistAgentSettings"),
    );
    expect(handler).toContain("retryPendingMirrorCommit()");
    expect(handler).toContain("recoverPreservedResponse()");
    expect(handler).toContain("markBlockingTurnInterrupted()");
    expect(handler).toContain("requestBlankDesktopConversation()");
    expect(handler).toContain("requestConversationRestart()");
    expect(handler).not.toContain("generatePacket");
    expect(handler).not.toContain("livePiAgentStream");
    expect(handler).not.toContain("mockPiAgentStream");
  });
});
