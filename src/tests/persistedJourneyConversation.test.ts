import { describe, expect, it } from "vitest";
import { createJourneyConversation } from "../domain/journeyConversation";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import type { ConversationMessage } from "../agent/piTaskPacket";

const opening: ConversationMessage = {
  id: "assistant-opening",
  role: "assistant",
  content: "Opening",
  createdAt: "2026-08-21T00:00:00.000Z",
};

describe("persisted Journey conversation", () => {
  it("wraps one Journey conversation in a versioned persistence payload", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T10:00:00.000Z"),
    });

    expect(createPersistedJourneyConversation(conversation, new Date("2026-08-22T10:05:00.000Z"))).toEqual({
      schemaVersion: "0.5.0",
      conversation,
      savedAt: "2026-08-22T10:05:00.000Z",
    });
  });

  it("persists an explicit live conversation identity", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T10:00:00.000Z"),
    });

    expect(conversation.liveIdentity).toEqual({
      schemaVersion: "0.1.0",
      journeyId: "nautilus",
      harnessConversationId: conversation.id,
      piSessionId: "nautilus-nautilus",
      generation: 0,
      origin: "new",
    });
  });

  it("migrates legacy payloads to an explicit deterministic live identity", () => {
    const parsed = parsePersistedJourneyConversation({
      schemaVersion: "0.1.0",
      savedAt: "2026-08-22T10:05:00.000Z",
      conversation: {
        id: "conversation-nautilus",
        journeyId: "nautilus",
        createdAt: "2026-08-22T10:00:00.000Z",
        messages: [opening],
      },
    });

    expect(parsed?.schemaVersion).toBe("0.5.0");
    expect(parsed?.conversation.liveIdentity).toMatchObject({
      harnessConversationId: "conversation-nautilus",
      piSessionId: "nautilus-nautilus",
      origin: "legacy",
    });
    expect(parsed?.conversation.reconciliation).toMatchObject({
      schemaVersion: "0.1.0",
      classification: "uninitialized",
      authority: {
        journeyId: "nautilus",
        harnessConversationId: "conversation-nautilus",
        piSessionId: "nautilus-nautilus",
        generation: 0,
      },
    });
  });

  it("persists only validated Pi-authoritative context stats", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T10:00:00.000Z"),
    });
    conversation.authoritativeContextStats = {
      piSessionId: conversation.liveIdentity.piSessionId,
      generation: 0,
      providerModel: "openai-codex/gpt-5.4-mini",
      capturedAt: "2026-08-22T10:04:00.000Z",
      usage: { tokens: 14880, contextWindow: 272000, percent: 5.47 },
    };

    const parsed = parsePersistedJourneyConversation(createPersistedJourneyConversation(conversation));

    expect(parsed?.conversation.authoritativeContextStats).toEqual(conversation.authoritativeContextStats);
  });

  it("persists certified active mode state without inferring it from messages", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T10:00:00.000Z"),
    });
    conversation.certifiedMirrorMode = {
      mode: "builder",
      certifiedAt: "2026-08-22T10:04:00.000Z",
      sourceId: "runtime-build",
    };

    const parsed = parsePersistedJourneyConversation(createPersistedJourneyConversation(conversation));

    expect(parsed?.conversation.certifiedMirrorMode).toEqual(conversation.certifiedMirrorMode);
  });

  it("preserves optional imported activity while parsing the current conversation shape", () => {
    const parsed = parsePersistedJourneyConversation({
      schemaVersion: "0.1.0",
      savedAt: "2026-08-22T10:05:00.000Z",
      conversation: {
        id: "conversation-nautilus",
        journeyId: "nautilus",
        createdAt: "2026-08-22T10:00:00.000Z",
        messages: [opening],
        importedActivity: {
          schemaVersion: "0.1.0",
          source: "mirror",
          sourceConversationId: "mirror-conversation",
          events: [
            {
              id: "activity-1",
              kind: "ariad_surface",
              timestamp: "2026-08-22T10:01:00.000Z",
              title: "Ariad surface",
              source: { system: "mirror", table: "messages", id: "message-1" },
              content: "<<<ARIAD:PLAN_CHECKPOINT>>>...<<<END:PLAN_CHECKPOINT>>>",
            },
          ],
        },
      },
    });

    expect(parsed?.conversation.importedActivity?.events[0].kind).toBe("ariad_surface");
  });

  it("repairs legacy display-prefixed Mirror authority to the native imported id", () => {
    const parsed = parsePersistedJourneyConversation({
      schemaVersion: "0.5.0",
      savedAt: "2026-08-22T10:05:00.000Z",
      conversation: {
        id: "nautilus-mirror-native-1",
        journeyId: "nautilus",
        createdAt: "2026-08-22T10:00:00.000Z",
        messages: [opening],
        liveIdentity: {
          schemaVersion: "0.1.0",
          journeyId: "nautilus",
          harnessConversationId: "nautilus-mirror-native-1",
          piSessionId: "nautilus-nautilus",
          mirrorConversationId: "mirror-native-1",
          generation: 0,
          origin: "mirror_import",
        },
        importedActivity: {
          schemaVersion: "0.1.0",
          source: "mirror",
          sourceConversationId: "native-1",
          events: [],
        },
        reconciliation: {
          schemaVersion: "0.1.0",
          authority: {
            journeyId: "nautilus",
            harnessConversationId: "nautilus-mirror-native-1",
            piSessionId: "nautilus-nautilus",
            mirrorConversationId: "mirror-native-1",
            generation: 0,
          },
          checkpoints: {},
          turns: [],
          advancement: {},
          classification: "uninitialized",
          classifiedAt: "2026-08-22T10:00:00.000Z",
          reasonCodes: [],
        },
      },
    });

    expect(parsed?.conversation.liveIdentity.mirrorConversationId).toBe("native-1");
    expect(parsed?.conversation.reconciliation.authority.mirrorConversationId).toBe("native-1");
  });

  it("migrates a Mirror import without falsely claiming Pi parity", () => {
    const parsed = parsePersistedJourneyConversation({
      schemaVersion: "0.2.0",
      savedAt: "2026-08-22T10:05:00.000Z",
      conversation: {
        id: "conversation-nautilus",
        journeyId: "nautilus",
        createdAt: "2026-08-22T10:00:00.000Z",
        messages: [opening],
        importedActivity: {
          schemaVersion: "0.1.0",
          source: "mirror",
          sourceConversationId: "mirror-conversation",
          events: [],
        },
      },
    });

    expect(parsed?.conversation.reconciliation).toMatchObject({
      classification: "uninitialized",
      authority: { mirrorConversationId: "mirror-conversation" },
      checkpoints: {},
    });
  });

  it("rejects current payloads with stale reconciliation authority", () => {
    const conversation = createJourneyConversation({
      journeyId: "nautilus",
      initialMessages: [opening],
      now: new Date("2026-08-22T10:00:00.000Z"),
    });
    const payload = createPersistedJourneyConversation(conversation);
    payload.conversation.reconciliation.authority.generation = 99;

    expect(parsePersistedJourneyConversation(payload)).toBeUndefined();
  });

  it("rejects unsupported or malformed persisted payloads", () => {
    expect(parsePersistedJourneyConversation({ schemaVersion: "9.9.9" })).toBeUndefined();
    expect(parsePersistedJourneyConversation({ schemaVersion: "0.1.0", conversation: { journeyId: "nautilus" } })).toBeUndefined();
  });
});
