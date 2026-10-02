import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  inspectDedicatedPiTranscript,
} from "../app/journeyThreadStorage";
import {
  loadDedicatedJourneyConversation,
  saveDedicatedJourneyConversation,
} from "../app/journeyConversationStorage";
import { createPersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { ConversationMessage } from "../agent/piTaskPacket";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

const authority = {
  journeyId: "mirror-desktop", threadId: "desktop-thread-123", generation: 4,
  sessionId: "pi-session-123", sessionFile: "/app/pi-session-123.jsonl",
};

function message(id: string, role: ConversationMessage["role"] = "user"): ConversationMessage {
  return { id, role, content: id, createdAt: "2026-10-02T10:00:00.000Z" };
}

function conversation(messages: ConversationMessage[]): JourneyConversation {
  return {
    id: authority.threadId, journeyId: authority.journeyId, createdAt: "2026-09-20T00:00:00.000Z",
    messages,
    liveIdentity: {
      schemaVersion: "0.1.0", journeyId: authority.journeyId, harnessConversationId: authority.threadId,
      piSessionId: authority.sessionId, piSessionFile: authority.sessionFile,
      generation: authority.generation, origin: "new",
      mirrorConversationId: "mirror-conversation-123", activationReceiptActivatedAt: "2026-09-20T00:00:00.000Z",
    },
    reconciliation: {
      schemaVersion: "0.1.0",
      authority: {
        journeyId: authority.journeyId, harnessConversationId: authority.threadId,
        piSessionId: authority.sessionId, generation: authority.generation,
        mirrorConversationId: "mirror-conversation-123",
      },
      checkpoints: {}, turns: [], classification: "uninitialized",
      classifiedAt: "2026-09-20T00:00:00.000Z", reasonCodes: [],
    },
  } as JourneyConversation;
}

describe("the current Segment as the default working set", () => {
  beforeEach(() => invoke.mockReset());

  it("asks the native inspection for a scope instead of always reading the whole branch", async () => {
    invoke.mockResolvedValue({ schemaVersion: "0.1.0", entries: [], turns: [] });
    await inspectDedicatedPiTranscript(
      authority.journeyId, authority.threadId, authority.generation,
      authority.sessionId, authority.sessionFile, false, "current_segment",
    );
    expect(invoke).toHaveBeenCalledWith("inspect_dedicated_pi_transcript", {
      journeyId: authority.journeyId, threadId: authority.threadId, generation: authority.generation,
      sessionId: authority.sessionId, sessionFile: authority.sessionFile,
      allowInactiveGeneration: false, scope: "current_segment",
    });
  });

  it("reads the complete branch when no scope is named, as every existing caller does", async () => {
    invoke.mockResolvedValue({ schemaVersion: "0.1.0", entries: [], turns: [] });
    await inspectDedicatedPiTranscript(
      authority.journeyId, authority.threadId, authority.generation,
      authority.sessionId, authority.sessionFile,
    );
    expect(invoke).toHaveBeenCalledWith("inspect_dedicated_pi_transcript", expect.objectContaining({
      allowInactiveGeneration: false, scope: "complete",
    }));
  });

  it("never lets a bounded surface delete the durable history it did not load", async () => {
    const stored = createPersistedJourneyConversation(
      conversation([message("pi-1"), message("pi-2"), message("pi-3", "assistant")]),
      new Date("2026-10-02T10:00:00.000Z"),
    );
    invoke.mockResolvedValueOnce(JSON.stringify(stored)).mockResolvedValueOnce(undefined);
    await saveDedicatedJourneyConversation(conversation([message("pi-3", "assistant"), message("pi-4")]));

    expect(invoke).toHaveBeenNthCalledWith(1, "load_dedicated_journey_conversation", {
      journeyId: authority.journeyId, generation: authority.generation, threadId: authority.threadId,
    });
    const written = JSON.parse((invoke.mock.calls[1]![1] as { payload: string }).payload);
    expect(written.conversation.messages.map((item: ConversationMessage) => item.id))
      .toEqual(["pi-1", "pi-2", "pi-3", "pi-4"]);
  });

  it("writes the surface unchanged when it already covers the stored history", async () => {
    const complete = conversation([message("pi-1"), message("pi-2")]);
    invoke.mockResolvedValueOnce(JSON.stringify(createPersistedJourneyConversation(complete))).mockResolvedValueOnce(undefined);
    await saveDedicatedJourneyConversation(complete);
    const written = JSON.parse((invoke.mock.calls[1]![1] as { payload: string }).payload);
    expect(written.conversation.messages.map((item: ConversationMessage) => item.id)).toEqual(["pi-1", "pi-2"]);
  });

  it("still writes when there is nothing stored to preserve", async () => {
    invoke.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined);
    await saveDedicatedJourneyConversation(conversation([message("pi-1")]));
    const written = JSON.parse((invoke.mock.calls[1]![1] as { payload: string }).payload);
    expect(written.conversation.messages.map((item: ConversationMessage) => item.id)).toEqual(["pi-1"]);
  });

  it("writes rather than failing when the stored projection cannot be read", async () => {
    invoke.mockRejectedValueOnce(new Error("dedicated_projection_unavailable")).mockResolvedValueOnce(undefined);
    await saveDedicatedJourneyConversation(conversation([message("pi-1")]));
    expect(invoke).toHaveBeenNthCalledWith(2, "save_dedicated_journey_conversation", expect.objectContaining({
      mode: "lifecycle",
    }));
  });

  it("loads the stored projection without the maps Pi rebuilds", async () => {
    const stored = {
      schemaVersion: "0.9.0",
      savedAt: "2026-10-02T10:00:00.000Z",
      conversation: {
        ...conversation([message("pi-1", "assistant")]),
        responseModels: { "pi-1": { provider: "anthropic", model: "claude" } },
      },
    };
    invoke.mockResolvedValueOnce(JSON.stringify(stored));
    const loaded = await loadDedicatedJourneyConversation(
      authority.journeyId, authority.generation, authority.threadId,
    );
    expect(loaded?.messages).toHaveLength(1);
    expect(loaded).not.toHaveProperty("responseModels");
  });
});

