import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { loadConversationSegments, refreshConversationSegments } from "../app/conversationSegmentStorage";
import { createSettlementTimingRegistry, type SettlementTimingClock } from "../app/settlementPhaseTiming";
import appSource from "../app/App.tsx?raw";

const authority = {
  journeyId: "mirror-desktop", threadId: "desktop-thread-123", generation: 1,
  sessionId: "pi-session-123", sessionFile: "/app/pi-session-123.jsonl",
};

const readable = {
  schemaVersion: "1.0.0", journeyId: authority.journeyId, threadId: authority.threadId,
  generation: 1, piSessionId: authority.sessionId, sourceEntryCount: 2,
  segments: [{ segment: 1, segmentId: "segment-1", status: "current", sourceFromEntryId: "entry-1" }],
};

/** The exact shape that failed a production settlement: a coordinate written as null. */
const unreadable = {
  ...readable,
  segments: [{ segment: 1, segmentId: "segment-1", status: "current", sourceFromEntryId: null }],
};

function fixedClock(): SettlementTimingClock {
  let now = 0;
  return { now: () => (now += 1), iso: () => new Date(now * 1000).toISOString() };
}

const settlementAuthority = {
  journeyId: authority.journeyId, runId: "run-1", turnId: "turn-1", generation: 1,
};

describe("CR127: an unreadable chapter manifest is a diagnostic, not a lost turn", () => {
  beforeEach(() => invoke.mockReset());

  it("keeps absent, readable and unreadable apart instead of collapsing two of them", async () => {
    invoke.mockResolvedValueOnce(null);
    await expect(loadConversationSegments(authority)).resolves.toEqual({ kind: "absent" });

    invoke.mockResolvedValueOnce(readable);
    await expect(loadConversationSegments(authority)).resolves.toEqual({
      kind: "manifest", manifest: readable,
    });

    invoke.mockResolvedValueOnce(unreadable);
    await expect(loadConversationSegments(authority)).resolves.toEqual({
      kind: "unreadable", reason: "coordinate_invalid (segment 1, sourceFromEntryId)",
    });
  });

  it("names the predicate rather than reporting that something was invalid", async () => {
    invoke.mockResolvedValueOnce({ ...readable, schemaVersion: "0.9.0" });
    const loaded = await loadConversationSegments(authority);
    expect(loaded).toEqual({ kind: "unreadable", reason: "schema_version" });
  });

  /**
   * CR127: the load path tolerates, the refresh path does not. A refresh has just derived the
   * manifest from Pi, so an unreadable one is a live producer/parser disagreement, and a settled
   * compaction's publication is the one case where skipping it would lose a closed chapter.
   */
  it("still fails a refresh, with the predicate in the message", async () => {
    invoke.mockResolvedValueOnce(unreadable);
    await expect(refreshConversationSegments(authority)).rejects.toThrow(
      "Conversation Segment authority is invalid: coordinate_invalid (segment 1, sourceFromEntryId)",
    );
  });

  it("records a tolerated defect on a settlement that completed", () => {
    const registry = createSettlementTimingRegistry(fixedClock());
    registry.begin(settlementAuthority);
    registry.note(authority.journeyId, "load_segments", "conversation_segment_manifest_unreadable: schema_version");
    const record = registry.end(authority.journeyId, "settled");
    expect(record?.outcome).toBe("settled");
    expect(record?.failure).toBeUndefined();
    expect(record?.diagnostics).toEqual([{
      phase: "load_segments",
      reason: "conversation_segment_manifest_unreadable: schema_version",
    }]);
  });

  it("omits the field entirely when a settlement met nothing worth saying", () => {
    const registry = createSettlementTimingRegistry(fixedClock());
    registry.begin(settlementAuthority);
    const record = registry.end(authority.journeyId, "settled");
    expect(record).not.toHaveProperty("diagnostics");
  });

  it("bounds a diagnostic the way CR121 bounds a failure reason", () => {
    const registry = createSettlementTimingRegistry(fixedClock());
    registry.begin(settlementAuthority);
    registry.note(authority.journeyId, "load_segments", "x".repeat(900));
    const record = registry.end(authority.journeyId, "settled");
    expect(record?.diagnostics?.[0]?.reason).toHaveLength(512);
    expect(record?.diagnostics?.[0]?.reason.endsWith("\u2026")).toBe(true);
  });

  it("drops a note with no collector rather than throwing, exactly as timing falls through", () => {
    const registry = createSettlementTimingRegistry(fixedClock());
    expect(() => registry.note("no-collector", "load_segments", "reason")).not.toThrow();
    expect(registry.end("no-collector", "settled")).toBeUndefined();
  });

  it("wires the tolerance into settlement: publication is skipped and the reason recorded", () => {
    const load = appSource.indexOf('const loaded = await timed("load_segments", () => loadConversationSegments(segmentAuthority));');
    expect(load).toBeGreaterThan(-1);
    const note = appSource.indexOf("conversation_segment_manifest_unreadable: ${loaded.reason}");
    expect(note).toBeGreaterThan(load);
    // The publish decision reads the manifest, so an unreadable one skips it the way an absent
    // one always has, rather than the settlement being abandoned.
    expect(appSource).toContain('manifest = loaded.kind === "manifest" ? loaded.manifest : undefined;');
    expect(appSource.indexOf("if (manifest) {")).toBeGreaterThan(note);
  });
});
