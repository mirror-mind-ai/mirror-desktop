import { describe, expect, it } from "vitest";
import { classifyAssistantTurnProximity } from "../app/turnProximity";

const messages = [
  { id: "user-1", role: "user" as const },
  { id: "assistant-1", role: "assistant" as const },
  { id: "user-2", role: "user" as const },
  { id: "assistant-2", role: "assistant" as const },
  { id: "user-3", role: "user" as const },
  { id: "assistant-3", role: "assistant" as const },
];

describe("assistant turn proximity", () => {
  it("keeps the active and latest completed turns full while compacting older turns", () => {
    expect(classifyAssistantTurnProximity(messages, "assistant-3", true)).toEqual(new Map([
      ["assistant-1", "historical"],
      ["assistant-2", "latest_completed"],
      ["assistant-3", "active"],
    ]));
  });

  it("treats the retained settled runtime turn as latest completed", () => {
    expect(classifyAssistantTurnProximity(messages, "assistant-3", false).get("assistant-3")).toBe("latest_completed");
    expect(classifyAssistantTurnProximity(messages, undefined, false).get("assistant-3")).toBe("latest_completed");
  });
});
