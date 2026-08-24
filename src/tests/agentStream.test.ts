import { describe, expect, it } from "vitest";
import { mockPiAgentStream, reduceStreamedAssistantMessage } from "../agent/agentStream";
import { createMissionExtractionPacket, type NautilusGrammarState } from "../agent/piTaskPacket";

const currentState: NautilusGrammarState = {
  identity: {
    name: "Nautilus",
    methodVersion: "0.1.0-experimental",
    protocolVersion: "0.1.0",
    schemaVersion: "0.1.0",
    grammarStatus: "experimental",
  },
};

describe("agent stream contract", () => {
  it("streams message deltas, grammar update, and done from the mock provider", async () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [
        {
          id: "msg-1",
          role: "user",
          content: "Quero entender a próxima realização do Nautilus.",
          createdAt: "2026-08-21T00:00:00.000Z",
        },
      ],
    });
    const events = [];

    for await (const event of mockPiAgentStream(packet)) {
      events.push(event);
    }

    expect(events.some((event) => event.type === "message_delta")).toBe(true);
    expect(events.some((event) => event.type === "grammar_update")).toBe(true);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("reduces message deltas into a visible assistant message", () => {
    const reduced = reduceStreamedAssistantMessage("Olá", { type: "message_delta", content: ", Nautilus." });

    expect(reduced).toBe("Olá, Nautilus.");
  });
});
