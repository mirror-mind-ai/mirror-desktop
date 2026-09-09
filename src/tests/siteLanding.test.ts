// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../../site/index.html");
const css = read("../../site/styles.css");
const readme = read("../../README.md");

describe("mirrormind.sh landing page", () => {
  it("uses the approved experiential Mirror Mind positioning", () => {
    expect(html).toContain("AI agents that remember where you left off.");
    expect(html).toContain("Mirror Mind gives your agents a local memory of who you are");
    expect(html).toContain("what you are building, and the journeys already in motion");
    expect(html).toContain("turning separate AI sessions into one continuous working relationship");
  });

  it("links Mirror Core, Mirror Desktop and Portuguese domain", () => {
    expect(html).toContain('href="https://github.com/mirror-mind-ai/mirror" target="_blank" rel="noreferrer"');
    expect(html).toContain("Mirror Core");
    expect(html).toContain('href="https://github.com/mirror-mind-ai/mirror-desktop" target="_blank" rel="noreferrer"');
    expect(html).toContain("Mirror Desktop");
    expect(html).toContain("https://mirrormind.com.br");
  });

  it("does not revive Nautilus-specific projection language, release logistics or the hero terminal card", () => {
    expect(html).not.toContain("operational, tactical, and strategic");
    expect(html).not.toContain("Nautilus");
    expect(html).not.toContain("terminal-card");
    expect(html).not.toContain("npm run tauri -- build");
    expect(html).not.toContain("updates.mirrormind.com.br");
    expect(html).not.toContain("Windows manual build");
  });

  it("shows a Mirror Desktop screenshot in the hero", () => {
    expect(html).toContain("./assets/mirror-desktop-screenshot-tide.jpg");
    expect(html).toContain("Mirror Desktop application screenshot using the Tide theme");
    expect(html).toContain("hero-shot");
    expect(html).not.toContain("desktop alpha");
    expect(css).toContain(".desktop-shot");
  });

  it("contains the approved what changes and modes sections", () => {
    for (const phrase of [
      "what changes",
      "Remember the thread.",
      "Keep the work in motion.",
      "Choose the surface.",
      "Keep memory local.",
      "four ways to cross the terrain",
      "Return to yourself before deciding.",
      "Hold uncertainty without rushing into implementation.",
      "When the direction is clear, move into construction.",
      "Enter a quieter listening mode for inner life.",
    ]) {
      expect(html).toContain(phrase);
    }
  });

  it("keeps header and footer focused on approved surfaces", () => {
    expect(html).toContain('href="#what-changes"');
    expect(html).toContain('href="#modes"');
    expect(html).toContain("English / developers");
    expect(html).not.toContain("updater endpoint");
  });

  it("keeps the visual system minimal, dark and mono", () => {
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("ui-monospace");
    expect(css).toContain("position: sticky");
    expect(css).toContain("--accent");
  });

  it("documents the static site location without implying deployment", () => {
    expect(readme).toContain("[site/](site/)");
    expect(readme).toContain("deploying it requires a separate explicit publication/DNS instruction");
  });
});
