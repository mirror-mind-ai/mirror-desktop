import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const launcher = resolve(repositoryRoot, "scripts/mirror_desktop_channel.mjs");

describe("runtime channel launcher", () => {
  it("refuses a user build before Tauri starts when trusted signing material is absent", () => {
    const result = spawnSync(process.execPath, [launcher, "build-user"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        MIRROR_DESKTOP_UPDATER_SIGNING_KEY: "/tmp/mirror-desktop-tests/missing-updater.key",
      },
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("User-channel build requires the trusted updater signing key");
    expect(result.stderr).toContain("npm run tauri:build:dev");
    expect(result.stdout).toBe("");
  });
});
