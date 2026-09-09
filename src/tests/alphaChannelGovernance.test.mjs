import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectSelfUpdatePreflight } from "../../scripts/self_update_preflight.mjs";

const alphaOverlay = JSON.parse(readFileSync("src-tauri/tauri.alpha-update.conf.json", "utf8"));
const privateTestOverlay = JSON.parse(readFileSync("src-tauri/tauri.private-test-update.conf.json", "utf8"));
const governance = readFileSync("docs/update/alpha-channel-governance.md", "utf8");

function decodedPubkey(config) {
  return Buffer.from(config.plugins.updater.pubkey, "base64").toString("utf8");
}

describe("alpha channel governance", () => {
  it("keeps the alpha updater overlay preflight-ready", () => {
    const report = inspectSelfUpdatePreflight({ configs: ["src-tauri/tauri.alpha-update.conf.json"] });
    expect(report.status).toBe("ready");
    expect(report.boundaries).toMatchObject({ publishesRelease: false, touchesMemoryDatabase: false });
  });

  it("uses the private HTTPS alpha endpoint with target and current-version placeholders", () => {
    const endpoints = alphaOverlay.plugins.updater.endpoints;
    expect(endpoints).toEqual(["https://updates.mirrormind.sh/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json"]);
  });

  it("separates alpha and private-test updater public keys", () => {
    expect(decodedPubkey(alphaOverlay)).toContain("minisign public key");
    expect(alphaOverlay.plugins.updater.pubkey).not.toBe(privateTestOverlay.plugins.updater.pubkey);
  });

  it("documents publication, key custody, retention, notarization and state boundaries", () => {
    for (const phrase of [
      "never commit the private key",
      "private-test",
      "alpha",
      "updates.mirrormind.sh",
      "updates.mirrormind.com.br",
      "downloads/macos/latest.dmg",
      "downloads/macos/latest.json",
      "npm run alpha:build",
      "Do not use a generic `npm run tauri -- build --bundles app,dmg`",
      "Git tag",
      "GitHub Release",
      "Apple notarization",
      "currently published alpha and one previous alpha",
      "memory.db",
      "Nautilus Harness state",
    ]) {
      expect(governance).toContain(phrase);
    }
  });
});
