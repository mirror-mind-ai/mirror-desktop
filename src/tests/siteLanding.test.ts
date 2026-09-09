// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../../site/index.html");
const css = read("../../site/styles.css");
const readme = read("../../README.md");

describe("mirrormind.sh landing page", () => {
  it("uses the approved Mirror Mind positioning from Mirror Core", () => {
    expect(html).toContain("Local-first memory and identity for agentic AI runtimes.");
    expect(html).toContain("Mirror Mind gives agents continuity: identity, journeys, memory, personas");
    expect(html).toContain("Pi, Gemini CLI, Codex, and Claude Code");
  });

  it("links Mirror Core, Mirror Desktop, alpha notes, Windows build guide and Portuguese domain", () => {
    expect(html).toContain('href="https://github.com/mirror-mind-ai/mirror" target="_blank" rel="noreferrer"');
    expect(html).toContain("Mirror Core");
    expect(html).toContain('href="https://github.com/mirror-mind-ai/mirror-desktop" target="_blank" rel="noreferrer"');
    expect(html).toContain("Mirror Desktop");
    expect(html).toContain("https://github.com/mirror-mind-ai/mirror-desktop/tree/main/docs/releases");
    expect(html).toContain("docs/windows/manual-build.md");
    expect(html).toContain("https://mirrormind.com.br");
  });

  it("does not revive Nautilus-specific projection language or the hero terminal card", () => {
    expect(html).not.toContain("operational, tactical, and strategic");
    expect(html).not.toContain("Nautilus");
    expect(html).not.toContain("terminal-card");
    expect(html).not.toContain("npm run tauri -- build");
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
