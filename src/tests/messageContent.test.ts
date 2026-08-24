import { describe, expect, it } from "vitest";
import { parseInlineTokens, parseMessageBlocks } from "../app/MessageContent";

describe("MessageContent rich rendering parser", () => {
  it("parses generic Markdown-style headings, lists, paragraphs, and code blocks", () => {
    const blocks = parseMessageBlocks([
      "## Summary",
      "A short paragraph.",
      "",
      "1. First step",
      "2. Second step",
      "",
      "- one risk",
      "- another risk",
      "",
      "```json",
      '{"safe": true}',
      "```",
    ].join("\n"));

    expect(blocks).toEqual([
      { type: "heading", level: 3, text: "Summary" },
      { type: "paragraph", text: "A short paragraph." },
      { type: "ordered_list", items: ["First step", "Second step"] },
      { type: "unordered_list", items: ["one risk", "another risk"] },
      { type: "code", language: "json", text: '{"safe": true}' },
    ]);
  });

  it("parses inline emphasis without evaluating HTML", () => {
    const tokens = parseInlineTokens("Use **strong**, *emphasis*, `code`, and <script>alert(1)</script>.");

    expect(tokens).toContainEqual({ type: "strong", text: "strong" });
    expect(tokens).toContainEqual({ type: "emphasis", text: "emphasis" });
    expect(tokens).toContainEqual({ type: "code", text: "code" });
    expect(tokens).toContainEqual({ type: "text", text: ", and <script>alert(1)</script>." });
  });
});
