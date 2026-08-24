import { describe, expect, it } from "vitest";
import {
  createMissionExtractionPacket,
  createUserConversationMessage,
  grammarStateFromViewModel,
  type NautilusGrammarState,
} from "../agent/piTaskPacket";
import type { NautilusViewModel } from "../domain/nautilusViewModel";

const currentState: NautilusGrammarState = {
  identity: {
    name: "Nautilus",
    methodVersion: "0.1.0-experimental",
    protocolVersion: "0.1.0",
    schemaVersion: "0.1.0",
    grammarStatus: "experimental",
  },
};

describe("Pi task packet contract", () => {
  it("creates a bounded manual handoff packet for Mission extraction", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [
        {
          id: "msg-1",
          role: "user",
          content: "I want to clarify what the Nautilus app should do next.",
          createdAt: "2026-08-21T00:00:00.000Z",
        },
      ],
    });

    expect(packet.schemaVersion).toBe("0.1.0");
    expect(packet.operation).toBe("extract_mission");
    expect(packet.safetyMode).toBe("manual_handoff");
    expect(packet.constraints).toContain("Do not execute commands.");
    expect(packet.constraints).toContain("Do not require Mirror context.");
    expect(packet.constraints).toContain("Do not invoke Pi automatically from the Harness.");
    expect(packet.currentState.identity.name).toBe("Nautilus");
  });

  it("creates a user conversation message from natural language", () => {
    const message = createUserConversationMessage(
      "I want to formulate the next Nautilus mission.",
      new Date("2026-08-21T00:00:00.000Z"),
    );

    expect(message.id).toBe("user-2026-08-21T00:00:00.000Z");
    expect(message.role).toBe("user");
    expect(message.content).toBe("I want to formulate the next Nautilus mission.");
  });

  it("derives packet grammar state from the current GUI view model", () => {
    const model: NautilusViewModel = {
      status: "compatible",
      identity: {
        name: "Nautilus",
        methodVersion: "0.1.0-experimental",
        protocolVersion: "0.1.0",
        schemaVersion: "0.1.0",
        grammarStatus: "experimental",
        compatibility: "compatible",
      },
      mission: {
        id: "mission-001",
        title: "Formulate the first Nautilus mission",
        purpose: "Prove that Nautilus can name a directed intention before execution.",
        status: "formulated",
      },
      errors: [],
      executionAvailable: false,
    };

    const state = grammarStateFromViewModel(model);

    expect(state.identity.name).toBe("Nautilus");
    expect(state.missionDraft?.id).toBe("mission-001");
    expect(state.missionDraft?.status).toBe("formulated");
  });
});
