import { describe, expect, it } from "vitest";
import { inspectUpdateAvailability, parseUpdateManifest, satisfiesVersionRequirement } from "../domain/updateChannel";

const digest = "a".repeat(64);
const revision = "b".repeat(40);

function manifest(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version: "0.2.0",
    tag: "v0.2.0",
    revision,
    minimumMacOS: "12.0.0",
    mirrorCore: ">=0.31.14,<0.32.0",
    releaseNotes: "https://releases.example/mirror-desktop/v0.2.0.md",
    provenance: { receiptUrl: "https://releases.example/mirror-desktop/v0.2.0.provenance.json", sha256: digest },
    artifacts: [{ architecture: "x64", url: "https://releases.example/Mirror Desktop_0.2.0_x64.dmg", sha256: digest }],
    ...overrides,
  };
}

const current = {
  version: "0.1.0",
  architecture: "x64" as const,
  macOS: "14.7.0",
  mirrorCore: "0.31.14",
};

describe("update channel manifest", () => {
  it("accepts a bounded Mirror Desktop update manifest", () => {
    expect(parseUpdateManifest(manifest())).toMatchObject({
      product: "Mirror Desktop",
      version: "0.2.0",
      tag: "v0.2.0",
      artifacts: [{ architecture: "x64", sha256: digest }],
    });
  });

  it("rejects malformed provenance and non-https artifact coordinates", () => {
    expect(() => parseUpdateManifest(manifest({ tag: "0.2.0" }))).toThrow(/tag must be v0.2.0/);
    expect(() => parseUpdateManifest(manifest({ artifacts: [{ architecture: "x64", url: "http://example/app.dmg", sha256: digest }] }))).toThrow(/https/);
    expect(() => parseUpdateManifest(manifest({ provenance: { receiptUrl: "https://example/receipt.json", sha256: "bad" } }))).toThrow(/Provenance sha256/);
  });

  it("compares Mirror Core compatibility ranges", () => {
    expect(satisfiesVersionRequirement("0.31.14", ">=0.31.14,<0.32.0")).toBe(true);
    expect(satisfiesVersionRequirement("0.32.0", ">=0.31.14,<0.32.0")).toBe(false);
  });

  it("reports a compatible newer update without downloading or installing", () => {
    expect(inspectUpdateAvailability(manifest(), current)).toMatchObject({
      status: "available",
      artifact: { architecture: "x64" },
      notes: [
        "Version 0.2.0 is available.",
        "Release notes: https://releases.example/mirror-desktop/v0.2.0.md",
        "Inspection only. No download or installation has started.",
      ],
    });
  });

  it("reports current, incompatible and invalid update states", () => {
    expect(inspectUpdateAvailability(manifest({ version: "0.1.0", tag: "v0.1.0" }), current)).toMatchObject({ status: "current" });
    expect(inspectUpdateAvailability(manifest({ minimumMacOS: "15.0.0" }), current)).toMatchObject({ status: "incompatible", reason: "macOS 15.0.0 or newer is required." });
    expect(inspectUpdateAvailability(manifest({ artifacts: [{ architecture: "aarch64", url: "https://example/app.dmg", sha256: digest }] }), current)).toMatchObject({ status: "incompatible", reason: "No x64 artifact is available." });
    expect(inspectUpdateAvailability({ product: "Other" }, current)).toMatchObject({ status: "invalid" });
  });
});
