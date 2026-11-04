import { describe, expect, it } from "vitest";
import { alphaBuildPlan } from "../../scripts/alpha_build.mjs";
import packageJson from "../../package.json" with { type: "json" };

describe("alpha build command", () => {
  it("centralizes the signed alpha Tauri build contract", () => {
    const plan = alphaBuildPlan({ version: "0.4.0-alpha.1", signingKey: "/tmp/updater.key" });

    expect(plan).toMatchObject({
      version: "0.4.0-alpha.1",
      config: "src-tauri/tauri.nautilus-update.conf.json",
      signingKey: "/tmp/updater.key",
      app: "src-tauri/target/release/bundle/macos/Nautilus for Mirror.app",
      dmg: "src-tauri/target/release/bundle/dmg/Nautilus for Mirror_0.4.0-alpha.1_x64.dmg",
      updaterArtifact: "src-tauri/target/release/bundle/macos/Nautilus for Mirror.app.tar.gz",
      updaterSignature: "src-tauri/target/release/bundle/macos/Nautilus for Mirror.app.tar.gz.sig",
      boundaries: {
        publishesRelease: false,
        createsGitTag: false,
        pushesGit: false,
        notarizes: false,
        mutatesMirrorData: false,
        mutatesAppData: false,
      },
    });
  });

  it("exposes one npm command for local alpha builds", () => {
    expect(packageJson.scripts["alpha:build"]).toBe("node scripts/alpha_build.mjs");
  });
});
