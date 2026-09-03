import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { PendingFileAttachments } from "../app/PendingFileAttachments";
import { MessageFileAttachments } from "../app/MessageFileAttachments";
import type { FileAttachment } from "../domain/fileAttachments";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

const file: FileAttachment = {
  schemaVersion: "0.2.0",
  attachmentId: "file-a",
  journeyId: "journey-a",
  absolutePath: "/Users/example/Desktop/photo.png",
  displayName: "photo.png",
  sizeBytes: 2048,
  selectedAt: "2026-08-28T12:00:00.000Z",
  kind: "image",
  thumbnail: { schemaVersion: "0.1.0", mediaType: "image/png", dataUrl: "data:image/png;base64,aGVsbG8=", width: 20, height: 10 },
};

describe("file attachment surfaces", () => {
  it("shows removable pending paths and image thumbnails", () => {
    const html = renderToStaticMarkup(<PendingFileAttachments attachments={[file]} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(html).toContain("photo.png");
    expect(html).toContain("/Users/example/Desktop/photo.png");
    expect(html).toContain("data:image/png;base64,aGVsbG8=");
    expect(html).toContain("Remove file");
  });

  it("preserves a clickable historical path and thumbnail", () => {
    const html = renderToStaticMarkup(<MessageFileAttachments attachments={[file]} />);
    expect(html).toContain("Files attached");
    expect(html).toContain("Open /Users/example/Desktop/photo.png");
    expect(html).toContain("data:image/png;base64,aGVsbG8=");
    expect(html).not.toContain("sha256");
    expect(cssSource).toContain("/* Light historical attachment contrast contract. */");
    expect(cssSource).toContain(".message-file-attachments > strong");
    expect(cssSource).toContain("color: #000000");
    expect(cssSource).toContain(".message-file-item");
  });
});
