// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const readme = read("../../README.md");
const guide = read("../../docs/windows/manual-build.md");

describe("Windows manual build documentation", () => {
  it("is linked from the repository entry point", () => {
    expect(readme).toContain("docs/windows/manual-build.md");
    expect(readme).toContain("Windows auto-update and signed Windows release publication are not configured yet");
  });

  it("gives a minimal pull and local build path", () => {
    for (const phrase of [
      "git pull",
      "npm install",
      "npm run build",
      "npm run tauri -- build",
      "src-tauri\\target\\release\\bundle\\",
      "Git commit/revision",
      "Generated artifact path",
    ]) {
      expect(guide).toContain(phrase);
    }
  });

  it("names Windows prerequisites and current limitations", () => {
    for (const phrase of [
      "Git for Windows",
      "Node.js LTS",
      "Rust using the MSVC toolchain",
      "Visual Studio Build Tools",
      "Desktop development with C++",
      "WebView2 Runtime",
      "Windows auto-update is not configured yet",
      "Authenticode code signing is not configured yet",
      "SmartScreen may warn",
    ]) {
      expect(guide).toContain(phrase);
    }
  });

  it("keeps publication and state boundaries explicit", () => {
    for (const phrase of [
      "should not upload artifacts",
      "create releases",
      "create tags",
      "change updater manifests",
      "memory.db",
      "credentials",
      "Nautilus Harness state",
      "compiles application bytes only",
    ]) {
      expect(guide).toContain(phrase);
    }
  });
});
