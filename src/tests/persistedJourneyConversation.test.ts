import { describe, expect, it } from "vitest";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createPersistedJourneyConversation, parsePersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import { readyThread } from "./fixtures/readyThread";

function conversation() {
  return createDedicatedJourneyConversation({
    thread: readyThread("nautilus-harness"),
    initialMessages: [{ id: "u", role: "user", content: "hello", createdAt: "2026-08-26T10:00:00Z" }],
    now: new Date("2026-08-26T09:00:00Z"),
  });
}

describe("generation-scoped dedicated conversation persistence", () => {
  it("round-trips only the current dedicated shape", () => {
    const persisted = createPersistedJourneyConversation(conversation(), new Date("2026-08-26T11:00:00Z"));
    expect(persisted.schemaVersion).toBe("0.6.0");
    expect(parsePersistedJourneyConversation(persisted)).toEqual(persisted);
  });

  it("loads the attachment-free 0.5.0 schema as a compatibility baseline", () => {
    const legacy = { ...createPersistedJourneyConversation(conversation()), schemaVersion: "0.5.0" };
    expect(parsePersistedJourneyConversation(legacy)?.conversation.messages[0].content).toBe("hello");
  });

  it("preserves inert attachment provenance without reusable content", () => {
    const current = conversation();
    current.messages[0].attachments = [{
      schemaVersion: "0.1.0", attachmentId: "ctx-1", journeyId: "nautilus-harness",
      relativePath: "docs/brief.md", displayName: "brief.md", mediaType: "text/markdown",
      sizeBytes: 5, sha256: "a".repeat(64), capturedAt: "2026-08-28T12:00:00.000Z",
    }];
    const parsed = parsePersistedJourneyConversation(createPersistedJourneyConversation(current));
    expect(parsed?.conversation.messages[0].attachments?.[0].relativePath).toBe("docs/brief.md");
    const malformed = createPersistedJourneyConversation(current) as unknown as { conversation: { messages: Array<{ attachments: Array<Record<string, unknown>> }> } };
    malformed.conversation.messages[0].attachments[0].content = "must not persist";
    expect(parsePersistedJourneyConversation(malformed)).toBeUndefined();
  });

  it("preserves validated context and certified Mirror mode", () => {
    const current = {
      ...conversation(),
      authoritativeContextStats: {
        piSessionId: "pi-nautilus-harness", generation: 1, providerModel: "model", capturedAt: "now",
        usage: { tokens: 10, contextWindow: 100, percent: 10 },
      },
      certifiedMirrorMode: { mode: "mirror" as const, certifiedAt: "now", sourceId: "surface" },
    };
    expect(parsePersistedJourneyConversation(createPersistedJourneyConversation(current))?.conversation)
      .toMatchObject({ authoritativeContextStats: { usage: { tokens: 10 } }, certifiedMirrorMode: { mode: "mirror" } });
  });

  it("preserves bounded runtime surface activity without using it as authority", () => {
    const current = {
      ...conversation(),
      importedActivity: {
        schemaVersion: "0.1.0" as const, source: "mirror" as const, sourceConversationId: "mirror-nautilus-harness",
        events: [{ id: "surface", kind: "ariad_surface", timestamp: "now", title: "Surface", source: { system: "mirror" as const, table: "runtime", id: "surface" } }],
      },
    };
    const parsed = parsePersistedJourneyConversation(createPersistedJourneyConversation(current));
    expect(parsed?.conversation.importedActivity?.events).toHaveLength(1);
    expect(parsed?.conversation.liveIdentity.mirrorConversationId).toBe("mirror-nautilus-harness");
  });

  it("rejects stale dedicated reconciliation authority", () => {
    const persisted = createPersistedJourneyConversation(conversation()) as unknown as { conversation: { reconciliation: { authority: { piSessionId: string } } } };
    persisted.conversation.reconciliation.authority.piSessionId = "other";
    expect(parsePersistedJourneyConversation(persisted)).toBeUndefined();
  });

  it.each(["0.1.0", "0.2.0", "0.3.0", "0.4.0"])("rejects retired parity schema %s", (schemaVersion) => {
    const persisted = { ...createPersistedJourneyConversation(conversation()), schemaVersion };
    expect(parsePersistedJourneyConversation(persisted)).toBeUndefined();
  });

  it("rejects missing dedicated native authority", () => {
    const persisted = createPersistedJourneyConversation(conversation()) as unknown as { conversation: { liveIdentity: { activationReceiptActivatedAt?: string } } };
    delete persisted.conversation.liveIdentity.activationReceiptActivatedAt;
    expect(parsePersistedJourneyConversation(persisted)).toBeUndefined();
  });
});
