import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ChapterDividerRow } from "../app/ChapterDividerRow";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

// CR080: where a chapter closed, the transcript says so. Compaction stops being invisible.
describe("chapter divider row", () => {
  it("names the closed chapter and the day it closed", () => {
    const html = renderToStaticMarkup(
      <ChapterDividerRow divider={{ title: "Finish the compaction chapters.", closedAt: "2026-09-19T08:00:00Z" }} />,
    );
    expect(html).toContain("Chapter closed");
    expect(html).toContain("Finish the compaction chapters.");
    expect(html).toContain("2026-09-19");
    // It is a landmark in the reading, not a message from anybody.
    expect(html).toContain('role="separator"');
    expect(html).toContain("chapter-divider");
    expect(html).not.toContain("message");
  });

  it("omits the date Pi did not record instead of inventing one", () => {
    const html = renderToStaticMarkup(<ChapterDividerRow divider={{ title: "Earlier work." }} />);
    expect(html).toContain("Earlier work.");
    expect(html).not.toContain("chapter-divider-date");
  });

  it("is drawn above the message that opens the next chapter", () => {
    // The divider precedes the message row it belongs to, and reads from the derived
    // surface so it survives a reload.
    const render = transcriptSource.slice(transcriptSource.indexOf("{messages.map((message) => {"));
    expect(render).toContain("chapterDividers");
    expect(render.indexOf("<ChapterDividerRow")).toBeLessThan(render.indexOf("<ConversationMessageRow"));
    expect(cssSource).toContain(".chapter-divider {");
  });

  // The divider was styled with a custom property this stylesheet never defines, so its
  // title and date always fell back to a dark-theme grey and vanished on the light themes.
  it("derives its muted text from the surrounding colour instead of an undefined variable", () => {
    expect(cssSource).not.toContain("--ui-text-muted");
    const dividerRules = cssSource.slice(cssSource.indexOf(".chapter-divider {"));
    expect(dividerRules.slice(0, 900)).toContain("color-mix(in srgb, currentColor");
    expect(dividerRules.slice(0, 900)).toContain("rgba(var(--ui-accent-rgb)");
  });
});
