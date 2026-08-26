import { describe, expect, it } from "vitest";
import {
  createPersistedNautilusJourneyThread,
  parsePersistedNautilusJourneyThread,
} from "../domain/persistedNautilusJourneyThread";
import type { NautilusJourneyThread } from "../domain/nautilusJourneyThread";

const thread: NautilusJourneyThread = {
  schemaVersion: "1.0.0", threadId: "thread-one", journeyId: "journey-one", createdAt: "2026-08-26T00:00:00.000Z", activeGeneration: 1,
  generations: [{ generation: 1, status: "ready", piSessionId: "pi-one", mirrorConversationId: "mirror-one", createdAt: "2026-08-26T00:00:00.000Z", activatedAt: "2026-08-26T00:01:00.000Z" }],
};

describe("persisted Nautilus Journey thread", () => {
  it("round trips a Journey-bound envelope", () => {
    const value = createPersistedNautilusJourneyThread(thread, new Date("2026-08-26T01:00:00.000Z"));
    expect(parsePersistedNautilusJourneyThread(value, "journey-one")).toEqual(value);
  });

  it("rejects malformed and cross-Journey state", () => {
    const value = createPersistedNautilusJourneyThread(thread);
    expect(parsePersistedNautilusJourneyThread(value, "other")).toBeUndefined();
    expect(parsePersistedNautilusJourneyThread({ ...value, schemaVersion: "0" }, "journey-one")).toBeUndefined();
    expect(parsePersistedNautilusJourneyThread({ ...value, thread: { ...thread, activeGeneration: 2 } }, "journey-one")).toBeUndefined();
  });
});
