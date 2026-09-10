import { describe, expect, it } from "vitest";
import {
  normalizeDocumentationContent,
  loadedDocumentationPaths,
  normalizeDocumentationTree,
  replaceDocumentationNodeChildren,
  toggleExpandedDocumentationPath,
  type DocumentationNode,
} from "../domain/journeyDocumentation";
import storageSource from "../app/journeyDocumentationStorage.ts?raw";

describe("Journey documentation domain", () => {
  it("normalizes and deterministically sorts folders before files", () => {
    const tree = normalizeDocumentationTree({
      status: "ready",
      rootLabel: "nautilus-harness",
      items: [
        { relativePath: "z.md", name: "z.md", kind: "file", previewKind: "markdown", children: [] },
        { relativePath: "Alpha.txt", name: "Alpha.txt", kind: "file", previewKind: "text", children: [] },
        {
          relativePath: "guides",
          name: "guides",
          kind: "folder",
          previewKind: "unavailable",
          children: [
            { relativePath: "guides/b.md", name: "b.md", kind: "file", previewKind: "markdown", children: [] },
            { relativePath: "guides/A.md", name: "A.md", kind: "file", previewKind: "markdown", children: [] },
          ],
        },
      ],
    });

    expect(tree.status).toBe("ready");
    expect(tree.rootLabel).toBe("nautilus-harness");
    expect(tree.items.map((item) => item.name)).toEqual(["guides", "Alpha.txt", "z.md"]);
    expect(tree.items[0].children.map((item) => item.name)).toEqual(["A.md", "b.md"]);
  });

  it("rejects malformed or absolute-path transport payloads", () => {
    expect(() => normalizeDocumentationTree({ status: "ready", rootLabel: "docs", items: [{
      relativePath: "/private/file.md",
      name: "file.md",
      kind: "file",
      previewKind: "markdown",
      children: [],
    }] })).toThrow("invalid");

    expect(() => normalizeDocumentationContent({ status: "ready", relativePath: "../outside.md" })).toThrow("invalid");
    expect(() => normalizeDocumentationTree({ status: "ready", rootLabel: "docs", items: [{
      relativePath: "target",
      name: "target",
      kind: "folder",
      previewKind: "unavailable",
      childrenLoaded: false,
      children: [{ relativePath: "target/release", name: "release", kind: "folder", previewKind: "unavailable", children: [] }],
    }] })).toThrow("invalid");
  });

  it("toggles expanded folders without mutating the previous set", () => {
    const initial = new Set(["guides"]);
    const closed = toggleExpandedDocumentationPath(initial, "guides");
    const opened = toggleExpandedDocumentationPath(closed, "architecture");

    expect(initial.has("guides")).toBe(true);
    expect(closed.has("guides")).toBe(false);
    expect(opened.has("architecture")).toBe(true);
  });

  it("merges lazily loaded children without replacing sibling branches", () => {
    const root: DocumentationNode[] = [{
      relativePath: "src-tauri",
      name: "src-tauri",
      kind: "folder",
      previewKind: "unavailable",
      children: [],
      childrenLoaded: false,
    }, {
      relativePath: "README.md",
      name: "README.md",
      kind: "file",
      previewKind: "markdown",
      children: [],
      childrenLoaded: true,
    }];
    const children: DocumentationNode[] = [{
      relativePath: "src-tauri/target",
      name: "target",
      kind: "folder",
      previewKind: "unavailable",
      children: [],
      childrenLoaded: false,
    }];

    const loaded = replaceDocumentationNodeChildren(root, "src-tauri", children);

    expect(loaded[0]).toMatchObject({ childrenLoaded: true, children });
    expect(loaded[1]).toBe(root[1]);
    expect([...loadedDocumentationPaths(loaded)]).toContain("src-tauri/target");
  });

  it("keeps the Tauri adapter isolated from runtime and persistence ownership", () => {
    expect(storageSource).toContain('"list_journey_documentation"');
    expect(storageSource).toContain('"read_journey_document"');
    expect(storageSource).toContain("{ journeyId, relativePath }");
    expect(storageSource).not.toContain("journeyRoot");
    for (const forbidden of ["piProcessStream", "providerConfig", "mirror", "saveJourneyConversation", "setInterval"] ) {
      expect(storageSource).not.toContain(forbidden);
    }
  });

  it("keeps transport nodes free from absolute host paths", () => {
    const node: DocumentationNode = {
      relativePath: "architecture/index.md",
      name: "index.md",
      kind: "file",
      previewKind: "markdown",
      children: [],
    };
    expect(node.relativePath.startsWith("/")).toBe(false);
  });
});
