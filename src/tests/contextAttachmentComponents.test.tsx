import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PendingContextAttachments } from "../app/PendingContextAttachments";
import { MessageAttachmentProvenance } from "../app/MessageAttachmentProvenance";
import selectorSource from "../app/ContextAttachmentSelector.tsx?raw";

const snapshot = {
  schemaVersion: "0.1.0" as const, attachmentId: "ctx-1", journeyId: "journey-a",
  relativePath: "docs/brief.md", displayName: "brief.md", mediaType: "text/markdown" as const,
  sizeBytes: 5, sha256: "a".repeat(64), capturedAt: "2026-08-28T12:00:00.000Z", content: "hello",
};

describe("context attachment presentation", () => {
  it("shows exact pending snapshots with inert preview and removal controls", () => {
    const html = renderToStaticMarkup(<PendingContextAttachments snapshots={[snapshot]} onRemove={() => {}} onClear={() => {}} />);
    expect(html).toContain('aria-label="Pending Journey context"');
    expect(html).toContain("docs/brief.md");
    expect(html).toContain("hello");
    expect(html).toContain("Remove context");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders historical provenance without reusable content or file actions", () => {
    const { content: _content, ...provenance } = snapshot;
    const html = renderToStaticMarkup(<MessageAttachmentProvenance attachments={[provenance]} />);
    expect(html).toContain("Historical snapshot provenance");
    expect(html).toContain("docs/brief.md");
    expect(html).not.toContain("hello");
    expect(html).not.toMatch(/<(button|input|textarea)\b/);
  });

  it("keeps selection Journey-bound and model-free", () => {
    expect(selectorSource).toContain("listJourneyDocumentation(journeyId)");
    expect(selectorSource).toContain("snapshotJourneyContext(journeyId");
    expect(selectorSource).toContain("Selection does not invoke the agent.");
    expect(selectorSource).not.toMatch(/livePi|generatePacket|provider|projectPath|absolutePath/);
  });
});
