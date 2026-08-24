import { describe, expect, it } from "vitest";
import { parseLinkifiedText } from "../app/LinkifiedText";

describe("LinkifiedText", () => {
  it("detects HTTP links without trailing punctuation", () => {
    expect(parseLinkifiedText("Open https://example.com/docs.")) .toEqual([
      { type: "text", text: "Open " },
      { type: "url", text: "https://example.com/docs", href: "https://example.com/docs" },
      { type: "text", text: "." },
    ]);
  });

  it("detects Harness doc paths as local path links", () => {
    expect(parseLinkifiedText("See docs/project/roadmap/index.md for details")).toEqual([
      { type: "text", text: "See " },
      { type: "local_path", text: "docs/project/roadmap/index.md" },
      { type: "text", text: " for details" },
    ]);
  });

  it("detects artifact paths and root documentation files as local path links", () => {
    expect(parseLinkifiedText("Files artifacts/programa-inicial-v1/index.html and mkdocs.yml")).toEqual([
      { type: "text", text: "Files " },
      { type: "local_path", text: "artifacts/programa-inicial-v1/index.html" },
      { type: "text", text: " and " },
      { type: "local_path", text: "mkdocs.yml" },
    ]);
  });

  it("detects absolute local paths as local path links", () => {
    expect(parseLinkifiedText("File /Users/alissonvale/example.md")).toEqual([
      { type: "text", text: "File " },
      { type: "local_path", text: "/Users/alissonvale/example.md" },
    ]);
  });
});
