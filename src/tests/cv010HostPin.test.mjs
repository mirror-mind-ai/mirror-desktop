import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MIN_NODE_VERSION,
  PLATFORMS,
  materializeHost,
  nodeArchiveName,
  readPin,
  sha256File,
  sha512Integrity,
  validatePin,
} from "../../scripts/mirror_host_pin.mjs";

// CV-010.DS-005 phase 2, slice 2a: the runtime the 0.3 line embeds is pinned, not found. Node is an
// official build whose archive hash is recorded; the core is a tarball packed from a recorded Core
// commit and vendored here, with its one dependency checked against Core's lockfile integrity.
// Materializing either is all or nothing, and a hash that does not match leaves nothing behind.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pin = readPin(root);

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** A fake official Node archive: `node-v<version>-<platform>/bin/node`, printing its version. */
function fakeNodeArchive(dir, version, platform, reported = version) {
  const top = `node-v${version}-${platform}`;
  mkdirSync(join(dir, "src", top, "bin"), { recursive: true });
  const bin = join(dir, "src", top, "bin", "node");
  writeFileSync(bin, `#!/bin/sh\necho v${reported}\n`);
  chmodSync(bin, 0o755);
  const archive = join(dir, nodeArchiveName(version, platform));
  execFileSync("tar", ["-czf", archive, "-C", join(dir, "src"), top]);
  return archive;
}

function fakePin(version, platform, archive) {
  return {
    ...pin,
    node: {
      version,
      platforms: Object.fromEntries(PLATFORMS.map((name) => [name, name === platform
        ? { file: nodeArchiveName(version, name), sha256: sha256File(archive) }
        : { file: nodeArchiveName(version, name), sha256: "f".repeat(64) }])),
    },
  };
}

