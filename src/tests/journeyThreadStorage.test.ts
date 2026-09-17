import { beforeEach, describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";
import type { NautilusJourneyThread } from "../domain/nautilusJourneyThread";

const invoke = vi.fn();
const listen = vi.fn().mockResolvedValue(() => undefined);
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

const thread: NautilusJourneyThread = {
  schemaVersion: "1.0.0", threadId: "thread-one", journeyId: "journey-one", createdAt: "2026-08-26T00:00:00.000Z", activeGeneration: 1,
  generations: [{ generation: 1, status: "ready", piSessionId: "pi-one", mirrorConversationId: "mirror-one", createdAt: "2026-08-26T00:00:00.000Z" }],
};

describe("Journey thread storage boundary", () => {
  beforeEach(() => {
    invoke.mockReset();
    listen.mockReset();
    listen.mockResolvedValue(() => undefined);
  });

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

  it("provisions through one Journey-scoped native command", async () => {
    const { provisionNautilusJourneyThread } = await import("../app/journeyThreadStorage");
    const ready = {
      schemaVersion: "1.0.0", threadId: "thread-one", journeyId: "journey-one", createdAt: "2026-08-26T00:00:00.000Z", activeGeneration: 1,
      generations: [{ ...thread.generations[0], activationReceipt: { schemaVersion: "1.0.0", journeyId: "journey-one", threadId: "thread-one", generation: 1, piSessionId: "pi-one", mirrorConversationId: "mirror-one", mode: "mirror", commandAuthority: "installed", activatedAt: "2026-08-26T00:00:00.000Z" } }],
    };
    const progress = vi.fn();
    listen.mockImplementationOnce(async (_event, handler) => {
      handler({ payload: { journeyId: "journey-one", phase: "creating_pi_session" } });
      return () => undefined;
    });
    invoke.mockResolvedValueOnce(ready);
    await expect(provisionNautilusJourneyThread("journey-one", "Journey One", progress)).resolves.toEqual(ready);
    expect(progress).toHaveBeenCalledWith("creating_pi_session");
    expect(invoke).toHaveBeenCalledWith("provision_journey_thread", { journeyId: "journey-one", journeyName: "Journey One" });
  });

  it("inspects the exact generation-bound Pi transcript without a Desktop projection", async () => {
    const { inspectDedicatedPiTranscript } = await import("../app/journeyThreadStorage");
    const inspection = {
      schemaVersion: "0.1.0", leafEntryId: "assistant-1", activeEntryCount: 2,
      compactionCount: 0, unknownPromptEnvelopeCount: 0, incompleteUserEntryId: null, entries: [], turns: [],
    };
    invoke.mockResolvedValueOnce(inspection);

    await expect(inspectDedicatedPiTranscript(
      "journey-one", "thread-one", 2, "pi-two", "/app/pi-sessions/pi-two.jsonl",
    )).resolves.toEqual(inspection);
    expect(invoke).toHaveBeenCalledWith("inspect_dedicated_pi_transcript", {
      journeyId: "journey-one", threadId: "thread-one", generation: 2,
      sessionId: "pi-two", sessionFile: "/app/pi-sessions/pi-two.jsonl",
    });
  });

  it("does not downgrade malformed dedicated authority to absent", async () => {
    const { loadNautilusJourneyThread } = await import("../app/journeyThreadStorage");
    invoke.mockResolvedValueOnce(JSON.stringify({ schemaVersion: "1.0.0", thread: {}, savedAt: new Date().toISOString() }));
    await expect(loadNautilusJourneyThread("journey-one")).rejects.toThrow("invalid");
  });
});
