import { describe, expect, it } from "vitest";
import { inspectSelfUpdateConfig, mergeConfig } from "../../scripts/self_update_preflight.mjs";

const baseConfig = {
  productName: "Mirror Desktop",
  identifier: "ai.mirrormind.desktop",
  version: "0.1.0",
  bundle: { createUpdaterArtifacts: true },
};

const testPubkey = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDg1MkUyQTJENjI1MjNEOEIKUldTTFBWSmlMU291aFJtemcvdDBvNlRWbWhTYnFnOXVNa1kzRUtiQm1laDBMUzRNRlI1L2hBRXAK";

describe("self-update preflight", () => {
  it("blocks release validation when updater config is missing", () => {
    const report = inspectSelfUpdateConfig(baseConfig);
    expect(report.status).toBe("blocked");
    expect(report.findings).toContain("plugins.updater is required for release self-update validation.");
  });

  it("blocks release validation when updater artifacts are not enabled", () => {
    const report = inspectSelfUpdateConfig({
      ...baseConfig,
      bundle: { createUpdaterArtifacts: false },
      plugins: { updater: { endpoints: ["https://updates.example.invalid/mirror-desktop/{{target}}/{{current_version}}/latest.json"], pubkey: testPubkey } },
    });
    expect(report.status).toBe("blocked");
    expect(report.findings).toContain("bundle.createUpdaterArtifacts must be true for self-update rehearsal builds.");
  });

  it("accepts a safe HTTPS updater endpoint and minisign public key", () => {
    const report = inspectSelfUpdateConfig({
      ...baseConfig,
      plugins: {
        updater: {
          endpoints: ["https://updates.example.invalid/mirror-desktop/{{target}}/{{current_version}}/latest.json"],
          pubkey: testPubkey,
        },
      },
    });
    expect(report.status).toBe("ready");
    expect(report.expectedManifestTargets).toEqual(["darwin-x86_64", "darwin-aarch64"]);
    expect(report.boundaries).toMatchObject({ publishesRelease: false, touchesMemoryDatabase: false });
  });

  it("rejects insecure or dangerous updater validation settings", () => {
    const report = inspectSelfUpdateConfig({
      ...baseConfig,
      plugins: {
        updater: {
          endpoints: ["http://localhost:9000/latest.json"],
          pubkey: "not-a-minisign-key",
          dangerousInsecureTransportProtocol: true,
          dangerousAcceptInvalidCerts: true,
        },
      },
    });
    expect(report.status).toBe("blocked");
    expect(report.findings.join("\n")).toContain("HTTPS");
    expect(report.findings.join("\n")).toContain("dangerousInsecureTransportProtocol");
    expect(report.findings.join("\n")).toContain("dangerousAcceptInvalidCerts");
  });

  it("deep-merges Tauri config overlays like a release validation config", () => {
    const merged = mergeConfig({ plugins: { clipboard: { enabled: true } } }, { plugins: { updater: { endpoints: ["https://example.invalid"] } } });
    expect(merged.plugins.clipboard.enabled).toBe(true);
    expect(merged.plugins.updater.endpoints).toEqual(["https://example.invalid"]);
  });
});