describe("the 0.3 runtime pin", () => {
  it("pins an official Node at or above the version that keeps the FTS5 refusal", () => {
    expect(validatePin(pin, root)).toEqual([]);
    expect(MIN_NODE_VERSION).toBe("24.21.0");
    expect(PLATFORMS).toEqual(["darwin-arm64", "darwin-x64"]);
    for (const platform of PLATFORMS) {
      expect(pin.node.platforms[platform].file).toBe(nodeArchiveName(pin.node.version, platform));
      expect(pin.node.platforms[platform].sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("pins the core to a full Core commit and a vendored tarball whose hash it records", () => {
    expect(pin.core.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(pin.core.branch).toBe("desktop/library-seam-1a");
    expect(sha256File(join(root, pin.core.tarball))).toBe(pin.core.sha256);
    expect(sha512Integrity(join(root, pin.core.dependencies.yaml.tarball))).toBe(pin.core.dependencies.yaml.integrity);
    const listing = execFileSync("tar", ["-tzf", join(root, pin.core.tarball)], { encoding: "utf8" });
    expect(listing).toContain("package/lib/desktop.js");
    expect(listing).toContain("package/ts/src/db/migrateHome.ts");
  });

  it("refuses a pin below the floor, missing a platform, or with a malformed hash", () => {
    expect(validatePin({ ...pin, node: { ...pin.node, version: "24.6.0" } }, root).join(" ")).toMatch(/below 24\.21\.0/);
    const { "darwin-x64": _dropped, ...onlyArm } = pin.node.platforms;
    expect(validatePin({ ...pin, node: { ...pin.node, platforms: onlyArm } }, root).join(" ")).toMatch(/darwin-x64/);
    const bad = { ...pin.node.platforms, "darwin-arm64": { ...pin.node.platforms["darwin-arm64"], sha256: "abc" } };
    expect(validatePin({ ...pin, node: { ...pin.node, platforms: bad } }, root).join(" ")).toMatch(/sha256/);
    expect(validatePin({ ...pin, core: { ...pin.core, sha256: "0".repeat(64) } }, root).join(" ")).toMatch(/core tarball/);
  });

  it("materializes Node and the core into one directory, all or nothing", async () => {
    const work = mkdtempSync(join(tmpdir(), "mirror-host-pin-"));
    const platform = "darwin-x64";
    const archive = fakeNodeArchive(work, "24.99.0", platform);
    const outDir = join(work, "runtime", platform);
    const fetched = [];
    const result = await materializeHost({
      root,
      pin: fakePin("24.99.0", platform, archive),
      platform,
      outDir,
      runVersionCheck: true,
      fetchArchive: async (url, destination) => {
        fetched.push(url);
        writeFileSync(destination, readFileSync(archive));
      },
    });
    expect(fetched).toEqual([`https://nodejs.org/dist/v24.99.0/${nodeArchiveName("24.99.0", platform)}`]);
    expect(result.nodeBin).toBe(join(outDir, "node", "bin", "node"));
    expect(existsSync(join(outDir, "node_modules", "mirror-mind", "lib", "desktop.js"))).toBe(true);
    expect(existsSync(join(outDir, "node_modules", "yaml", "package.json"))).toBe(true);
    expect(JSON.parse(readFileSync(join(outDir, "pin-receipt.json"), "utf8"))).toMatchObject({
      platform,
      node: { version: "24.99.0", sha256: sha256File(archive) },
      core: { commit: pin.core.commit, sha256: pin.core.sha256 },
    });
    expect(readdirSync(join(work, "runtime"))).toEqual([platform]);
  });

  it("refuses an archive whose hash does not match, and leaves nothing", async () => {
    const work = mkdtempSync(join(tmpdir(), "mirror-host-pin-bad-"));
    const platform = "darwin-x64";
    const archive = fakeNodeArchive(work, "24.99.0", platform);
    const outDir = join(work, "runtime", platform);
    mkdirSync(join(work, "runtime"));
    await expect(materializeHost({
      root,
      pin: fakePin("24.99.0", platform, archive),
      platform,
      outDir,
      fetchArchive: async (_url, destination) => writeFileSync(destination, "a different archive"),
    })).rejects.toThrow(/sha256 mismatch/);
    expect(readdirSync(join(work, "runtime"))).toEqual([]);
  });

  it("refuses a Node that reports another version, and an existing output", async () => {
    const work = mkdtempSync(join(tmpdir(), "mirror-host-pin-version-"));
    const platform = "darwin-x64";
    const archive = fakeNodeArchive(work, "24.98.0", platform);
    const misnamed = join(work, nodeArchiveName("24.99.0", platform));
    writeFileSync(misnamed, readFileSync(archive));
    // The archive's top directory names 24.98.0, so extraction finds no node-v24.99.0 tree.
    const outDir = join(work, "runtime", platform);
    mkdirSync(join(work, "runtime"));
    await expect(materializeHost({
      root, pin: fakePin("24.99.0", platform, misnamed), platform, outDir, runVersionCheck: true,
      fetchArchive: async (_url, destination) => writeFileSync(destination, readFileSync(misnamed)),
    })).rejects.toThrow(/24\.99\.0/);
    expect(readdirSync(join(work, "runtime"))).toEqual([]);

    mkdirSync(outDir);
    await expect(materializeHost({
      root, pin: fakePin("24.98.0", platform, archive), platform, outDir,
      fetchArchive: async (_url, destination) => writeFileSync(destination, readFileSync(archive)),
    })).rejects.toThrow(/already exists/);
  });

  it("refuses a Node whose binary reports another version than its archive names", async () => {
    const work = mkdtempSync(join(tmpdir(), "mirror-host-pin-reported-"));
    const platform = "darwin-x64";
    const archive = fakeNodeArchive(work, "24.99.0", platform, "24.6.0");
    const outDir = join(work, "runtime", platform);
    mkdirSync(join(work, "runtime"));
    await expect(materializeHost({
      root, pin: fakePin("24.99.0", platform, archive), platform, outDir, runVersionCheck: true,
      fetchArchive: async (_url, destination) => writeFileSync(destination, readFileSync(archive)),
    })).rejects.toThrow(/reports v24\.6\.0, not v24\.99\.0/);
    expect(readdirSync(join(work, "runtime"))).toEqual([]);
  });

  it("keeps materialized runtimes out of the repository", () => {
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toMatch(/^\.mirror-host\/$/m);
  });

  it("records the pinned Node and Core commit in DS-005", () => {
    const ds = readFileSync(join(root, "docs/project/roadmap/cv-010-first-run-assistant/ds-005-speak-to-the-typescript-core/index.md"), "utf8");
    expect(ds).toContain(pin.core.commit.slice(0, 8));
    expect(ds).toContain(`v${pin.node.version}`);
  });
});
