import { describe, expect, it } from "vitest";
import { composerPlaceholder } from "../app/composerPlaceholder";
import appSource from "../app/App.tsx?raw";

const ready = { isAgentResponding: false };

describe("composer placeholder", () => {
  it("uses one stable invitation for an inactive Conversation", () => {
    expect(composerPlaceholder(ready)).toBe("What would you like to do next?");
  });

  it("changes only for a genuinely active response", () => {
    expect(composerPlaceholder({ isAgentResponding: true }))
      .toBe("Prepare your next message. You can send it when the current response is complete.");
  });

  it("does not narrate hydration, authority, capacity, or synchronization state", () => {
    const source = composerPlaceholder.toString();
    expect(source).not.toContain("availabilityCondition");
    expect(source).not.toContain("isRecordingTurn");
    expect(source).not.toContain("hasUserMessage");
    expect(source).not.toContain("checking");
    expect(source).not.toContain("authority");
    expect(source).not.toContain("slots");
  });

  it("keeps steering explicit while ordinary composition remains stable", () => {
    expect(appSource).toContain('placeholder={selectedCanSteer');
    expect(appSource).toContain('? "Send a correction to the active turn"');
    expect(appSource).toContain(": composerPlaceholder({");
    expect(appSource).toContain('isAgentResponding: isStreaming || agentRun.status === "running"');
    expect(appSource).not.toContain("availabilityCondition: conversationAvailability.condition");
    expect(appSource).not.toContain("hasUserMessage: messages.some");
    expect(appSource).toContain("shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)");
  });
});
