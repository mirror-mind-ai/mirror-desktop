import { describe, expect, it } from "vitest";
import { normalizeChatLocalReferenceDisposition } from "../app/chatLocalReferenceNavigation";
import { findDocumentationNode, type DocumentationNode } from "../domain/journeyDocumentation";

describe("chat local reference navigation", () => {
  it("accepts only bounded Journey document and external file dispositions", () => {
    expect(normalizeChatLocalReferenceDisposition({
      kind: "journey_document",
      relativePath: "docs/guide.md",
    })).toEqual({ kind: "journey_document", relativePath: "docs/guide.md" });
    expect(normalizeChatLocalReferenceDisposition({ kind: "external_file" }))
      .toEqual({ kind: "external_file" });
    expect(() => normalizeChatLocalReferenceDisposition({
      kind: "journey_document",
      relativePath: "../outside.md",
    })).toThrow("invalid evidence");
    expect(() => normalizeChatLocalReferenceDisposition({
      kind: "external_file",
      relativePath: "/private/leak",
    })).toThrow("invalid evidence");
  });

  it("finds an exact artifact and the folders that must be expanded", () => {
    const guide: DocumentationNode = {
      relativePath: "docs/guides/start.md",
      name: "start.md",
      kind: "file",
      previewKind: "markdown",
      children: [],
    };
    const tree: DocumentationNode[] = [{
      relativePath: "docs",
      name: "docs",
      kind: "folder",
      previewKind: "unavailable",
      children: [{
        relativePath: "docs/guides",
        name: "guides",
        kind: "folder",
        previewKind: "unavailable",
        children: [guide],
      }],
    }];
    expect(findDocumentationNode(tree, guide.relativePath)).toEqual({
      node: guide,
      ancestorPaths: ["docs", "docs/guides"],
    });
    expect(findDocumentationNode(tree, "docs/missing.md")).toBeUndefined();
  });
});
