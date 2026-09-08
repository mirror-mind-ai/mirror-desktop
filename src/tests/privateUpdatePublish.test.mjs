import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  manifestFor,
  manifestPaths,
  planPrivateUpdatePublication,
  stagePrivateUpdatePublication,
  updaterArtifactName,
  updaterArtifactUrl,
  webRootForBaseUrl,
} from "../../scripts/private_update_publish.mjs";

const temporaryRoots = [];

function temporaryPath() {
  const root = mkdtempSync(join(tmpdir(), "mirror-desktop-private-update-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("private update publication", () => {
  it("derives updater artifact names and encoded HTTPS URLs", () => {
    expect(updaterArtifactName("0.1.1-test.1")).toBe("Mirror Desktop_0.1.1-test.1.app.tar.gz");
    expect(updaterArtifactUrl("0.1.1-test.1")).toBe("https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1.app.tar.gz");
  });

  it("renders Tauri updater manifest fields with release notes", () => {
    expect(manifestFor({ version: "0.1.1-test.1", signature: "abc", pubDate: "2026-09-08T15:05:00Z" })).toEqual({
      version: "0.1.1-test.1",
      notes: "https://updates.mirrormind.com.br/mirror-desktop/releases/v0.1.1-test.1.md",
      pub_date: "2026-09-08T15:05:00Z",
      url: "https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1.app.tar.gz",
      signature: "abc",
    });
  });

  it("maps alpha base URLs to matching remote web roots", () => {
    expect(webRootForBaseUrl("https://updates.mirrormind.com.br/mirror-desktop/alpha")).toBe("/var/www/mirror-desktop-updates/mirror-desktop/alpha");
    expect(webRootForBaseUrl("https://updates.mirrormind.com.br/mirror-desktop")).toBe("/var/www/mirror-desktop-updates/mirror-desktop");
  });

  it("plans manifest copies for all targets and current versions", () => {
    expect(manifestPaths({ targets: ["darwin", "darwin-x86_64"], currentVersions: ["0.1.1-test.0", "0.1.1-test.1"] })).toEqual([
      "darwin/0.1.1-test.0/latest.json",
      "darwin/0.1.1-test.1/latest.json",
      "darwin-x86_64/0.1.1-test.0/latest.json",
      "darwin-x86_64/0.1.1-test.1/latest.json",
    ]);
  });

  it("stages artifacts, release notes, index and manifests without publishing", async () => {
    const root = temporaryPath();
    await mkdir(join(root, "fake"), { recursive: true });
    writeFileSync(join(root, "fake", "app.tar.gz"), "artifact");
    writeFileSync(join(root, "fake", "app.tar.gz.sig"), "signature");
    writeFileSync(join(root, "fake", "app.dmg"), "dmg");
    const stage = join(root, "stage");

    const plan = stagePrivateUpdatePublication({
      version: "0.1.1-test.1",
      currentVersions: ["0.1.1-test.0"],
      targets: ["darwin"],
      artifact: join(root, "fake", "app.tar.gz"),
      signature: join(root, "fake", "app.tar.gz.sig"),
      dmg: join(root, "fake", "app.dmg"),
      releaseNote: "docs/releases/v0.1.1-test.1.md",
      releaseIndex: "docs/releases/index.md",
      stageDir: stage,
      pubDate: "2026-09-08T15:05:00Z",
    });

    expect(plan).toMatchObject(planPrivateUpdatePublication({ version: "0.1.1-test.1", currentVersions: ["0.1.1-test.0"], targets: ["darwin"] }));
    expect(plan.webRoot).toBe("/var/www/mirror-desktop-updates/mirror-desktop");
    expect(readFileSync(join(stage, "artifacts", "Mirror Desktop_0.1.1-test.1.app.tar.gz"), "utf8")).toBe("artifact");
    expect(JSON.parse(readFileSync(join(stage, "manifests", "darwin", "0.1.1-test.0", "latest.json"), "utf8"))).toMatchObject({ version: "0.1.1-test.1", signature: "signature" });
    expect(readFileSync(join(stage, "releases", "v0.1.1-test.1.md"), "utf8")).toContain("# v0.1.1-test.1");
  });
});
