import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { chooseFileAttachments, inspectDroppedFileAttachments, openFileAttachment } from "../app/fileAttachmentStorage";

const payload = {
  schemaVersion: "0.2.0",
  maxFiles: 32,
  attachments: [{
    schemaVersion: "0.2.0",
    attachmentId: "file-a",
    journeyId: "journey-a",
    absolutePath: "/tmp/archive.zip",
    displayName: "archive.zip",
    sizeBytes: 10,
    selectedAt: "2026-08-28T12:00:00.000Z",
    kind: "file",
  }],
};

describe("file attachment native boundary", () => {
  beforeEach(() => invoke.mockReset());

  it("opens the native multi-file picker without a Journey path scope", async () => {
    invoke.mockResolvedValue(payload);
    await expect(chooseFileAttachments("journey-a")).resolves.toEqual(payload);
    expect(invoke).toHaveBeenCalledWith("choose_file_attachments", { journeyId: "journey-a" });
  });

  it("inspects drag-and-drop paths through the same contract", async () => {
    invoke.mockResolvedValue(payload);
    await inspectDroppedFileAttachments("journey-a", ["/tmp/archive.zip"]);
    expect(invoke).toHaveBeenCalledWith("inspect_file_attachments", { journeyId: "journey-a", paths: ["/tmp/archive.zip"] });
  });

  it("opens an explicit absolute reference without a workspace base", async () => {
    invoke.mockResolvedValue(undefined);
    await openFileAttachment("/Users/example/Desktop/reference.pdf");
    expect(invoke).toHaveBeenCalledWith("open_local_reference", { path: "/Users/example/Desktop/reference.pdf", basePath: null });
  });
});
