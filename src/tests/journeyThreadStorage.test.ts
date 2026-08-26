import { beforeEach, describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";
import type { NautilusJourneyThread } from "../domain/nautilusJourneyThread";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const thread: NautilusJourneyThread = {
  schemaVersion: "1.0.0", threadId: "thread-one", journeyId: "journey-one", createdAt: "2026-08-26T00:00:00.000Z", activeGeneration: 1,
  generations: [{ generation: 1, status: "ready", piSessionId: "pi-one", mirrorConversationId: "mirror-one", createdAt: "2026-08-26T00:00:00.000Z" }],
};

describe("Journey thread storage boundary", () => {
  beforeEach(() => invoke.mockReset());

  it("uses only the dedicated journey-threads commands", async () => {
    const { loadNautilusJourneyThread, saveNautilusJourneyThread } = await import("../app/journeyThreadStorage");
    invoke.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined);
    expect(await loadNautilusJourneyThread("journey-one")).toBeUndefined();
    await saveNautilusJourneyThread(thread);
    expect(invoke.mock.calls.map(([command]) => command)).toEqual(["load_journey_thread", "save_journey_thread"]);
    expect(invoke.mock.calls.flat().join(" ")).not.toContain("journey_conversation");
  });

  it("does not make dedicated readiness wait for legacy conversation loading", () => {
    expect(appSource).toContain("await loadNautilusJourneyThread(selectedJourney)");
    expect(appSource).not.toContain("const [persistedConversation, dedicatedThread] = await Promise.all");
  });

  it("does not downgrade malformed dedicated authority to absent", async () => {
    const { loadNautilusJourneyThread } = await import("../app/journeyThreadStorage");
    invoke.mockResolvedValueOnce(JSON.stringify({ schemaVersion: "1.0.0", thread: {}, savedAt: new Date().toISOString() }));
    await expect(loadNautilusJourneyThread("journey-one")).rejects.toThrow("invalid");
  });
});
