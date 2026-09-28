import { describe, expect, it } from "vitest";
import {
  CHAPTER_TITLE_MAX_LENGTH,
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
  it("names the chapter that closed and when, in the reader's own locale-independent form", () => {
    expect(describeChapterDivider({ title: "Finish the compaction chapters.", closedAt: "2026-09-19T08:00:00Z" }))
      .toEqual({ label: "Chapter closed", title: "Finish the compaction chapters.", closedAt: "2026-09-19" });
  });

  it("stays truthful when Pi recorded no time for the cut", () => {
    expect(describeChapterDivider({ title: "Earlier work." }))
      .toEqual({ label: "Chapter closed", title: "Earlier work.", closedAt: undefined });
  });

  it("does not present an unparseable timestamp as a date", () => {
    expect(describeChapterDivider({ title: "Earlier work.", closedAt: "not-a-date" }).closedAt).toBeUndefined();
  });
});
