import { describe, expect, it } from "vitest";
import {
  artifactName,
  assertReleaseTag,
  buildProvenance,
  parseSemver,
} from "../../scripts/release_candidate.mjs";

describe("release candidate provenance", () => {
  it("requires a canonical semver release version", () => {
    expect(parseSemver("0.2.0")).toBe("0.2.0");
    expect(() => parseSemver("release-0.2")).toThrow(/Invalid release version/);
  });

  it("derives the immutable tag from the exact release version", () => {
    expect(assertReleaseTag("0.2.0", "v0.2.0")).toBe("v0.2.0");
    expect(() => assertReleaseTag("0.2.0", "0.2.0")).toThrow(/Release tag must be v0.2.0/);
  });

  it("names macOS artifacts with product, version and architecture", () => {
    expect(artifactName({ version: "0.2.0", architecture: "x64" })).toBe("Mirror Desktop_0.2.0_x64.dmg");
    expect(artifactName({ version: "0.2.0", architecture: "aarch64" })).toBe("Mirror Desktop_0.2.0_aarch64.dmg");
    expect(() => artifactName({ version: "0.2.0", architecture: "linux" })).toThrow(/Unsupported release architecture/);
  });

  it("builds a privacy-safe provenance receipt without release authority", () => {
    const receipt = buildProvenance({
      version: "0.2.0",
      tag: "v0.2.0",
      revision: "a".repeat(40),
      artifact: "Mirror Desktop_0.2.0_x64.dmg",
      architecture: "x64",
      sha256: "b".repeat(64),
      checks: { worktreeClean: true, versionFilesAgree: true },
    });

    expect(receipt).toMatchObject({
      schemaVersion: "1.0.0",
      product: "Mirror Desktop",
      version: "0.2.0",
      tag: "v0.2.0",
      boundaries: {
        binariesCommittedToSource: false,
        selfUpdateAuthority: false,
        signingOrNotarizationClaimed: false,
      },
    });
  });
});
