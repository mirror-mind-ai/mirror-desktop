import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationDetailHeader } from "../app/ConversationDetailHeader";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";
import appSource from "../app/App.tsx?raw";
import detailHeaderSource from "../app/ConversationDetailHeader.tsx?raw";
import emptyConversationSource from "../app/EmptyDesktopConversation.tsx?raw";
import chapterPanelSource from "../app/ChapterIndexPanel.tsx?raw";

const entry = {
  kind: "desktop_conversation",
  conversationId: "conversation-1",
  threadId: "desktop-thread-123",
  title: "Mirror Desktop",
  updatedAt: "2026-10-02T18:00:00.000Z",
  messageCount: 223,
  generation: 4,
  state: "ready",
} as unknown as ConversationCatalogEntry;

// CR114: once what is loaded and what exists can differ, every surface that counts history has to
// say which of the two it is counting.
describe("surfaces state what is loaded against what exists", () => {
  it("names the current chapter and the earlier ones still on disk", () => {
    const html = renderToStaticMarkup(
      <ConversationDetailHeader entry={entry} messageCount={16} historicalSegmentCount={25} />,
    );
    expect(html).toContain("16 messages in current chapter");
    expect(html).toContain("25 earlier chapters");
  });

  it("drops the distinction once there is nothing earlier left to load", () => {
    const html = renderToStaticMarkup(
      <ConversationDetailHeader entry={entry} messageCount={1899} historicalSegmentCount={0} loadedHistoricalSegmentCount={25} />,
    );
    expect(html).toContain("1899 messages loaded");
    expect(html).toContain("26 chapters");
    expect(html).not.toContain("earlier chapter");
  });

  it("tells the searcher that earlier chapters are outside the search", () => {
    // The panel already says it searches loaded content. That is only honest if it also says
    // that something is not loaded.
    expect(transcriptSource).toContain("earlierSegmentCount");
    expect(transcriptSource).toContain("not loaded, so they are outside this search");
    expect(appSource).toContain("earlierSegmentCount={historicalSegmentCount}");
  });
});

// CR114: Segment is the internal history and loading boundary CV-008.DS-004 defines as technical;
// chapter is what CR080 taught the product to call the same cut. They are one to one, so a reader
// who meets both words is being shown two names for one thing. The visible register is chapter.
describe("the reader meets one word for a compaction boundary", () => {
  const visibleSources: Array<[string, string]> = [
    ["App", appSource],
    ["ConversationTranscript", transcriptSource],
    ["ConversationDetailHeader", detailHeaderSource],
    ["EmptyDesktopConversation", emptyConversationSource],
    ["ChapterIndexPanel", chapterPanelSource],
  ];

  it.each(visibleSources)("says chapter and never Segment in %s's visible copy", (_name, source) => {
    // Quoted and interpolated text only; identifiers, types, commands and comments keep the
    // internal name, which is the one the schema and the Rust commands actually use.
    const literals = source.match(/"[^"\n]*"|'[^'\n]*'|`[^`\n]*`/g) ?? [];
    const offenders = literals.filter((literal) => /\bSegments?\b/u.test(literal)
      // Internal coordinates that happen to be string literals rather than prose.
      && !/^["'`](segment-|current_segment|conversation-segments)/u.test(literal)
      && !/_segment|segment_|SegmentProjection|conversationSegment/u.test(literal));
    expect(offenders).toEqual([]);
  });

  it("keeps Segment as the internal name the storage and the native commands use", () => {
    expect(appSource).toContain("partitionConversationBySegments");
    expect(appSource).toContain("refreshConversationSegments");
    expect(appSource).toContain("historicalSegmentCount");
  });
});
