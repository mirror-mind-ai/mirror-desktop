import { describe, expect, it } from "vitest";
import {
  addContextSnapshots,
  clearContextSnapshots,
  normalizeContextSnapshotResponse,
  provenanceFromSnapshot,
  removeContextSnapshot,
  validateContextSnapshotsForSend,
  type ContextAttachmentSnapshot,
} from "../domain/contextAttachments";

const digest = "a".repeat(64);

function snapshot(overrides: Partial<ContextAttachmentSnapshot> = {}): ContextAttachmentSnapshot {
  return {
    schemaVersion: "0.1.0",
    attachmentId: "ctx-1",
    journeyId: "journey-a",
    relativePath: "docs/brief.md",
    displayName: "brief.md",
    mediaType: "text/markdown",
    sizeBytes: 5,
    sha256: digest,
    capturedAt: "2026-08-28T12:00:00.000Z",
    content: "hello",
    ...overrides,
  };
}

const response = (snapshots: unknown[]) => ({
  schemaVersion: "0.1.0",
  limits: { maxFiles: 8, maxFileBytes: 131072, maxAggregateBytes: 524288 },
  snapshots,
});

describe("bounded context attachment contract", () => {
  it("normalizes exact Journey-owned immutable snapshots", () => {
    expect(normalizeContextSnapshotResponse(response([snapshot()]), "journey-a").snapshots).toEqual([snapshot()]);
  });

  it.each([
    { relativePath: "../secret.md" },
    { relativePath: "/tmp/secret.md" },
    { sha256: "weak" },
    { journeyId: "journey-b" },
    { mediaType: "image/png" as unknown as ContextAttachmentSnapshot["mediaType"] },
    { sizeBytes: 4 },
    { unknownField: "no" } as Partial<ContextAttachmentSnapshot>,
  ] satisfies Partial<ContextAttachmentSnapshot>[]) ("rejects malformed or mismatched snapshot %#", (change) => {
    expect(() => normalizeContextSnapshotResponse(response([snapshot(change)]), "journey-a")).toThrow();
  });

  it("rejects duplicate paths and IDs instead of silently replacing context", () => {
    expect(() => normalizeContextSnapshotResponse(response([
      snapshot(),
      snapshot({ attachmentId: "ctx-2" }),
    ]), "journey-a")).toThrow(/duplicate/i);
    expect(() => normalizeContextSnapshotResponse(response([
      snapshot(),
      snapshot({ relativePath: "docs/other.md" }),
    ]), "journey-a")).toThrow(/duplicate/i);
  });

  it("adds, removes and clears snapshots without cross-Journey transfer", () => {
    const added = addContextSnapshots([], [snapshot()], "journey-a");
    expect(added).toHaveLength(1);
    expect(removeContextSnapshot(added, "ctx-1")).toEqual([]);
    expect(clearContextSnapshots(added)).toEqual([]);
    expect(() => addContextSnapshots([], [snapshot({ journeyId: "journey-b" })], "journey-a")).toThrow(/Journey/i);
    expect(() => addContextSnapshots(added, [snapshot()], "journey-a")).toThrow(/already attached/i);
  });

  it("projects inert provenance without captured content", () => {
    expect(provenanceFromSnapshot(snapshot())).toEqual({
      schemaVersion: "0.1.0",
      attachmentId: "ctx-1",
      journeyId: "journey-a",
      relativePath: "docs/brief.md",
      displayName: "brief.md",
      mediaType: "text/markdown",
      sizeBytes: 5,
      sha256: digest,
      capturedAt: "2026-08-28T12:00:00.000Z",
    });
  });

  it("validates ownership and authoritative limits immediately before send", () => {
    const limits = { maxFiles: 1, maxFileBytes: 5, maxAggregateBytes: 5 };
    expect(validateContextSnapshotsForSend([snapshot()], "journey-a", limits)).toEqual([]);
    expect(validateContextSnapshotsForSend([snapshot()], "journey-b", limits)).toContain("Pending context belongs to another Journey.");
    expect(validateContextSnapshotsForSend([snapshot({ content: "hello!", sizeBytes: 6 })], "journey-a", limits)).toContain("Pending context exceeds the per-file byte limit.");
  });
});
