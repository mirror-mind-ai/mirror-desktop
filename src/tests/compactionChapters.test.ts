import { describe, expect, it } from "vitest";
import type { ConversationSegmentManifest } from "../domain/conversationSegments";
import {
  CHAPTER_TITLE_MAX_LENGTH,
  chapterOpeningMessageIds,
  formatChapterDateRange,
  needsChapterEvidenceRefresh,
  recentChapterShortcuts,
  CHAPTER_RECENT_SECTION_THRESHOLD,
  chapterTitleFromSummary,
  describeChapterDivider,
  projectConversationChapters,
} from "../domain/compactionChapters";

// CR080: a chapter is the summary Pi wrote when it compacted, and its title is the Goal
// line Pi already puts first. Shapes below are the ones recorded in production sessions.
describe("chapter title from a compaction summary", () => {
  it("takes the sentence under the Goal heading", () => {
    const summary = "## Goal\nContinue `mirror-desktop` roadmap work, specifically complete Trusted Self-Update.\n\n## Constraints & Preferences\n- Journey ID is authoritative";
    expect(chapterTitleFromSummary(summary)).toBe(
      "Continue `mirror-desktop` roadmap work, specifically complete Trusted Self-Update.",
    );
  });

  it("strips a leading bullet and collapses whitespace", () => {
    expect(chapterTitleFromSummary("## Goal\n-   Ship   the\tthing  \n## Progress")).toBe("Ship the thing");
  });

  it("falls back to the first body line when there is no Goal heading", () => {
    expect(chapterTitleFromSummary("# Summary\n\nWe explored Sala Ágora.\nThen more.")).toBe("We explored Sala Ágora.");
  });

  it("names an empty or heading-only summary honestly", () => {
    expect(chapterTitleFromSummary("")).toBe("Untitled chapter");
    expect(chapterTitleFromSummary("## Goal\n## Progress\n")).toBe("Untitled chapter");
  });

  it("bounds a long Goal line and marks the cut", () => {
    const title = chapterTitleFromSummary(`## Goal\n${"palavra ".repeat(60)}`);
    expect(title.length).toBeLessThanOrEqual(CHAPTER_TITLE_MAX_LENGTH);
    expect(title.endsWith("…")).toBe(true);
  });
});

// CR080: chapters are a view over the Segment manifest, which is itself a view over Pi
// entries. The projection never reads persistence and never invents a chapter.
describe("chapter projection from a Segment manifest", () => {
  const manifest = {
    schemaVersion: "1.0.0" as const,
    journeyId: "mirror-desktop",
    threadId: "desktop-thread-1",
    generation: 1,
    piSessionId: "pi-session-1",
    sourceEntryCount: 9,
    segments: [
      {
        segment: 1, segmentId: "segment-1", status: "closed" as const,
        compactionEntryId: "compact-1", retainedTailFromEntryId: "user-2",
        summaryHead: "## Goal\nShip the chapter index.\n\n## Progress",
        openedAt: "2026-09-01T10:00:00.000Z", closedAt: "2026-09-02T09:00:00.000Z", turnCount: 12,
      },
      {
        segment: 2, segmentId: "segment-2", status: "closed" as const,
        compactionEntryId: "compact-2", retainedTailFromEntryId: "user-7",
        openedAt: "2026-09-02T09:00:00.000Z", closedAt: "2026-09-03T18:30:00.000Z", turnCount: 4,
      },
      {
        segment: 3, segmentId: "segment-3", status: "current" as const,
        openedAt: "2026-09-03T18:30:00.000Z", turnCount: 2,
      },
    ],
  };

  it("names each closed chapter by its own Goal and keeps the open one as the current chapter", () => {
    const chapters = projectConversationChapters(manifest);
    expect(chapters).toEqual([
      {
        segmentId: "segment-1", number: 1, status: "closed", title: "Ship the chapter index.",
        openedAt: "2026-09-01T10:00:00.000Z", closedAt: "2026-09-02T09:00:00.000Z", turnCount: 12,
      },
      {
        segmentId: "segment-2", number: 2, status: "closed", title: "Untitled chapter",
        openedAt: "2026-09-02T09:00:00.000Z", closedAt: "2026-09-03T18:30:00.000Z", turnCount: 4,
      },
      {
        segmentId: "segment-3", number: 3, status: "current", title: "Current chapter",
        openedAt: "2026-09-03T18:30:00.000Z", closedAt: undefined, turnCount: 2,
      },
    ]);
  });

  it("projects nothing to navigate when the conversation has never been compacted", () => {
    expect(projectConversationChapters({ ...manifest, segments: [manifest.segments[2]] })).toEqual([]);
  });

  it("tolerates a manifest published before chapter evidence existed", () => {
    const legacy = {
      ...manifest,
      segments: [
        { segment: 1, segmentId: "segment-1", status: "closed" as const, compactionEntryId: "c1", retainedTailFromEntryId: "u2" },
        { segment: 2, segmentId: "segment-2", status: "current" as const },
      ],
    };
    expect(projectConversationChapters(legacy)).toEqual([
      { segmentId: "segment-1", number: 1, status: "closed", title: "Untitled chapter", openedAt: undefined, closedAt: undefined, turnCount: 0 },
      { segmentId: "segment-2", number: 2, status: "current", title: "Current chapter", openedAt: undefined, closedAt: undefined, turnCount: 0 },
    ]);
  });
});

