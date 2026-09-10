import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import {
  JourneyDocumentationSurface,
  resolveArtifactNavigationIntent,
} from "../app/JourneyDocumentationBrowser";
import type { DocumentationNode, DocumentationTree } from "../domain/journeyDocumentation";
import browserSource from "../app/JourneyDocumentationBrowser.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

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
  it("expands preview only after an exact linked Artifact file resolves", () => {
    expect(resolveArtifactNavigationIntent(readyTree.items, {
      relativePath: "guides/start.md",
      expandPreview: true,
    })).toMatchObject({
      kind: "resolved",
      ancestorPaths: ["guides"],
      shouldExpandPreview: true,
      node: { relativePath: "guides/start.md", kind: "file" },
    });
    expect(resolveArtifactNavigationIntent(readyTree.items, {
      relativePath: "guides/missing.md",
      expandPreview: true,
    })).toEqual({ kind: "rejected", shouldExpandPreview: false });
    expect(resolveArtifactNavigationIntent(readyTree.items, {
      relativePath: "guides",
      expandPreview: true,
    })).toEqual({ kind: "rejected", shouldExpandPreview: false });
    expect(resolveArtifactNavigationIntent(readyTree.items, {
      relativePath: "guides/start.md",
      expandPreview: false,
    })).toMatchObject({ kind: "resolved", shouldExpandPreview: false });
  });

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
    expect(html.match(/aria-haspopup="menu"/g)).toHaveLength(2);
    expect(html).toContain("guides/start.md");
    expect(html).toContain('data-artifact-icon="folder"');
    expect(html).toContain('data-artifact-icon="markdown"');
    expect(html).toContain("Safe documentation.");
    expect(html).not.toContain("href=");
    expect(html).toContain("Open file");
  });

  it("offers an accessible presentation-only preview expansion toggle", () => {
    const onPreviewExpandedChange = vi.fn();
    const collapsed = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={readyTree}
        expandedPaths={new Set(["guides"])}
        selectedNode={guide.children[0]}
        content={{ status: "idle" }}
        previewExpanded={false}
        onPreviewExpandedChange={onPreviewExpandedChange}
        {...handlers}
      />,
    );
    const expanded = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={readyTree}
        expandedPaths={new Set(["guides"])}
        selectedNode={guide.children[0]}
        content={{ status: "idle" }}
        previewExpanded
        onPreviewExpandedChange={onPreviewExpandedChange}
        {...handlers}
      />,
    );

    expect(collapsed).toContain('aria-pressed="false"');
    expect(collapsed).toContain('aria-controls="journey-artifact-workspace-tree"');
    expect(collapsed).toContain("Expand preview");
    expect(expanded).toContain('class="operational-artifacts-layout is-preview-expanded"');
    expect(expanded).toContain('aria-pressed="true"');
    expect(expanded).toContain("Show workspace tree");
    expect(expanded).toContain('id="journey-artifact-workspace-tree"');
    expect(expanded).toContain('aria-selected="true"');
    expect(cssSource).toContain("/* Artifact preview expansion contract. */");
    expect(cssSource).toContain(".operational-artifacts-layout.is-preview-expanded");
    expect(cssSource).toContain(".artifact-preview-layout-toggle:focus-visible");
  });

  it("offers reload without replacing the visible tree and reports lazy folder loading", () => {
    const html = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={readyTree}
        expandedPaths={new Set(["guides"])}
        selectedNode={undefined}
        content={{ status: "idle" }}
        treeReloading
        loadingPaths={new Set(["guides"])}
        {...handlers}
      />,
    );

    expect(html).toContain('aria-label="Reload workspace"');
    expect(html).toContain("Reloading workspace…");
    expect(html).toContain("Loading guides…");
    expect(html).toContain("release bundles remain available");
    expect(html).toContain("guides/start.md");
    expect(cssSource).toContain(".artifact-tree-reload:focus-visible");
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

  it("keeps reveal failures local to the Artifacts surface", () => {
    const html = renderToStaticMarkup(
      <JourneyDocumentationSurface
        tree={readyTree}
        expandedPaths={new Set()}
        selectedNode={undefined}
        content={{ status: "idle" }}
        artifactActionError="Could not reveal the selected Artifact."
        {...handlers}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not reveal the selected Artifact.");
  });

  it("contains no mutation, attachment, polling or executable HTML path", () => {
    for (const forbidden of [
      "dangerouslySetInnerHTML",
      "setInterval",
      "attach",
      "deleteJourney",
      "rename",
      "open_local_reference",
      "start_pi_invocation",
    ]) {
      expect(browserSource).not.toContain(forbidden);
    }
  });
});
