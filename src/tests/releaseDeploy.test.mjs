import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertBaseUrlAgreement,
  compareReleaseVersions,
  confirmationPayload,
  deriveRetainedVersions,
  releaseNoteAuthorship,
  renderConfirmation,
  verifyPublishedEndpoints,
} from "../../scripts/release_deploy.mjs";
import { deriveBaseUrlFromUpdaterConfig } from "../../scripts/private_update_publish.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const alphaEndpoint = "https://updates.mirrormind.sh/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json";

function updaterConfig(endpoint = alphaEndpoint) {
  return { plugins: { updater: { endpoints: [endpoint] } } };
}

function payloadInput(overrides = {}) {
  return {
    version: "0.2.0-alpha.16",
    tag: "v0.2.0-alpha.16",
    revision: "a".repeat(40),
    baseUrl: "https://updates.mirrormind.sh/mirror-desktop/alpha",
    manifestPaths: ["darwin/0.2.0-alpha.15/latest.json", "darwin/0.2.0-alpha.16/latest.json"],
    artifacts: [{ name: "Mirror Desktop_0.2.0-alpha.16_x64.dmg", sha256: "b".repeat(64) }],
    gates: { preflight: "ready", tests: "passed" },
    actions: ["push main", "tag v0.2.0-alpha.16", "publish alpha endpoint"],
    releaseNote: { title: "Deterministic Deployment", text: "# v0.2.0-alpha.16 — Deterministic Deployment\n\nFull authored body." },
    ...overrides,
  };
}

describe("release deployment base URL derivation", () => {
  it("derives the publication base URL from the application updater endpoint", () => {
    expect(deriveBaseUrlFromUpdaterConfig(updaterConfig())).toBe("https://updates.mirrormind.sh/mirror-desktop/alpha");
  });

  it("refuses an endpoint that does not follow the polled manifest shape", () => {
    expect(() => deriveBaseUrlFromUpdaterConfig(updaterConfig("https://updates.mirrormind.sh/mirror-desktop/alpha/latest.json"))).toThrow(/updater endpoint/i);
    expect(() => deriveBaseUrlFromUpdaterConfig({ plugins: { updater: { endpoints: [] } } })).toThrow(/updater endpoint/i);
    expect(() => deriveBaseUrlFromUpdaterConfig(updaterConfig("http://updates.mirrormind.sh/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json"))).toThrow(/https/i);
  });

  it("fails closed when an explicit base URL diverges from the application endpoint", () => {
    const derived = "https://updates.mirrormind.sh/mirror-desktop/alpha";
    expect(() => assertBaseUrlAgreement(derived, "https://updates.mirrormind.sh/mirror-desktop")).toThrow(/diverges/i);
    expect(assertBaseUrlAgreement(derived, "https://updates.mirrormind.sh/mirror-desktop/alpha/")).toBe(derived);
    expect(assertBaseUrlAgreement(derived, undefined)).toBe(derived);
  });
});

describe("retained version derivation", () => {
  it("orders prerelease numbers numerically, not lexicographically", () => {
    expect(compareReleaseVersions("0.2.0-alpha.9", "0.2.0-alpha.14")).toBeLessThan(0);
    expect(compareReleaseVersions("0.2.0-alpha.15", "0.2.0-alpha.15")).toBe(0);
    expect(compareReleaseVersions("0.2.0", "0.2.0-alpha.15")).toBeGreaterThan(0);
  });

  it("derives the retained set as the latest published version plus the release", () => {
    const tags = ["v0.2.0-alpha.9", "v0.2.0-alpha.14", "v0.2.0-alpha.15", "not-a-version"];
    expect(deriveRetainedVersions({ version: "0.2.0-alpha.16", tags })).toEqual(["0.2.0-alpha.15", "0.2.0-alpha.16"]);
  });

  it("republishes an already tagged version against its own predecessor", () => {
    const tags = ["v0.2.0-alpha.14", "v0.2.0-alpha.15"];
    expect(deriveRetainedVersions({ version: "0.2.0-alpha.15", tags })).toEqual(["0.2.0-alpha.14", "0.2.0-alpha.15"]);
  });

  it("retains only the release itself when no previous tag exists", () => {
    expect(deriveRetainedVersions({ version: "0.1.0", tags: [] })).toEqual(["0.1.0"]);
  });
});