// CR080: the divider is a named moment in the transcript, not a message. Rendered from the
// derived surface, so it appears on reload as well as live.
describe("chapter divider presentation", () => {
  it("names the chapter that closed and when, the way a reader says the date", () => {
    expect(describeChapterDivider({ title: "Finish the compaction chapters.", closedAt: "2026-09-19T08:00:00Z" }, "en-US"))
      .toEqual({ label: "Chapter closed", title: "Finish the compaction chapters.", closedAt: "Sep 19, 2026" });
  });

  it("stays truthful when Pi recorded no time for the cut", () => {
    expect(describeChapterDivider({ title: "Earlier work." }, "en-US"))
      .toEqual({ label: "Chapter closed", title: "Earlier work.", closedAt: undefined });
  });

  it("does not present an unparseable timestamp as a date", () => {
    expect(describeChapterDivider({ title: "Earlier work.", closedAt: "not-a-date" }, "en-US").closedAt).toBeUndefined();
  });
});

// CR080: navigation needs to know where each chapter starts in the transcript. The dividers
// already mark every opening after the first, and the first chapter opens at the first
// message, so the ordinals line up with the manifest's own chapter order.
describe("chapter openings in the transcript", () => {
  const messages = [
    { id: "m1", role: "user" as const, content: "one", createdAt: "2026-09-01T10:00:00Z" },
    { id: "m2", role: "assistant" as const, content: "two", createdAt: "2026-09-01T10:01:00Z" },
    { id: "m3", role: "user" as const, content: "three", createdAt: "2026-09-02T10:00:00Z" },
    { id: "m4", role: "assistant" as const, content: "four", createdAt: "2026-09-03T10:00:00Z" },
  ];

  it("orders openings by the transcript, starting at the first message", () => {
    expect(chapterOpeningMessageIds({
      messages,
      chapterDividers: { m3: { title: "Chapter one." }, m4: { title: "Chapter two." } },
    })).toEqual(["m1", "m3", "m4"]);
  });

  it("gives one opening for a conversation that was never compacted", () => {
    expect(chapterOpeningMessageIds({ messages })).toEqual(["m1"]);
    expect(chapterOpeningMessageIds({ messages: [] })).toEqual([]);
  });

  it("attaches openings to chapters by ordinal and leaves them absent when counts disagree", () => {
    const manifest = {
      schemaVersion: "1.0.0" as const,
      journeyId: "mirror-desktop", threadId: "t", generation: 1, piSessionId: "s", sourceEntryCount: 4,
      segments: [
        { segment: 1, segmentId: "segment-1", status: "closed" as const, compactionEntryId: "c1", retainedTailFromEntryId: "u1", summaryHead: "## Goal\nOne." },
        { segment: 2, segmentId: "segment-2", status: "current" as const },
      ],
    };
    expect(projectConversationChapters(manifest, { openingMessageIds: ["m1", "m3"] })
      .map((chapter) => chapter.openingMessageId)).toEqual(["m1", "m3"]);
    // A manifest refreshed after the surface would misplace every jump; better none.
    expect(projectConversationChapters(manifest, { openingMessageIds: ["m1"] })
      .map((chapter) => chapter.openingMessageId)).toEqual([undefined, undefined]);
  });
});

