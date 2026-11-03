import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  loadDedicatedJourneyConversationMetadata,
  saveDedicatedJourneyConversation,
} from "../app/journeyConversationStorage";
import { createProductionFinalizationPorts } from "../app/turnFinalizationPorts";
import {
  appendAndAcknowledgeProjection,
  type TurnFinalizationPorts,
} from "../app/turnFinalizationCoordinator";
import { createJourneySettlementAuthority } from "../app/journeySettlement";
import { createDedicatedJourneyConversation, type JourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { createPersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";
import { readyThread } from "./fixtures/readyThread";

/**
 * CR184: after the remount was gone, every remaining stall at the end of a turn was the renderer
 * parsing a 34 MB read of the stored projection on its main thread, eight times a turn. Four were
 * the history preservation every save did first; three wanted only identity and the turn ledger.
 */
function world() {
  const thread = readyThread("journey-a");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-run-1", "user-run-1", "assistant-run-1");
  const surface = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-run-1", role: "user", content: "Ask", createdAt: "2026-11-02T10:00:00Z" },
    { id: "assistant-run-1", role: "assistant", content: "Answer", createdAt: "2026-11-02T10:00:01Z" },
  );
  const authority = createJourneySettlementAuthority(
    createRunAuthority(correlation, base.liveIdentity, thread.generations[0]),
  );
  return { surface, authority };
}

beforeEach(() => invoke.mockReset());

describe("CR184: a save does not read the projection first", () => {
  it("writes the surface in one native call; the native save keeps the history it omits", async () => {
    const { surface } = world();
    invoke.mockResolvedValue(undefined);
    await saveDedicatedJourneyConversation(surface);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("save_dedicated_journey_conversation", expect.objectContaining({
      mode: "lifecycle",
    }));
    const written = JSON.parse((invoke.mock.calls[0]![1] as { payload: string }).payload);
    expect(written.conversation.messages.map((message: { id: string }) => message.id))
      .toEqual(surface.messages.map((message) => message.id));
    const save = tauriSource.slice(tauriSource.indexOf("fn save_dedicated_journey_conversation("));
    expect(save.slice(0, save.indexOf("write_durable_projection_at"))).toContain(
      "preserve_durable_conversation_history(&persisted, &mut parsed)",
    );
  });
});

describe("CR184: settlement reads only what it checks", () => {
  it("loads identity and the turn ledger through the metadata command", async () => {
    const { surface } = world();
    const stored = createPersistedJourneyConversation({ ...surface, messages: [] }, new Date("2026-11-02T10:00:02Z"));
    invoke.mockResolvedValueOnce(JSON.stringify(stored));
    const metadata = await loadDedicatedJourneyConversationMetadata(surface.journeyId, 1, surface.id);

    expect(invoke).toHaveBeenCalledWith("load_dedicated_journey_conversation_metadata", {
      journeyId: surface.journeyId, generation: 1, threadId: surface.id,
    });
    expect(metadata?.reconciliation.turns.map((turn) => turn.turnId)).toEqual(["turn-run-1"]);
    expect(tauriSource).toContain("            load_dedicated_journey_conversation_metadata,");
  });

  it("serves the settlement ports and the active evidence from metadata", async () => {
    const { authority } = world();
    invoke.mockResolvedValueOnce(null);
    const ports = createProductionFinalizationPorts({
      loadActiveEvidence: vi.fn(), saveProjection: vi.fn(), cleanupLease: vi.fn(),
    } as unknown as Parameters<typeof createProductionFinalizationPorts>[0]);
    await ports.loadPersistedProjection(authority);
    expect(invoke).toHaveBeenCalledWith("load_dedicated_journey_conversation_metadata", expect.anything());

    const evidence = appSource.slice(appSource.indexOf("async function loadActiveSettlementEvidence"));
    expect(evidence.slice(0, evidence.indexOf("validatePreFrontierSettlement"))).toContain(
      "loadDedicatedJourneyConversationMetadata(",
    );
  });

  it("returns the settled turn on the projection it was given, with the Mirror commitment", async () => {
    const { surface, authority } = world();
    const head: JourneyConversation = { ...surface, messages: [] };
    const saved: JourneyConversation[] = [];
    const ports = {
      deliverOutboxItem: async () => ({
        schemaVersion: "1.0.0", status: "accepted", conversationId: authority.mirrorConversationId,
        journeyId: authority.journeyId, insertedCount: 2, existingCount: 0,
        messages: [{ id: "user-run-1", state: "inserted" }, { id: "assistant-run-1", state: "inserted" }],
      }),
      loadPersistedProjection: async () => head,
      savePostFrontierProjection: async (projection: JourneyConversation) => { saved.push(projection); },
      loadJournal: async () => ({ schemaVersion: "0.1.0", records: [], savedAt: "2026-11-02T10:00:03Z" }),
      acknowledgeOutboxItem: async () => {},
    } as unknown as TurnFinalizationPorts;
    const summary = {
      schemaVersion: "1.0.0" as const, itemId: authority.turnId, journeyId: authority.journeyId,
      threadId: authority.threadId, generation: authority.generation,
      conversationId: authority.mirrorConversationId, createdAt: "2026-11-02T10:00:02Z",
    };

    const settled = await appendAndAcknowledgeProjection(surface, authority, summary, ports);

    expect(saved).toHaveLength(1);
    expect(settled.messages).toBe(surface.messages);
    expect(settled.reconciliation.turns.find((turn) => turn.turnId === authority.turnId)?.mirror.state)
      .toBe("committed");
  });
});
