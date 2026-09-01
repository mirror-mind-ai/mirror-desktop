import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyDocumentationSurface } from "../app/JourneyDocumentationBrowser";
import type { DocumentationNode, DocumentationTree } from "../domain/journeyDocumentation";
import browserSource from "../app/JourneyDocumentationBrowser.tsx?raw";

const guide: DocumentationNode = {
  relativePath: "guides",
  name: "guides",
  kind: "folder",
  previewKind: "unavailable",
  children: [{
    relativePath: "guides/start.md",
    name: "start.md",
    kind: "file",
    previewKind: "markdown",
    sizeBytes: 128,
    modifiedAt: 1_700_000_000_000,
    children: [],
  }],
};

const readyTree: DocumentationTree = {
  status: "ready",
  rootLabel: "nautilus-harness",
  items: [guide],
};

const handlers = {
  onToggle: vi.fn(),
  onSelect: vi.fn(),
};

describe("JourneyDocumentationBrowser", () => {
  it.each([
    ["loading", "Reading Journey workspace"],
    ["empty", "This Journey workspace is empty"],
    ["error", "Workspace unavailable"],
  ] as const)("renders the %s tree state honestly", (status, expected) => {
    const tree: DocumentationTree | { status: "loading" } | { status: "error"; message: string } = status === "error"
      ? { status, message: "A bounded read failed." }
      : status === "loading"
        ? { status }
        : { status, rootLabel: "nautilus-harness", items: [] };
    const html = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={tree}
        expandedPaths={new Set()}
        selectedNode={undefined}
        content={{ status: "idle" }}
        {...handlers}
      />,
    );
    expect(html).toContain(expected);
  });

  it("renders a nested accessible tree with relative paths and no links", () => {
    const html = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={readyTree}
        expandedPaths={new Set(["guides"])}
        selectedNode={guide.children[0]}
        content={{
          status: "ready",
          relativePath: "guides/start.md",
          previewKind: "markdown",
          content: "# Start\n\nSafe documentation.",
          sizeBytes: 128,
          modifiedAt: 1_700_000_000_000,
        }}
        {...handlers}
      />,
    );

    expect(html).toContain('role="tree"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("guides/start.md");
    expect(html).toContain('data-artifact-icon="folder"');
    expect(html).toContain('data-artifact-icon="markdown"');
    expect(html).toContain("Safe documentation.");
    expect(html).not.toContain("href=");
    expect(html).toContain("Open file");
  });

  it("shows metadata and an honest reason when preview is unavailable", () => {
    const unsupported: DocumentationNode = {
      relativePath: "images/map.png",
      name: "map.png",
      kind: "file",
      previewKind: "unavailable",
      sizeBytes: 2048,
      children: [],
    };
    const html = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={readyTree}
        expandedPaths={new Set()}
        selectedNode={unsupported}
        content={{
          status: "unavailable",
          relativePath: unsupported.relativePath,
          previewKind: "unavailable",
          sizeBytes: unsupported.sizeBytes,
          reason: "unsupported_type",
        }}
        {...handlers}
      />,
    );

    expect(html).toContain('data-artifact-icon="image"');
    expect(html).toContain("Preview unavailable");
    expect(html).toContain("Unsupported document type");
    expect(html).toContain("2 KB");
  });

  it("contains no mutation, attachment, polling or executable HTML path", () => {
    for (const forbidden of [
      "dangerouslySetInnerHTML",
      "setInterval",
      "attach",
      "delete",
      "rename",
      "open_local_reference",
      "start_pi_invocation",
    ]) {
      expect(browserSource).not.toContain(forbidden);
    }
  });
});
