// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const readme = read("../../README.md");
const guide = read("../../docs/alpha/private-macos-alpha.md");
const evidence = read("../../docs/alpha/evidence-template.md");
const rollback = read("../../docs/alpha/rollback.md");

describe("private macOS alpha documentation", () => {
  it("links one canonical route from the repository entry point", () => {
    expect(readme).toContain("docs/alpha/private-macos-alpha.md");
    expect(guide).toContain("npm run alpha:preflight");
    expect(guide).toContain("npm ci");
    expect(guide).toContain("npm run tauri:build:user -- -- --locked");
    expect(guide).toContain("ai.mirrormind.desktop");
    expect(guide).toContain("evidence-template.md");
    expect(guide).toContain("rollback.md");
    expect(guide).toContain("Preparing your conversation");
    expect(guide).toContain("A previous attempt didn’t finish");
  });

  it("keeps evidence bounded and rollback non-destructive", () => {
    expect(evidence).toContain("Do not include credentials");
    expect(evidence).toContain("Restart continuity");
    expect(rollback).toContain("Do not delete or reset");
    expect(rollback).toContain("com.nautilus.harness");
    expect(rollback).not.toContain("rm -rf -- ~/Library");
  });

  it("does not embed maintainer coordinates or broad Gatekeeper bypasses", () => {
    for (const source of [guide, evidence, rollback]) {
      expect(source).not.toContain("alisson-vale");
      expect(source).not.toContain("/Users/");
      expect(source).not.toContain("spctl --master-disable");
      expect(source).not.toContain("xattr -cr");
    }
  });
});
