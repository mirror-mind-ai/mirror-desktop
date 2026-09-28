import { describe, expect, it } from "vitest";
import { CHAPTER_TITLE_MAX_LENGTH, chapterTitleFromSummary } from "../domain/compactionChapters";

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
