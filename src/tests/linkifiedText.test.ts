import { describe, expect, it } from "vitest";
import { applyVerifiedLocalPaths, parseLinkifiedText } from "../app/LinkifiedText";

describe("LinkifiedText", () => {
  it("detects public and loopback HTTP links without trailing punctuation", () => {
    expect(parseLinkifiedText("Open https://example.com/docs.")) .toEqual([
      { type: "text", text: "Open " },
      { type: "url", text: "https://example.com/docs", href: "https://example.com/docs" },
      { type: "text", text: "." },
    ]);
    expect(parseLinkifiedText("Open http://127.0.0.1:8012/")) .toEqual([
      { type: "text", text: "Open " },
      { type: "url", text: "http://127.0.0.1:8012/", href: "http://127.0.0.1:8012/" },
    ]);
  });

  it("does not treat a slash embedded in ordinary prose as a local path", () => {
    expect(parseLinkifiedText("Estado errado/incompleto")) .toEqual([
      { type: "text", text: "Estado errado/incompleto" },
    ]);
  });

  it("detects supported path shapes as candidates, not links", () => {
    expect(parseLinkifiedText("See docs/project/roadmap/index.md and /Users/example/note.md")).toEqual([
      { type: "text", text: "See " },
      { type: "local_path_candidate", text: "docs/project/roadmap/index.md" },
      { type: "text", text: " and " },
      { type: "local_path_candidate", text: "/Users/example/note.md" },
    ]);
  });

  it("promotes only native-verified files to local path links", () => {
    const parsed = parseLinkifiedText("Files docs/real.md and docs/missing.md");
    expect(applyVerifiedLocalPaths(parsed, new Set(["docs/real.md"]))).toEqual([
      { type: "text", text: "Files " },
      { type: "local_path", text: "docs/real.md" },
      { type: "text", text: " and " },
      { type: "text", text: "docs/missing.md" },
    ]);
  });
});
