import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ArtifactMarkdown } from "../app/ArtifactMarkdown";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("Artifact Markdown preview", () => {
  it("renders semantic blocks and inline formatting without executable HTML", () => {
    const html = renderToStaticMarkup(<ArtifactMarkdown content={[
      "# Release plan",
      "",
      "**Duration:** 00:35:51 with *review* and `safe-code`.",
      "",
      "- first item",
      "- second item",
      "",
      "1. approve",
      "2. publish",
      "",
      "> A bounded quotation.",
      "",
      "```json",
      "{\"safe\": true}",
      "```",
      "",
      "<script>alert(1)</script>",
      "[remote](https://example.com) ![image](https://example.com/a.png)",
    ].join("\n")} />);

    expect(html).toContain("<h2>Release plan</h2>");
    expect(html).toContain("<strong>Duration:</strong>");
    expect(html).toContain("<em>review</em>");
    expect(html).toContain("<code>safe-code</code>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain('<blockquote class="artifact-markdown-blockquote">');
    expect(html).toContain('<pre class="artifact-markdown-code"><code>');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("<img");
  });

  it("renders bounded canonical and provider-compacted tables with alignment", () => {
    const canonical = renderToStaticMarkup(<ArtifactMarkdown content={[
      "Episode | Program | Status",
      "---|---:|:---:",
      "8 | 7041 | **replace**",
    ].join("\n")} />);
    const compact = renderToStaticMarkup(<ArtifactMarkdown content="Episode | Program | Status | |---|---:|:---:| | 9 | 7042 | replace |" />);

    for (const html of [canonical, compact]) {
      expect(html).toContain('class="artifact-markdown-table-scroll"');
      expect(html).toContain("<table>");
      expect(html).toContain('<th scope="col" style="text-align:right">Program</th>');
      expect(html).toContain('<th scope="col" style="text-align:center">Status</th>');
    }
    expect(canonical).toContain("<strong>replace</strong>");
    expect(cssSource).toContain(".artifact-markdown-table-scroll");
    expect(cssSource).toContain("overflow-x: auto");
  });

  it("degrades an oversized table shape to inert prose", () => {
    const header = Array.from({ length: 17 }, (_, index) => `H${index}`).join(" | ");
    const delimiter = Array.from({ length: 17 }, () => "---").join(" | ");
    const html = renderToStaticMarkup(<ArtifactMarkdown content={`${header}\n${delimiter}\n${header}`} />);

    expect(html).not.toContain("<table>");
    expect(html).toContain("H0");
  });
});
