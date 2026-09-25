import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import { decideConversationAvailability } from "../domain/conversationAvailability";
import { decideConversationRecoveryRoutes } from "../domain/conversationRecovery";

const availability = decideConversationAvailability({
  runtimeBindingReady: true,
  conversationAuthorityReady: true,
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

  it("offers no recovery route while the exact native run is still finishing", () => {
    // CR042 made a blocking turn mean exactly one thing: the run is still finishing. CR088
    // removed the routes that assumed the opposite, so no debt can smuggle one back in.
    expect(routeIds({
      availability,
      blockingTurnActive: true,
      canCreateDesktopConversation: true,
    })).toEqual([]);
    expect(routeIds({
      availability,
      blockingTurnActive: true,
      mirrorSynchronization: "exact_repair_available",
      canCreateDesktopConversation: true,
    })).toEqual([]);
    expect(routeIds({
      availability,
      blockingTurnActive: true,
      mirrorSynchronization: "legacy_gap",
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
    expect(handler).toContain("recoverPostTerminalPersistence(selectedJourney)");
    // CR088 removed the two blocking-turn operations; the remaining routes are unchanged.
    expect(handler).not.toContain("recoverPreservedResponse()");
    expect(handler).not.toContain("markBlockingTurnInterrupted()");
    expect(handler).toContain("requestBlankDesktopConversation()");
    expect(handler).toContain("requestConversationRestart()");
    expect(handler).not.toContain("generatePacket");
    expect(handler).not.toContain("livePiAgentStream");
    expect(handler).not.toContain("mockPiAgentStream");
  });
});