describe("confirmation payload", () => {
  it("carries the authored release title and full release note text", () => {
    const payload = confirmationPayload(payloadInput());
    expect(payload.releaseNote.title).toBe("Deterministic Deployment");
    expect(payload.releaseNote.text).toContain("Full authored body.");
    expect(payload.decision).toBe("publish-release");
  });

  it("refuses a payload without authored release note text or with placeholder hashes", () => {
    expect(() => confirmationPayload(payloadInput({ releaseNote: { title: "T", text: "" } }))).toThrow(/release note/i);
    expect(() => confirmationPayload(payloadInput({ artifacts: [{ name: "a.dmg", sha256: "0".repeat(64) }] }))).toThrow(/sha-?256/i);
    expect(() => confirmationPayload(payloadInput({ manifestPaths: [] }))).toThrow(/manifest/i);
  });

  it("renders the authored title and full text in the human confirmation", () => {
    const rendered = renderConfirmation(confirmationPayload(payloadInput()));
    expect(rendered).toContain("Deterministic Deployment");
    expect(rendered).toContain("Full authored body.");
    expect(rendered).toContain("https://updates.mirrormind.sh/mirror-desktop/alpha");
    expect(rendered).toContain("darwin/0.2.0-alpha.15/latest.json");
  });

  it("extracts authorship from a real validated release note", () => {
    const source = readFileSync(resolve(repositoryRoot, "docs", "releases", "v0.2.0-alpha.15.md"), "utf8");
    const authorship = releaseNoteAuthorship({ version: "0.2.0-alpha.15", source });
    expect(authorship.title).toBe("Truthful Provider and Model Surfaces");
    expect(authorship.text).toBe(source);
  });
});

describe("post-publication verification", () => {
  const baseUrl = "https://updates.mirrormind.sh/mirror-desktop/alpha";
  const targets = ["darwin", "darwin-x86_64"];
  const retainedVersions = ["0.2.0-alpha.15", "0.2.0-alpha.16"];

  it("passes when every polled URL serves the published version with a signature", async () => {
    const fetched = [];
    const report = await verifyPublishedEndpoints({
      baseUrl, version: "0.2.0-alpha.16", targets, retainedVersions,
      fetchJson: async (url) => { fetched.push(url); return { version: "0.2.0-alpha.16", signature: "sig" }; },
    });
    expect(report.status).toBe("verified");
    expect(report.checks).toHaveLength(4);
    expect(fetched).toContain("https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.15/latest.json");
    expect(fetched).toContain("https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.16/latest.json");
  });

  it("fails closed when a polled URL still serves the previous version", async () => {
    await expect(verifyPublishedEndpoints({
      baseUrl, version: "0.2.0-alpha.16", targets, retainedVersions,
      fetchJson: async (url) => url.includes("darwin-x86_64/0.2.0-alpha.15")
        ? { version: "0.2.0-alpha.15", signature: "sig" }
        : { version: "0.2.0-alpha.16", signature: "sig" },
    })).rejects.toThrow(/darwin-x86_64\/0\.2\.0-alpha\.15/);
  });

  it("fails closed on an empty signature or unreachable manifest", async () => {
    await expect(verifyPublishedEndpoints({
      baseUrl, version: "0.2.0-alpha.16", targets: ["darwin"], retainedVersions: ["0.2.0-alpha.16"],
      fetchJson: async () => ({ version: "0.2.0-alpha.16", signature: "  " }),
    })).rejects.toThrow(/signature/i);
    await expect(verifyPublishedEndpoints({
      baseUrl, version: "0.2.0-alpha.16", targets: ["darwin"], retainedVersions: ["0.2.0-alpha.16"],
      fetchJson: async () => { throw new Error("connect ETIMEDOUT"); },
    })).rejects.toThrow(/ETIMEDOUT/);
  });
});