// CR114 slice 0: publishing Segments overwrote the active Conversation projection with the
// current Segment's payload, whose turn ledger holds only that Segment's turns. The ledger is
// durable Desktop metadata with no other source, and `refresh_conversation_segments` reads the
// manifest's turn attribution from exactly that file, so the truncation fed itself.
describe("Segment publication leaves durable Conversation metadata alone", () => {
  it("no longer activates the current Segment payload over the active projection", () => {
    expect(tauriSource).not.toContain("Could not activate bounded current Conversation Segment.");
    expect(tauriSource).not.toContain("write_durable_projection_at(&active_projection_path, current_payload.as_bytes(), nonce)");
  });

  it("still publishes the Segment files and their completion receipt", () => {
    expect(tauriSource).toContain("Could not durably publish Conversation Segment projection.");
    expect(tauriSource).toContain("Could not durably publish Conversation Segment receipt.");
  });
});

describe("the Journey opens on its current chapter", () => {
  it("opens with the bounded scope and keeps the complete read for an explicit request", () => {
    expect(appSource).toContain('"current_segment"');
    expect(appSource).toContain('"complete"');
    expect(appSource).toContain("loadedHistoryScopeRef");
  });

  it("offers earlier history from what the inspection says it omitted", () => {
    expect(appSource).toContain("window?.omittedChapterCount");
  });

  it("decides a chapter-evidence refresh from Pi's own compaction count, not from drawn dividers", () => {
    // A bounded surface draws one divider, so counting dividers would make every visit look
    // like a stale manifest and rewrite it from a truncated ledger.
    expect(appSource).toContain("piClosedChapterCount");
    expect(appSource).not.toContain("const closedChapterCount = Object.keys(presentedConversation.chapterDividers ?? {}).length");
  });
});
