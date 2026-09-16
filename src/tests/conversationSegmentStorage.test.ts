import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  loadConversationSegments, loadCurrentConversationSegmentProjection,
  publishConversationSegmentProjections, refreshConversationSegments,
} from "../app/conversationSegmentStorage";
import appSource from "../app/App.tsx?raw";
import type { JourneyConversation } from "../domain/journeyConversation";
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

  it("publishes bounded projections and loads the current working Segment independently", async () => {
    const conversation = {
      id: authority.threadId, journeyId: authority.journeyId, createdAt: "2026-09-14T00:00:00.000Z", messages: [],
      liveIdentity: { schemaVersion: "0.1.0", journeyId: authority.journeyId, harnessConversationId: authority.threadId,
        piSessionId: authority.sessionId, piSessionFile: authority.sessionFile, generation: authority.generation, origin: "new",
        mirrorConversationId: "mirror-conversation-123", activationReceiptActivatedAt: "2026-09-14T00:00:00.000Z" },
      reconciliation: { schemaVersion: "0.1.0", authority: { journeyId: authority.journeyId,
        harnessConversationId: authority.threadId, piSessionId: authority.sessionId, generation: authority.generation,
        mirrorConversationId: "mirror-conversation-123" },
        checkpoints: {}, turns: [], classification: "uninitialized", classifiedAt: "2026-09-14T00:00:00.000Z", reasonCodes: [] },
    } as JourneyConversation;
    invoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce(JSON.stringify({
      schemaVersion: "0.9.0", conversation, savedAt: "2026-09-14T00:00:00.000Z",
    }));
    await publishConversationSegmentProjections(authority, [{ segmentId: "segment-1", status: "current", conversation }]);
    await expect(loadCurrentConversationSegmentProjection(authority)).resolves.toMatchObject({ id: authority.threadId });
    expect(invoke).toHaveBeenNthCalledWith(1, "publish_conversation_segment_projections", expect.objectContaining({
      journeyId: authority.journeyId, threadId: authority.threadId,
      projections: [expect.objectContaining({ segmentId: "segment-1", status: "current" })],
    }));
    expect(invoke).toHaveBeenNthCalledWith(2, "load_current_conversation_segment_projection", authority);
  });

  it("publishes only after exact completed compaction evidence settles", () => {
    expect(appSource).toContain('operation.kind === "compaction" && operation.status === "completed"');
    expect(appSource.indexOf("await refreshConversationSegments(")).toBeGreaterThan(appSource.indexOf("await saveActiveSettlementProjection("));
    expect(tauriSource).toContain("write_durable_projection_at(&path, &payload, nonce)");
    expect(tauriSource).toContain("firstKeptEntryId");
    expect(tauriSource).toContain("load_conversation_segment_projections");
    expect(appSource).toContain("Earlier history");
    expect(appSource).toContain("segmentCountBeingLoaded");
    expect(appSource).toContain("loadCompleteConversationSegmentHistory");
  });
});
