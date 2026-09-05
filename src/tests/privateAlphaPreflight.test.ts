// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { tmpdir } from "node:os";
// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error The source-built preflight is a Node module outside the frontend graph.
import { matchesCompatibility, parseArguments, sanitizeOrigin, validateRuntimeCoordinates } from "../../scripts/private_alpha_preflight.mjs";

const fixtures: string[] = [];

function runtimeFixture(version = "0.31.14") {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "mirror-alpha-preflight-")));
  fixtures.push(base);
  const root = join(base, "mirror");
  const home = join(base, "mirror-home");
  mkdirSync(join(root, "src", "memory"), { recursive: true });
  mkdirSync(home);
  writeFileSync(join(root, "pyproject.toml"), `[project]\nversion = "${version}"\n`);
  writeFileSync(join(home, "memory.db"), "");
  return { mirrorRoot: root, mirrorHome: home, mirrorUser: "example-user" };
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe("private alpha preflight", () => {
  it("parses only explicit bounded arguments", () => {
    expect(parseArguments([
      "--json", "--mirror-root", "/mirror", "--mirror-home", "/home", "--mirror-user", "example",
    ])).toEqual({ json: true, mirrorRoot: "/mirror", mirrorHome: "/home", mirrorUser: "example" });
    expect(() => parseArguments(["--token", "secret"])).toThrow(/Unsupported/);
    expect(sanitizeOrigin("https://token@example.com/repository.git")).toBe("https://example.com/repository.git");
  });

  it("uses the bounded Mirror Core compatibility range", () => {
    expect(matchesCompatibility("0.31.14", ">=0.31.14,<0.32.0")).toBe(true);
    expect(matchesCompatibility("0.31.99", ">=0.31.14,<0.32.0")).toBe(true);
    expect(matchesCompatibility("0.31.13", ">=0.31.14,<0.32.0")).toBe(false);
    expect(matchesCompatibility("0.32.0", ">=0.31.14,<0.32.0")).toBe(false);
  });

  it("validates canonical runtime metadata without reading the database", () => {
    const fixture = runtimeFixture();
    expect(validateRuntimeCoordinates(fixture, ">=0.31.14,<0.32.0")).toBe("0.31.14");
    expect(() => validateRuntimeCoordinates({ ...fixture, mirrorUser: "../unsafe" }, ">=0.31.14,<0.32.0"))
      .toThrow(/bounded lowercase slug/);
  });

  it("rejects incompatible Core and symlinked homes", () => {
    const incompatible = runtimeFixture("0.32.0");
    expect(() => validateRuntimeCoordinates(incompatible, ">=0.31.14,<0.32.0")).toThrow(/incompatible/);

    const fixture = runtimeFixture();
    const linkedHome = join(fixture.mirrorRoot, "linked-home");
    symlinkSync(fixture.mirrorHome, linkedHome);
    expect(() => validateRuntimeCoordinates({ ...fixture, mirrorHome: linkedHome }, ">=0.31.14,<0.32.0"))
      .toThrow(/safe canonical directory/);
  });
});
