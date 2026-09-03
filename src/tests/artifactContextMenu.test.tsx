import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ArtifactContextMenu } from "../app/ArtifactContextMenu";
import type { DocumentationNode } from "../domain/journeyDocumentation";
import browserSource from "../app/JourneyDocumentationBrowser.tsx?raw";
import menuSource from "../app/ArtifactContextMenu.tsx?raw";
import storageSource from "../app/journeyDocumentationStorage.ts?raw";

const node: DocumentationNode = {
  relativePath: "guides/start.md",
  name: "start.md",
  kind: "file",
  previewKind: "markdown",
  children: [],
};

describe("Artifact context menu", () => {
  it.each([
    [node, "Reveal File..."],
    [{ ...node, relativePath: "guides", name: "guides", kind: "folder" as const }, "Reveal Folder..."],
  ])("offers one exact-target %s reveal action", (target, expectedLabel) => {
    const html = renderToStaticMarkup(
      <ArtifactContextMenu
        node={target}
        x={24}
        y={48}
        returnFocusTo={null}
        onReveal={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain('role="menu"');
    expect(html).toContain(`aria-label="${target.name} options"`);
    expect(html.match(/role="menuitem"/g)).toHaveLength(1);
    expect(html).toContain(expectedLabel);
    expect(html).not.toContain("Reveal file/folder");
    expect(menuSource).toContain("onReveal(node)");
  });

  it("dismisses outside and restores exact row focus on Escape", () => {
    expect(menuSource).toContain('document.addEventListener("mousedown", closeOnOutsidePointer)');
    expect(menuSource).toContain('document.addEventListener("keydown", closeWithKeyboard)');
    expect(menuSource).toContain('event.key === "Escape"');
    expect(menuSource).toContain("returnFocusRef.current?.focus()");
  });

  it("opens from pointer or keyboard and invokes only registered Journey coordinates", () => {
    expect(browserSource).toContain("onContextMenu={openFromPointer}");
    expect(browserSource).toContain("onKeyDown={openFromKeyboard}");
    expect(browserSource).toContain('event.key !== "ContextMenu"');
    expect(browserSource).toContain('event.shiftKey && event.key === "F10"');
    expect(browserSource).toContain('aria-haspopup="menu"');
    expect(browserSource).toContain("revealJourneyArtifact(journeyId, node.relativePath)");
    expect(browserSource).toContain("artifactActionRequestRef.current === request");
    expect(storageSource).toContain('invoke("reveal_journey_artifact", { journeyId, relativePath })');
    expect(storageSource).not.toContain("absolutePath");
  });
});
