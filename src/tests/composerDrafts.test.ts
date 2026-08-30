import { describe, expect, it } from "vitest";
import {
  createPersistedComposerDrafts,
  parsePersistedComposerDrafts,
  updateComposerDraft,
} from "../domain/composerDrafts";

describe("Composer drafts", () => {
  it("persists exact text per Journey in a versioned payload", () => {
    expect(createPersistedComposerDrafts(
      { "journey-a": "  draft A\n", "journey-b": "draft B" },
      new Date("2026-08-30T15:00:00.000Z"),
    )).toEqual({
      schemaVersion: "1.0.0",
      drafts: { "journey-a": "  draft A\n", "journey-b": "draft B" },
      savedAt: "2026-08-30T15:00:00.000Z",
    });
  });

  it("updates one Journey without disturbing another and removes empty drafts", () => {
    const updated = updateComposerDraft({ "journey-a": "A", "journey-b": "B" }, "journey-a", "A2");
    expect(updated).toEqual({ "journey-a": "A2", "journey-b": "B" });
    expect(updateComposerDraft(updated, "journey-a", "")).toEqual({ "journey-b": "B" });
  });

  it("loads valid drafts and rejects malformed or oversized data", () => {
    expect(parsePersistedComposerDrafts({
      schemaVersion: "1.0.0",
      drafts: { "journey-a": "restored" },
      savedAt: "2026-08-30T15:00:00.000Z",
    })?.drafts).toEqual({ "journey-a": "restored" });
    expect(parsePersistedComposerDrafts({ schemaVersion: "9.9.9", drafts: {} })).toBeUndefined();
    expect(parsePersistedComposerDrafts({
      schemaVersion: "1.0.0",
      drafts: { "journey-a": "x".repeat(51_201) },
      savedAt: "2026-08-30T15:00:00.000Z",
    })).toBeUndefined();
  });
});
