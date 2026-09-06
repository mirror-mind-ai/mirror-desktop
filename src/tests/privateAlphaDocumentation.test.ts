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
    expect(guide).toContain("macOS 12");
    expect(guide).toContain("python -m unittest discover");
    expect(guide).toContain("pi --list-models");
    expect(guide).toContain("NVM, FNM, Volta, asdf and mise");
    expect(guide).toContain("No link setup is required");
    expect(guide).toContain("ai.mirrormind.desktop");
    expect(guide).toContain("evidence-template.md");
    expect(guide).toContain("rollback.md");
    expect(guide).toContain("Preparing your conversation");
    expect(guide).toContain("A previous attempt didn’t finish");
    expect(guide).toContain("Connect your Mirror");
    expect(guide).toContain("Validate and continue");
    expect(guide).toContain("Choose your model");
    expect(guide).toContain("Save model and continue");
    expect(guide).toContain("Do not run `npm run import:mirror`");
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
