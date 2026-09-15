import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { loadConversationSegments, refreshConversationSegments } from "../app/conversationSegmentStorage";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

const authority = {
  journeyId: "mirror-desktop", threadId: "desktop-thread-123", generation: 1,
  sessionId: "pi-session-123", sessionFile: "/app/pi-session-123.jsonl",
};
const manifest = {
  schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-123",
  generation: 1, piSessionId: "pi-session-123", sourceEntryCount: 2,
  segments: [{ segment: 1, segmentId: "segment-1", status: "current", sourceFromEntryId: "entry-1", sourceThroughEntryId: "entry-2" }],
};

describe("Conversation Segment persistence", () => {
  beforeEach(() => invoke.mockReset());

  it("publishes and loads only exact generation-scoped manifests", async () => {
    invoke.mockResolvedValueOnce(manifest).mockResolvedValueOnce(manifest);
    await expect(refreshConversationSegments(authority)).resolves.toEqual(manifest);
    await expect(loadConversationSegments(authority)).resolves.toEqual(manifest);
    expect(invoke).toHaveBeenNthCalledWith(1, "refresh_conversation_segments", authority);
    expect(invoke).toHaveBeenNthCalledWith(2, "load_conversation_segments", {
      journeyId: authority.journeyId, threadId: authority.threadId,
      generation: authority.generation, sessionId: authority.sessionId,
    });
  });

  it("publishes only after exact completed compaction evidence settles", () => {
    expect(appSource).toContain('operation.kind === "compaction" && operation.status === "completed"');
    expect(appSource.indexOf("await refreshConversationSegments(")).toBeGreaterThan(appSource.indexOf("await saveActiveSettlementProjection("));
    expect(tauriSource).toContain("write_durable_projection_at(&path, &payload, nonce)");
    expect(tauriSource).toContain("firstKeptEntryId");
  });
});
