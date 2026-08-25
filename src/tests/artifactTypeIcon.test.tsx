import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtifactTypeIcon, artifactIconKind } from "../app/ArtifactTypeIcon";

describe("ArtifactTypeIcon", () => {
  it.each([
    ["README.md", "markdown"],
    ["book.markdown", "markdown"],
    ["reading.pdf", "pdf"],
    ["notes.txt", "text"],
    ["photo.png", "image"],
    ["App.tsx", "code"],
    ["config.yaml", "data"],
    ["bundle.zip", "archive"],
    ["proposal.docx", "document"],
    ["unknown.bin", "file"],
  ] as const)("maps %s to the %s icon", (path, expected) => {
    expect(artifactIconKind(path, "file")).toBe(expected);
  });

  it("always uses the familiar folder icon for folders", () => {
    expect(artifactIconKind("anything.pdf", "folder")).toBe("folder");
  });

  it.each(["folder", "markdown", "pdf", "text", "image", "code", "data", "archive", "document", "file"] as const)(
    "renders a decorative %s SVG without replacing the text label",
    (kind) => {
      const html = renderToStaticMarkup(<ArtifactTypeIcon kind={kind} open={kind === "folder"} />);
      expect(html).toContain("<svg");
      expect(html).toContain(`data-artifact-icon="${kind}"`);
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain("role=");
    },
  );
});
