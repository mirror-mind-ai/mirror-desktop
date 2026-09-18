import { describe, expect, it } from "vitest";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";
import { deriveInactiveNativeAttemptCandidate } from "../domain/inactiveNativeAttempt";
import { createJourneyConversation } from "../domain/journeyConversation";
import type { DedicatedPiTranscriptInspection } from "../app/journeyThreadStorage";

describe("failed native leaf restore integration", () => {
  it("restores the admitted user and derives interruption notice evidence from an assistant error leaf", () => {
    const metadata = createJourneyConversation({
      journeyId: "rs018-rehearsal-a",
      initialMessages: [],
      now: new Date("2026-09-18T19:25:00Z"),
    });
    const inspection: DedicatedPiTranscriptInspection = {
      schemaVersion: "0.1.0",
      leafEntryId: "assistant-error",
      activeEntryCount: 4,
      compactionCount: 0,
      unknownPromptEnvelopeCount: 0,
      incompleteUserEntryId: "user-admitted",
      entries: [
        {
          entryId: "user-admitted", parentEntryId: "thinking-level", role: "user",
          visibleText: "Baseline CR049", promptEnvelope: "mirror_desktop", stopReason: null,
          timestamp: "2026-09-18T19:25:16Z", nativeContent: [], toolCallId: null, toolName: null, isError: null,
        },
        {
          entryId: "assistant-error", parentEntryId: "user-admitted", role: "assistant",
          visibleText: "", promptEnvelope: null, stopReason: "error",
          timestamp: "2026-09-18T19:25:19Z", nativeContent: [], toolCallId: null, toolName: null, isError: null,
        },
      ],
      turns: [],
    };

    const restored = projectPiBackedConversationSurface(metadata, inspection);
    const candidate = deriveInactiveNativeAttemptCandidate({
      journeyId: "rs018-rehearsal-a",
      threadId: "nautilus-thread-rs018-rehearsal-a",
      generation: 1,
      piSessionId: "isolated-session",
    }, inspection);

    expect(restored.messages).toEqual([{
      id: "pi-user-admitted",
      role: "user",
      content: "Baseline CR049",
      createdAt: "2026-09-18T19:25:16Z",
    }]);
    expect(candidate).toMatchObject({
      userEntryId: "user-admitted",
      leafEntryId: "assistant-error",
    });
  });
});
