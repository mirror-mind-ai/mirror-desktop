import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("Composer draft storage boundary", () => {
  beforeEach(() => invoke.mockReset());

  it("loads absent and versioned channel-local drafts", async () => {
    const { loadComposerDrafts } = await import("../app/composerDraftStorage");
    invoke.mockResolvedValueOnce(null).mockResolvedValueOnce(JSON.stringify({
      schemaVersion: "1.0.0",
      drafts: { "journey-a": "restored" },
      savedAt: "2026-08-30T15:00:00.000Z",
    }));
    await expect(loadComposerDrafts()).resolves.toEqual({});
    await expect(loadComposerDrafts()).resolves.toEqual({ "journey-a": "restored" });
  });

  it("saves through the dedicated native command", async () => {
    const { saveComposerDrafts } = await import("../app/composerDraftStorage");
    invoke.mockResolvedValue(undefined);
    await saveComposerDrafts({ "journey-a": "draft" });
    expect(invoke).toHaveBeenCalledWith("save_composer_drafts", {
      payload: expect.stringContaining('"journey-a": "draft"'),
    });
  });

  it("fails closed on malformed persisted content", async () => {
    const { loadComposerDrafts } = await import("../app/composerDraftStorage");
    invoke.mockResolvedValueOnce("{bad-json");
    await expect(loadComposerDrafts()).rejects.toThrow("malformed JSON");
  });
});
