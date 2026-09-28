import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ChapterIndexPanel } from "../app/ChapterIndexPanel";
import type { ConversationChapter } from "../domain/compactionChapters";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";
import appSource from "../app/App.tsx?raw";

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

  // The chat stream scrolls to its end. A panel that is an ordinary block in that flow is
  // inserted above the reading, displaces it, and lands outside the viewport — the panel
  // opens and the Navigator sees a small jump and nothing else. The existing panels solve
  // this by being sticky, and the chapter index must ride the same contract.
  it("stays in view like the other conversation panels instead of scrolling away", () => {
    // The panel shares the turn navigator's placement rule.
    // Two grouped rules carry these selectors; the placement one is the later.
    const joinsAt = cssSource.lastIndexOf(".conversation-turn-panel,\n.conversation-chapter-panel {");
    expect(joinsAt).toBeGreaterThan(0);
    const stickyRule = cssSource.slice(joinsAt, cssSource.indexOf("}", joinsAt));
    expect(stickyRule).toContain("position: sticky");
    expect(stickyRule).toContain("align-self: flex-end");

    // And it is exempt from the first-child spacer that pushes ordinary content down.
    const firstChildRule = cssSource.slice(
      cssSource.indexOf(".chat-stream > :first-child"),
      cssSource.indexOf("}", cssSource.indexOf(".chat-stream > :first-child")),
    );
    expect(firstChildRule).toContain(":not(.conversation-chapter-panel)");
  });

  it("draws the chapter header icon as a visible text glyph, not a fragile SVG", () => {
    expect(appSource).toContain("conversation-chapter-glyph");
    expect(appSource).toContain("§");
    const glyphRule = cssSource.slice(
      cssSource.indexOf(".conversation-chapter-glyph"),
      cssSource.indexOf("}", cssSource.indexOf(".conversation-chapter-glyph")),
    );
    expect(glyphRule).toContain("font-size");
    expect(cssSource).toContain(".conversation-chapter-shortcut.selected");
  });
});
