import { describe, expect, it } from "vitest";
import { composerPlaceholder } from "../app/composerPlaceholder";
import appSource from "../app/App.tsx?raw";

const ready = {
  requiresConversationRestore: false,
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

  it("gives restoration and recording precedence over less restrictive states", () => {
    expect(composerPlaceholder({
      ...ready,
      requiresConversationRestore: true,
      isRecordingTurn: true,
      isAgentResponding: true,
    })).toBe("This conversation must be restored before another message can be sent.");
    expect(composerPlaceholder({
      ...ready,
      isRecordingTurn: true,
      isAgentResponding: true,
    })).toBe("Prepare your next message. You can send it after this turn is recorded.");
  });

  it("is wired from existing evidence without changing composer authority", () => {
    expect(appSource).toContain("placeholder={composerPlaceholder({");
    expect(appSource).toContain("requiresConversationRestore:");
    expect(appSource).toContain("isRecordingTurn:");
    expect(appSource).toContain("isAgentResponding:");
    expect(appSource).toContain("hasUserMessage:");
    expect(appSource).toContain("disabled={isJourneyReloading}");
    expect(appSource).toContain("shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)");
  });
});