// CR080 follow-up: manifests published before chapter evidence existed carry the right
// number of closed Segments and no titles, so a count-only staleness check leaves them
// forever "Untitled chapter". Observed across every Journey whose last compaction predates
// this work, while a Journey that compacted afterwards showed real titles.
describe("chapter evidence staleness", () => {
  function manifest(segments: unknown[]) {
    return {
      schemaVersion: "1.0.0" as const,
      journeyId: "mirror-desktop", threadId: "t", generation: 1, piSessionId: "s",
      sourceEntryCount: 10, segments,
    } as ConversationSegmentManifest;
  }
  const closed = (extra: Record<string, unknown> = {}) => ({
    segment: 1, segmentId: "segment-1", status: "closed" as const,
    compactionEntryId: "c1", retainedTailFromEntryId: "u1", ...extra,
  });
  const current = { segment: 2, segmentId: "segment-2", status: "current" as const };

  it("asks for a rewrite when a closed chapter carries no evidence of what it was", () => {
    expect(needsChapterEvidenceRefresh(manifest([closed(), current]), 1)).toBe(true);
  });

  it("asks for a rewrite when the manifest missed a compaction the session recorded", () => {
    expect(needsChapterEvidenceRefresh(manifest([closed({ summaryHead: "## Goal\nOne." }), current]), 2)).toBe(true);
  });

  it("leaves a manifest alone once every closed chapter is named", () => {
    expect(needsChapterEvidenceRefresh(manifest([closed({ summaryHead: "## Goal\nOne." }), current]), 1)).toBe(false);
  });

  it("does not rewrite a Conversation that has never been compacted", () => {
    expect(needsChapterEvidenceRefresh(manifest([current]), 0)).toBe(false);
  });

  it("asks for a rewrite when nothing has been published yet", () => {
    expect(needsChapterEvidenceRefresh(undefined, 1)).toBe(true);
    expect(needsChapterEvidenceRefresh(undefined, 0)).toBe(true);
  });
});

// CR080 follow-up: chapter dates read as machine coordinates (2026-09-20 – 2026-09-23).
// A reader scanning months of conversation needs a date, not an identifier, and the app
// already formats dates through Intl elsewhere.
describe("chapter date presentation", () => {
  // Intl separates a range with thin spaces around the dash. That glyph choice belongs to
  // the reader's locale data, not to this contract, so the assertions read past it.
  const phrase = (value: string) => value.replace(/\s+/gu, " ");

  it("collapses a range into one readable date phrase", () => {
    expect(phrase(formatChapterDateRange("2026-09-20T09:00:00Z", "2026-09-23T18:00:00Z", "en-US")))
      .toBe("Sep 20 – 23, 2026");
    expect(phrase(formatChapterDateRange("2026-08-28T09:00:00Z", "2026-09-23T18:00:00Z", "en-US")))
      .toBe("Aug 28 – Sep 23, 2026");
  });

  it("says one date when the chapter opened and closed on the same day", () => {
    expect(phrase(formatChapterDateRange("2026-09-23T09:00:00Z", "2026-09-23T18:00:00Z", "en-US")))
      .toBe("Sep 23, 2026");
  });

  it("follows the reader's own locale rather than an invented format", () => {
    expect(formatChapterDateRange("2026-09-20T09:00:00Z", "2026-09-23T18:00:00Z", "pt-BR"))
      .toContain("set.");
  });

  it("presents what it has when a chapter is still open or half-dated", () => {
    expect(phrase(formatChapterDateRange("2026-09-23T09:00:00Z", undefined, "en-US"))).toBe("Since Sep 23, 2026");
    expect(phrase(formatChapterDateRange(undefined, "2026-09-23T18:00:00Z", "en-US"))).toBe("Sep 23, 2026");
  });

  it("says nothing rather than something false when Pi recorded no dates", () => {
    expect(formatChapterDateRange(undefined, undefined, "en-US")).toBe("");
    expect(formatChapterDateRange("not-a-date", "also-not", "en-US")).toBe("");
  });
});

// An index of 27 chapters opens on the three least likely targets. The chapters a reader
// reaches for are the recent ones; the chronological list is how the whole arc is read.
// A labelled section serves both without depending on where the scrollbar happens to sit.
describe("recent chapter shortcuts", () => {
  const chapters = (count: number) => Array.from({ length: count }, (_, index) => ({
    segmentId: `segment-${index + 1}`,
    number: index + 1,
    status: index === count - 1 ? "current" as const : "closed" as const,
    title: `Chapter ${index + 1}.`,
    turnCount: 1,
  }));

  it("puts the current chapter and the two before it first, most recent first", () => {
    expect(recentChapterShortcuts(chapters(27)).map((chapter) => chapter.number)).toEqual([27, 26, 25]);
  });

  // Below the threshold the whole chronological list already fits the first view, so a
  // shortcut section would duplicate nearly all of it and solve nothing.
  it("stays away until the list is long enough to bury its own end", () => {
    expect(recentChapterShortcuts(chapters(6))).toEqual([]);
    expect(recentChapterShortcuts(chapters(7)).map((chapter) => chapter.number)).toEqual([7, 6, 5]);
    expect(CHAPTER_RECENT_SECTION_THRESHOLD).toBe(7);
  });

  it("does not disturb the chronological list it summarizes", () => {
    const all = chapters(9);
    recentChapterShortcuts(all);
    expect(all.map((chapter) => chapter.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
