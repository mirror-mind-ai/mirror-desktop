import { describe, expect, it } from "vitest";
import {
  createJourneyConversation,
  createDedicatedJourneyConversation,
  replaceJourneyConversationMessages,
  summarizeJourneyConversation,
} from "../domain/journeyConversation";
import type { ConversationMessage } from "../agent/piTaskPacket";

const opening: ConversationMessage = {
  id: "assistant-opening",
  role: "assistant",
  content: "Opening",
  createdAt: "2026-08-21T00:00:00.000Z",
};

const userMessage: ConversationMessage = {
  id: "user-1",
  role: "user",
  content: "Hello",
  createdAt: "2026-08-21T00:01:00.000Z",
};

describe("journey conversation lifecycle", () => {
  it("creates one ephemeral conversation for a Journey", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T00:00:00.000Z"),
    });

    expect(conversation).toEqual({
      id: "journey-conversation-nautilus-2026-08-22T00:00:00.000Z",
      journeyId: "nautilus",
      createdAt: "2026-08-22T00:00:00.000Z",
      messages: [opening],
      liveIdentity: {
        schemaVersion: "0.1.0",
        journeyId: "nautilus",
        harnessConversationId: "journey-conversation-nautilus-2026-08-22T00:00:00.000Z",
        piSessionId: "nautilus-nautilus",
        generation: 0,
        origin: "new",
      },
      reconciliation: {
        schemaVersion: "0.1.0",
        authority: {
          journeyId: "nautilus",
          harnessConversationId: "journey-conversation-nautilus-2026-08-22T00:00:00.000Z",
          piSessionId: "nautilus-nautilus",
          generation: 0,
        },
        checkpoints: {},
        turns: [],
        classification: "uninitialized",
        classifiedAt: "2026-08-22T00:00:00.000Z",
        reasonCodes: [],
      },
    });
  });

  it("uses the exact dedicated native pair for a ready Journey", () => {
    const conversation = createDedicatedJourneyConversation({
      thread: {
        schemaVersion: "1.0.0", threadId: "thread-one", journeyId: "nautilus", createdAt: "2026-08-22T00:00:00.000Z", activeGeneration: 1,
        generations: [{ generation: 1, status: "ready", piSessionId: "pi-dedicated", mirrorConversationId: "mirror-dedicated", createdAt: "2026-08-22T00:00:00.000Z" }],
      },
      initialMessages: [], now: new Date("2026-08-22T00:00:00.000Z"),
    });
    expect(conversation.liveIdentity).toMatchObject({ piSessionId: "pi-dedicated", mirrorConversationId: "mirror-dedicated", generation: 1 });
    expect(conversation.messages).toEqual([]);
  });

  it("summarizes fresh and dirty state from messages", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T00:00:00.000Z"),
    });
    const dirtyConversation = replaceJourneyConversationMessages(conversation, [opening, userMessage]);

    expect(summarizeJourneyConversation(conversation)).toMatchObject({
      messageCount: 1,
      userMessageCount: 0,
      assistantMessageCount: 1,
      isFresh: true,
      isDirty: false,
    });
    expect(summarizeJourneyConversation(dirtyConversation)).toMatchObject({
      messageCount: 2,
      userMessageCount: 1,
      assistantMessageCount: 1,
      isFresh: false,
      isDirty: true,
    });
  });

});
