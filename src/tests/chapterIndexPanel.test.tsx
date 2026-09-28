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
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={chapters} onSelect={() => undefined} locale="en-US" />);
    expect(html).toContain("Deliver Trusted Self-Update.");
    expect(html).toContain("42 turns");
    expect(html).toContain("7 turns");
    expect(html).toContain("Current chapter");
    expect(html).toContain('aria-label="Conversation chapters"');
  });

  // A reader scanning months of conversation needs a date, not a machine coordinate.
  it("writes the dates the way a reader says them", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={chapters} onSelect={() => undefined} locale="en-US" />);
    expect(html.replace(/\s+/gu, " ")).toContain("Sep 1 – 5, 2026");
    expect(html).not.toContain("2026-09-01");
  });

  // The panel is a new idea in the product, so it says what a chapter is before listing any.
  it("explains what chapters are and where they come from", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={chapters} onSelect={() => undefined} locale="en-US" />);
    expect(html).toContain("Chapters");
    expect(html).toContain("compact");
    expect(html.indexOf("conversation-chapter-panel-intro")).toBeLessThan(html.indexOf("Deliver Trusted Self-Update."));
  });

  // The manifest counts turns from the Desktop's own reconciliation, which has nothing to
  // say about chapters recorded before it existed. "0 turns" would describe them falsely.
  it("omits a turn count it does not have instead of claiming zero", () => {
    const html = renderToStaticMarkup(
      <ChapterIndexPanel
        chapters={[{ ...chapters[0], turnCount: 0 }]}
        onSelect={() => undefined}
        locale="en-US"
      />,
    );
    expect(html).not.toContain("0 turns");
    expect(html.replace(/\s+/gu, " ")).toContain("Sep 1 – 5, 2026");
  });

  it("offers a jump only where the chapter's start is in the loaded transcript", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={chapters} onSelect={() => undefined} locale="en-US" />);
    // The middle chapter has no resolved opening, so its entry is not presented as a jump.
    expect(html.match(/<button/g)?.length).toBe(2);
    expect(html).toContain("Not in the loaded transcript");
    expect(renderToStaticMarkup(
      <ChapterIndexPanel chapters={chapters} onSelect={() => undefined} onClose={() => undefined} />,
    )).toContain('aria-label="Close chapter index"');
  });

  it("says plainly when nothing has been compacted yet", () => {
    const html = renderToStaticMarkup(<ChapterIndexPanel chapters={[]} onSelect={() => undefined} locale="en-US" />);
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
    // The index has its own placement: it is a reading surface, not the narrow navigator
    // column, so it gets real width. It must still be sticky, or it scrolls out of view the
    // moment it opens.
    const placement = cssSource.slice(
      cssSource.lastIndexOf(".conversation-chapter-panel {"),
      cssSource.indexOf("}", cssSource.lastIndexOf(".conversation-chapter-panel {")),
    );
    expect(placement).toContain("position: sticky");
    expect(placement).not.toContain("380px");
    expect(placement).toMatch(/max-width: min\((?:6|7|8)\d\dpx/u);

    // And it is exempt from the first-child spacer that pushes ordinary content down.
    const firstChildRule = cssSource.slice(
      cssSource.indexOf(".chat-stream > :first-child"),
      cssSource.indexOf("}", cssSource.indexOf(".chat-stream > :first-child")),
    );
    expect(firstChildRule).toContain(":not(.conversation-chapter-panel)");
  });

  // The panel hard-coded dark-theme greys for its titles and metadata, which disappear on
  // the light themes. The light contract is explicit in this stylesheet, so the panel has to
  // join it rather than inherit and hope.
  it("carries readable text on the light themes", () => {
    const lightPanel = cssSource.slice(
      cssSource.indexOf(":where(.conversation-search-panel, .conversation-turn-panel"),
    );
    expect(lightPanel.slice(0, 400)).toContain(".conversation-chapter-panel");

    const lightRows = cssSource.indexOf(".conversation-chapter-panel li > button,\n") > 0;
    expect(lightRows).toBe(true);
    expect(cssSource).toContain(".conversation-chapter-meta");
    // The muted metadata colour must be theme-aware rather than a fixed dark-theme grey.
    const metaRule = cssSource.slice(
      cssSource.indexOf(".conversation-chapter-meta {"),
      cssSource.indexOf("}", cssSource.indexOf(".conversation-chapter-meta {")),
    );
    expect(metaRule).toContain("color-mix(in srgb, currentColor");
  });

  // A disabled control that says nothing leaves the Navigator guessing whether the feature
  // is broken or simply has nothing to show. A browser also will not surface a title on a
  // disabled button, so the hint lives on a wrapper that still receives the hover.
  it("explains on hover why the chapter button is unavailable", () => {
    expect(appSource).toContain("conversationChapters.length === 0");
    expect(appSource).toContain("chat-header-action-hint");
    expect(appSource).toContain("has not been compacted");
    // The hint is on the wrapper, not on the button the browser will not hover.
    const wrap = appSource.slice(
      appSource.indexOf('className="chat-header-action-hint"'),
      appSource.indexOf("conversation-chapter-glyph"),
    );
    expect(wrap).toContain("title={");
    // And the button no longer carries a title of its own that would win the hover.
    expect(wrap).not.toContain('title="Chapters"');
    expect(cssSource).toContain(".chat-header-action-hint");
    const hintRule = cssSource.slice(
      cssSource.indexOf(".chat-header-action-hint > button:disabled"),
      cssSource.indexOf("}", cssSource.indexOf(".chat-header-action-hint > button:disabled")),
    );
    expect(hintRule).toContain("pointer-events: none");
  });

  // A long index opens on its oldest entries, which are the least likely targets.
  const longIndex: ConversationChapter[] = Array.from({ length: 9 }, (_, index) => ({
    segmentId: `s${index + 1}`,
    number: index + 1,
    status: index === 8 ? "current" : "closed",
    title: `Chapter ${index + 1}.`,
    turnCount: 2,
    openingMessageId: `m${index + 1}`,
  }));

  it("offers the recent chapters first, then the whole arc in order", () => {
    const html = renderToStaticMarkup(
      <ChapterIndexPanel chapters={longIndex} onSelect={() => undefined} locale="en-US" />,
    );
    expect(html).toContain("Most recent");
    expect(html).toContain("All chapters");
    // The shortcut section runs most recent first; the index below stays chronological.
    const shortcuts = html.slice(html.indexOf("Most recent"), html.indexOf("All chapters"));
    expect(shortcuts.indexOf("Chapter 9.")).toBeLessThan(shortcuts.indexOf("Chapter 7."));
    expect(shortcuts).not.toContain("Chapter 6.");
    const index = html.slice(html.indexOf("All chapters"));
    expect(index.indexOf("Chapter 1.")).toBeLessThan(index.indexOf("Chapter 9."));
  });

  it("does not split a short index into sections it does not need", () => {
    const html = renderToStaticMarkup(
      <ChapterIndexPanel chapters={chapters} onSelect={() => undefined} locale="en-US" />,
    );
    expect(html).not.toContain("Most recent");
    expect(html).not.toContain("All chapters");
  });

  // Both sections belong to one reading: scrolling down carries you from the shortcuts
  // into the full index, rather than trapping you in two independent scroll areas.
  it("scrolls the panel as a single region", () => {
    const scrollRule = cssSource.slice(
      cssSource.indexOf(".conversation-chapter-scroll {"),
      cssSource.indexOf("}", cssSource.indexOf(".conversation-chapter-scroll {")),
    );
    expect(scrollRule).toContain("overflow-y: auto");
    // A flex child will not shrink below its content without this, and the list would
    // overflow the panel rather than scroll inside it.
    expect(scrollRule).toContain("min-height: 0");
    const listRule = cssSource.slice(
      cssSource.indexOf(".conversation-chapter-panel ol {"),
      cssSource.indexOf("}", cssSource.indexOf(".conversation-chapter-panel ol {")),
    );
    expect(listRule).not.toContain("overflow-y");
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
