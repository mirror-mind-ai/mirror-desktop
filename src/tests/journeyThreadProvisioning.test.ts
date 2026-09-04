import { describe, expect, it } from "vitest";
import {
  createJourneyActivationReceipt,
  dedicatedNativeNames,
  verifyJourneyActivationReceipt,
} from "../domain/journeyThreadProvisioning";

describe("Journey-first thread provisioning", () => {
  it("derives deterministic bounded presentation names", () => {
    const first = dedicatedNativeNames("Livro: Liderança Soberana / edição definitiva", 1);
    expect(first).toEqual(dedicatedNativeNames("Livro: Liderança Soberana / edição definitiva", 1));
    expect(first.piSessionName).toContain("Mirror Desktop");
    expect(first.mirrorConversationName).toContain("Generation 1");
    expect(first.piSessionName.length).toBeLessThanOrEqual(80);
    expect(first.mirrorConversationName.length).toBeLessThanOrEqual(100);
  });

  it("binds activation to every native authority coordinate", () => {
    const receipt = createJourneyActivationReceipt({
      journeyId: "journey-one", threadId: "thread-one", generation: 1,
      piSessionId: "pi-one", mirrorConversationId: "mirror-one",
      activatedAt: "2026-08-26T00:00:00.000Z",
    });
    expect(verifyJourneyActivationReceipt(receipt, {
      journeyId: "journey-one", threadId: "thread-one", generation: 1,
      piSessionId: "pi-one", mirrorConversationId: "mirror-one",
    })).toBe(true);
    expect(verifyJourneyActivationReceipt(receipt, {
      journeyId: "journey-one", threadId: "thread-one", generation: 1,
      piSessionId: "other", mirrorConversationId: "mirror-one",
    })).toBe(false);
    expect(JSON.stringify(receipt)).not.toMatch(/prompt|response|transcript|contextBody|reasoning/i);
  });
});
