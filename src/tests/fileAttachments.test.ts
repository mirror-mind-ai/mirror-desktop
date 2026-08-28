import { describe, expect, it } from "vitest";
import {
  addFileAttachments,
  normalizeFileAttachmentResponse,
  normalizePersistedFileAttachment,
  removeFileAttachment,
  toAgentFileReferences,
  type FileAttachment,
} from "../domain/fileAttachments";

const imageThumbnail = {
  schemaVersion: "0.1.0" as const,
  mediaType: "image/png" as const,
  dataUrl: "data:image/png;base64,aGVsbG8=",
  width: 24,
  height: 12,
};

function attachment(overrides: Partial<FileAttachment> = {}): FileAttachment {
  return {
    schemaVersion: "0.2.0",
    attachmentId: "file-a",
    journeyId: "journey-a",
    absolutePath: "/Users/example/Desktop/reference.pdf",
    displayName: "reference.pdf",
    sizeBytes: 42,
    selectedAt: "2026-08-28T12:00:00.000Z",
    kind: "file",
    ...overrides,
  };
}

describe("Pi-style file attachment contract", () => {
  it("accepts arbitrary regular-file formats and absolute locations", () => {
    const response = normalizeFileAttachmentResponse({
      schemaVersion: "0.2.0",
      maxFiles: 32,
      attachments: [attachment()],
    }, "journey-a");
    expect(response.attachments[0].absolutePath).toBe("/Users/example/Desktop/reference.pdf");
  });

  it("accepts bounded persisted image thumbnails", () => {
    const value = attachment({ kind: "image", thumbnail: imageThumbnail });
    expect(normalizePersistedFileAttachment(value, "journey-a")).toEqual(value);
  });

  it.each([
    { ...attachment(), absolutePath: "relative/file.pdf" },
    { ...attachment(), journeyId: "journey-b" },
    { ...attachment(), extra: "authority" },
    { ...attachment(), kind: "image", thumbnail: { ...imageThumbnail, dataUrl: "data:text/plain;base64,aA==" } },
  ])("rejects malformed or cross-Journey references", (value) => {
    expect(() => normalizePersistedFileAttachment(value, "journey-a")).toThrow();
  });

  it("deduplicates exact paths and enforces the response count without reading content", () => {
    expect(() => normalizeFileAttachmentResponse({
      schemaVersion: "0.2.0",
      maxFiles: 32,
      attachments: [attachment(), attachment({ attachmentId: "file-b" })],
    }, "journey-a")).toThrow(/duplicate/i);
    expect(attachment()).not.toHaveProperty("content");
    expect(attachment()).not.toHaveProperty("sha256");
  });

  it("adds, removes and projects only paths to the Pi agent", () => {
    const second = attachment({ attachmentId: "file-b", absolutePath: "/tmp/photo.png", displayName: "photo.png", kind: "image", thumbnail: imageThumbnail });
    const pending = addFileAttachments([attachment()], [second], "journey-a", 32);
    expect(toAgentFileReferences(pending)).toEqual([
      { absolutePath: "/tmp/photo.png", displayName: "photo.png" },
      { absolutePath: "/Users/example/Desktop/reference.pdf", displayName: "reference.pdf" },
    ]);
    expect(removeFileAttachment(pending, "file-a")).toEqual([second]);
  });
});
