import { describe, expect, it } from "vitest";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";
import { createJourneyConversation } from "../domain/journeyConversation";
import { createContinuityEnduranceInspection } from "./fixtures/continuityEndurance";

describe("terminal-aligned continuity endurance rehearsal", () => {
  it("rebuilds fifty native turns and an interrupted admitted tail without projection authority", () => {
    const metadata = createJourneyConversation({
      journeyId: "endurance-journey",
      initialMessages: [
        { id: "projection-ghost-user", role: "user", content: "ghost", createdAt: "2026-09-18T09:00:00.000Z" },
        { id: "projection-ghost-assistant", role: "assistant", content: "ghost", createdAt: "2026-09-18T09:00:01.000Z" },
      ],
      now: new Date("2026-09-18T09:00:00.000Z"),
    });

    const rebuilt = projectPiBackedConversationSurface(
      metadata,
      createContinuityEnduranceInspection(),
    );

    expect(rebuilt.messages).toHaveLength(101);
    expect(rebuilt.messages[0]).toMatchObject({
      id: "pi-native-user-1",
      role: "user",
      content: "Question 1",
    });
    expect(rebuilt.messages[99]).toMatchObject({
      id: "pi-native-assistant-50",
      role: "assistant",
      content: "Answer 50",
    });
    expect(rebuilt.messages[100]).toMatchObject({
      id: "pi-native-user-incomplete",
      role: "user",
      content: "Admitted before interruption",
    });
    expect(rebuilt.messages.some((message) => message.id.startsWith("projection-ghost"))).toBe(false);
    expect(rebuilt.messages.map((message) => message.content)).toEqual([
      ...Array.from({ length: 50 }, (_, offset) => [
        `Question ${offset + 1}`,
        `Answer ${offset + 1}`,
      ]).flat(),
      "Admitted before interruption",
    ]);
  });
});
