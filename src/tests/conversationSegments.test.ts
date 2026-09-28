import { describe, expect, it } from "vitest";
import { deriveConversationSegmentManifest } from "../domain/conversationSegments";

const authority = { journeyId: "mirror-desktop", threadId: "desktop-thread-123", generation: 1, piSessionId: "pi-session-123" };

describe("technical conversation Segments", () => {
  it("closes at exact Pi compaction checkpoints without changing conversation authority", () => {
    const manifest = deriveConversationSegmentManifest({
      ...authority,
      entries: [
        { id: "user-1", type: "message" },
        { id: "assistant-1", parentId: "user-1", type: "message" },
        { id: "user-2", parentId: "assistant-1", type: "message" },
        { id: "assistant-2", parentId: "user-2", type: "message" },
        { id: "compact-1", parentId: "assistant-2", type: "compaction", firstKeptEntryId: "user-2" },
        { id: "user-3", parentId: "compact-1", type: "message" },
        { id: "assistant-3", parentId: "user-3", type: "message" },
      ],
      turns: [
        { turnId: "turn-1", userEntryId: "user-1", assistantEntryId: "assistant-1" },
        { turnId: "turn-2", userEntryId: "user-2", assistantEntryId: "assistant-2" },
        { turnId: "turn-3", userEntryId: "user-3", assistantEntryId: "assistant-3" },
      ],
    });
    expect(manifest).toMatchObject({ ...authority, sourceEntryCount: 7 });
    expect(manifest.segments).toEqual([{
      segment: 1, segmentId: "segment-1", status: "closed",
      sourceFromEntryId: "user-1", sourceThroughEntryId: "assistant-2",
      retainedTailFromEntryId: "user-2", compactionEntryId: "compact-1",
      firstTurnId: "turn-1", lastTurnId: "turn-2", turnCount: 2,
    }, {
      segment: 2, segmentId: "segment-2", status: "current",
      sourceFromEntryId: "user-2", sourceThroughEntryId: "assistant-3",
      firstTurnId: "turn-2", lastTurnId: "turn-3", turnCount: 2,
    }]);
  });

  // CR080: a closed Segment is a chapter, so the manifest carries what naming one needs —
  // the head of the summary Pi wrote and when the chapter opened and closed. Read from the
  // Pi session at manifest time; never a second source of truth.
  it("carries chapter evidence for closed Segments and nothing invented for the current one", () => {
    const manifest = deriveConversationSegmentManifest({
      ...authority,
      entries: [
        { id: "user-1", type: "message", timestamp: "2026-09-01T10:00:00.000Z" },
        { id: "assistant-1", parentId: "user-1", type: "message", timestamp: "2026-09-01T10:01:00.000Z" },
        {
          id: "compact-1", parentId: "assistant-1", type: "compaction", firstKeptEntryId: "user-1",
          timestamp: "2026-09-02T09:00:00.000Z", summary: `## Goal\nShip the chapter index.\n${"x".repeat(600)}`,
        },
        { id: "user-2", parentId: "compact-1", type: "message", timestamp: "2026-09-02T09:05:00.000Z" },
      ],
      turns: [{ turnId: "turn-1", userEntryId: "user-1", assistantEntryId: "assistant-1" }],
    });
    const [closed, current] = manifest.segments;
    expect(closed).toMatchObject({
      status: "closed",
      openedAt: "2026-09-01T10:00:00.000Z",
      closedAt: "2026-09-02T09:00:00.000Z",
      turnCount: 1,
    });
    // Bounded, because 255 summaries of 26k characters would not fit a manifest.
    expect(closed.summaryHead?.startsWith("## Goal\nShip the chapter index.")).toBe(true);
    expect(closed.summaryHead!.length).toBeLessThanOrEqual(400);
    expect(current).toMatchObject({ status: "current", openedAt: "2026-09-01T10:00:00.000Z" });
    expect(current.summaryHead).toBeUndefined();
    expect(current.closedAt).toBeUndefined();
  });

  it("publishes one current Segment when Pi has not compacted", () => {
    const manifest = deriveConversationSegmentManifest({
      ...authority,
      entries: [{ id: "user-1", type: "message" }, { id: "assistant-1", parentId: "user-1", type: "message" }],
    });
    expect(manifest.segments).toEqual([{
      segment: 1, segmentId: "segment-1", status: "current",
      sourceFromEntryId: "user-1", sourceThroughEntryId: "assistant-1", turnCount: 0,
    }]);
  });

  it("rejects unresolved, non-message and excessive compaction boundaries", () => {
    expect(() => deriveConversationSegmentManifest({
      ...authority,
      entries: [{ id: "compact-1", type: "compaction", parentId: "missing", firstKeptEntryId: "missing" }],
    })).toThrow("structurally invalid");
    expect(() => deriveConversationSegmentManifest({
      ...authority,
      entries: [
        { id: "summary-1", type: "custom" },
        { id: "compact-1", type: "compaction", parentId: "summary-1", firstKeptEntryId: "summary-1" },
      ],
    })).toThrow("structurally invalid");
  });

  it("rejects duplicate IDs and checkpoints that escape their exact source branch", () => {
    expect(() => deriveConversationSegmentManifest({
      ...authority,
      entries: [{ id: "duplicate", type: "message" }, { id: "duplicate", parentId: "duplicate", type: "message" }],
    })).toThrow("duplicate");
    expect(() => deriveConversationSegmentManifest({
      ...authority,
      entries: [
        { id: "user-1", type: "message" },
        { id: "assistant-1", parentId: "user-1", type: "message" },
        { id: "compact-1", parentId: "assistant-1", type: "compaction", firstKeptEntryId: "future" },
        { id: "future", parentId: "compact-1", type: "message" },
      ],
    })).toThrow("structurally invalid");
  });

  it("remains metadata-only for generated long history", () => {
    const entries = Array.from({ length: 20_000 }, (_, index) => ({
      id: `entry-${index}`, type: "message", ...(index ? { parentId: `entry-${index - 1}` } : {}),
    }));
    const manifest = deriveConversationSegmentManifest({ ...authority, entries });
    expect(manifest.sourceEntryCount).toBe(20_000);
    expect(JSON.stringify(manifest).length).toBeLessThan(1_000);
  });
});
