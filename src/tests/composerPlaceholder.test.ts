import { describe, expect, it } from "vitest";
import { composerPlaceholder } from "../app/composerPlaceholder";
import appSource from "../app/App.tsx?raw";

const ready = {
  availabilityCondition: "ready" as const,
  isRecordingTurn: false,
  isAgentResponding: false,
  hasUserMessage: true,
};

describe("composer placeholder", () => {
  it("uses the agreed first-message and ready-successor copy", () => {
    expect(composerPlaceholder({ ...ready, hasUserMessage: false }))
      .toBe("What would you like to work on?");
    expect(composerPlaceholder(ready))
      .toBe("What would you like to do next?");
  });

  it("explains that drafting is available while sending waits", () => {
    expect(composerPlaceholder({ ...ready, isAgentResponding: true }))
      .toBe("Prepare your next message. You can send it when the current response is complete.");
    expect(composerPlaceholder({ ...ready, isRecordingTurn: true }))
      .toBe("Prepare your next message. You can send it after this turn is recorded.");
  });

  it("names the conversation authority boundary instead of generic restoration", () => {
    expect(composerPlaceholder({
      ...ready,
      availabilityCondition: "conversation_authority_unavailable",
    })).toBe("This conversation authority must be inspected before another message can be sent.");
  });

  it("keeps synchronization debt from replacing ordinary ready copy", () => {
    expect(composerPlaceholder({
      ...ready,
      availabilityCondition: "sync_pending",
      isRecordingTurn: true,
    })).toBe("What would you like to do next?");
  });

  it("gives bounded recovery inspection precedence over recording", () => {
    expect(composerPlaceholder({
      ...ready,
      availabilityCondition: "recovery_inspection",
      isRecordingTurn: true,
      isAgentResponding: true,
    })).toBe("Mirror Desktop is checking whether a new turn can be persisted safely.");
    expect(composerPlaceholder({
      ...ready,
      isRecordingTurn: true,
      isAgentResponding: true,
    })).toBe("Prepare your next message. You can send it after this turn is recorded.");
  });

  it("is wired through the centralized availability decision", () => {
    expect(appSource).toContain("const conversationAvailability = decideConversationAvailability({");
    expect(appSource).toContain("const selectedInvocationAdmissionBlocked = !conversationAvailability.canSend;");
    expect(appSource).toContain(": composerPlaceholder({");
    expect(appSource).toContain('placeholder={selectedCanSteer');
    expect(appSource).toContain("availabilityCondition: conversationAvailability.condition");
    expect(appSource).toContain("disabled={isJourneyReloading}");
    expect(appSource).toContain("shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)");
  });
});
