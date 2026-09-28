import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ChapterIndexPanel } from "../app/ChapterIndexPanel";
import type { ConversationChapter } from "../domain/compactionChapters";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

const chapters: ConversationChapter[] = [
  {
    segmentId: "segment-1", number: 1, status: "closed", title: "Deliver Trusted Self-Update.",
    openedAt: "2026-09-01T10:00:00Z", closedAt: "2026-09-05T18:00:00Z", turnCount: 42, openingMessageId: "m1",
  },
  {
    segmentId: "segment-2", number: 2, status: "closed", title: "Untitled chapter",
    openedAt: "2026-09-05T18:00:00Z", closedAt: "2026-09-09T12:00:00Z", turnCount: 7,
  },
  {
    segmentId: "segment-3", number: 3, status: "current", title: "Current chapter",
    openedAt: "2026-09-09T12:00:00Z", turnCount: 3, openingMessageId: "m88",
  },
];

// CR080: the index is how a conversation of months becomes navigable. Chapters are views
// over Pi entries, so opening one never creates anything.
describe("chapter index panel", () => {
  it("lists every chapter by its own name, dates and size", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={chapters} onSelect={() => undefined} />);
    expect(html).toContain("Deliver Trusted Self-Update.");
    expect(html).toContain("2026-09-01");
    expect(html).toContain("2026-09-05");
    expect(html).toContain("42 turns");
    expect(html).toContain("7 turns");
    expect(html).toContain("3 turns");
    expect(html).toContain("Current chapter");
    expect(html).toContain('aria-label="Conversation chapters"');
  });

  it("offers a jump only where the chapter's start is in the loaded transcript", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={chapters} onSelect={() => undefined} />);
    // The middle chapter has no resolved opening, so its entry is not presented as a jump.
    expect(html.match(/<button/g)?.length).toBe(2);
    expect(html).toContain("Not in the loaded transcript");
    expect(renderToStaticMarkup(
      <ChapterIndexPanel chapters={chapters} onSelect={() => undefined} onClose={() => undefined} />,
    )).toContain('aria-label="Close chapter index"');
  });

  it("says plainly when nothing has been compacted yet", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={[]} onSelect={() => undefined} />);
    expect(html).toContain("This Conversation is still one chapter.");
  });

  it("is rendered by the transcript and closes like the other panels", () => {
    expect(transcriptSource).toContain("<ChapterIndexPanel");
    expect(transcriptSource).toContain("onChaptersOpenChange");
    expect(cssSource).toContain(".conversation-chapter-panel");
  });
});
