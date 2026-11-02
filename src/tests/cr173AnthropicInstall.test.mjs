import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installAnthropic, integrityOf, readLockfile, treeSha256 } from "../../mirror-host/pi-install.mjs";
import { readPin, validateAnthropicPin } from "../../scripts/mirror_host_pin.mjs";

// CR173: the Desktop installs its own Anthropic provider the way it installs Pi: a pinned lockfile,
// registry packages checked against their sha512, no package script, all or nothing. Two things
// are its own: the provider's source comes from the runtime the app carries, and of the Agent
// SDK's per-platform Claude Code binaries only this machine's is installed.

const SDK = "@anthropic-ai/claude-agent-sdk";
const REGISTRY = "https://registry.npmjs.org/";

function scratch() {
  return realpathSync(mkdtempSync(join(tmpdir(), "anthropic-install-")));
}

function tarball(work, name, files) {
  const source = join(work, "src", name.replaceAll("/", "__"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(source, "package", path, ".."), { recursive: true });
    writeFileSync(join(source, "package", path), text);
  }
  const file = join(work, `${name.replaceAll("/", "__")}.tgz`);
  execFileSync("/usr/bin/tar", ["-czf", file, "-C", source, "package"]);
  return readFileSync(file);
}

/** The SDK, two platform binaries (one for this test's machine) and a provider source tree. */
function world(options = {}) {
  const work = scratch();
  const binary = (platform) => tarball(work, `${SDK}-${platform}`, { "package.json": "{}", claude: `#!/bin/sh\necho "${options.reports ?? "2.1.306"} (Claude Code)"\n` });
  const tarballs = {
    [`${REGISTRY}${SDK}/-/claude-agent-sdk-0.3.306.tgz`]: tarball(work, SDK, { "package.json": "{}", "sdk.mjs": "" }),
    [`${REGISTRY}${SDK}-darwin-x64/-/claude-agent-sdk-darwin-x64-0.3.306.tgz`]: binary("darwin-x64"),
    [`${REGISTRY}${SDK}-linux-arm64/-/claude-agent-sdk-linux-arm64-0.3.306.tgz`]: binary("linux-arm64"),
  };
  const [sdkUrl, macUrl, linuxUrl] = Object.keys(tarballs);
  const lock = {
    name: "mirror-desktop-anthropic",
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { [SDK]: "0.3.306" } },
      [`node_modules/${SDK}`]: { version: "0.3.306", resolved: sdkUrl, integrity: integrityOf(tarballs[sdkUrl]) },
      [`node_modules/${SDK}-darwin-x64`]: { version: "0.3.306", resolved: macUrl, integrity: integrityOf(tarballs[macUrl]), optional: true, os: ["darwin"], cpu: ["x64"] },
      [`node_modules/${SDK}-linux-arm64`]: { version: "0.3.306", resolved: linuxUrl, integrity: integrityOf(tarballs[linuxUrl]), optional: true, os: ["linux"], cpu: ["arm64"], libc: ["glibc"] },
    },
  };
  const lockfile = join(work, "package-lock.json");
  writeFileSync(lockfile, JSON.stringify(lock));
  const lockSha256 = createHash("sha256").update(readFileSync(lockfile)).digest("hex");
  const source = join(work, "runtime", "anthropic", "provider");
  mkdirSync(join(source, "src"), { recursive: true });
  writeFileSync(join(source, "src", "index.ts"), "export default function () {}\n");
  writeFileSync(join(source, "LICENSE"), "MIT\n");
  const sourceSha256 = options.sourceSha256 ?? treeSha256(source);
  const root = join(work, "app-data", "anthropic");
  const fetched = [];
  const fetchBytes = async (url) => {
    fetched.push(url);
    return tarballs[url];
  };
  const base = {
    lockfile, lockSha256, source, sourceSha256, root, claudeCode: "2.1.306",
    target: join(root, `anthropic-${sourceSha256.slice(0, 12)}-${lockSha256.slice(0, 12)}`),
    platform: options.platform ?? "darwin", arch: options.arch ?? "x64", fetchBytes,
  };
  return { work, base, fetched };
}

describe("installing the Desktop's Anthropic provider", () => {
  it("lays out the provider beside its dependencies and this machine's Claude Code only", async () => {
    const { base, fetched } = world();
    const steps = [];
    const result = await installAnthropic({ ...base, progress: (step) => steps.push(step) });

    expect(result).toMatchObject({ target: base.target, alreadyInstalled: false });
    expect(fetched.some((url) => url.includes("linux"))).toBe(false);
    expect(readdirSync(join(base.target, "node_modules", "@anthropic-ai")).sort()).toEqual(["claude-agent-sdk", "claude-agent-sdk-darwin-x64"]);
    const claude = join(base.target, "node_modules", `${SDK}-darwin-x64`, "claude");
    expect(statSync(claude).mode & 0o111).not.toBe(0);
    expect(readFileSync(join(base.target, "provider", "src", "index.ts"), "utf8")).toContain("export default");
    expect(treeSha256(join(base.target, "provider"))).toBe(base.sourceSha256);
    expect(JSON.parse(readFileSync(join(base.target, "install-receipt.json"), "utf8"))).toMatchObject({
      kind: "anthropic",
      sourceSha256: base.sourceSha256,
      lockfileSha256: base.lockSha256,
      claudeCode: "2.1.306",
      entry: "provider/src/index.ts",
    });
    expect(steps.at(-1)).toEqual({ phase: "check", done: 1, total: 1 });
    // No lock, no cache, no unfinished folder left behind.
    expect(readdirSync(base.root)).toEqual([`anthropic-${base.sourceSha256.slice(0, 12)}-${base.lockSha256.slice(0, 12)}`]);

    const again = await installAnthropic(base);
    expect(again.alreadyInstalled).toBe(true);
  });

  it("checks Claude Code starts with a throwaway home, and reports the pinned version", async () => {
    const { base } = world({ reports: "2.1.300" });
    await expect(installAnthropic(base)).rejects.toMatchObject({ reason: "check_failed" });
    expect(existsSync(base.target)).toBe(false);
    let seen;
    const { base: other } = world();
    await installAnthropic({ ...other, checkVersion: (bin, home) => { seen = { bin, home, exists: existsSync(home) }; return "2.1.306 (Claude Code)"; } });
    expect(seen.bin).toMatch(/claude-agent-sdk-darwin-x64\/claude$/);
    expect(seen.exists).toBe(true);
    expect(seen.home.startsWith(other.root)).toBe(true);
  });

  it("refuses a machine the lockfile holds no Claude Code for", async () => {
    const { base } = world({ platform: "darwin", arch: "arm64" });
    await expect(installAnthropic(base)).rejects.toMatchObject({ reason: "platform_unsupported" });
    expect(existsSync(base.target)).toBe(false);
  });

  it("refuses a provider source that is not the one the runtime pins, before downloading anything", async () => {
    const { base, fetched } = world({ sourceSha256: "0".repeat(64) });
    await expect(installAnthropic(base)).rejects.toMatchObject({ reason: "source_mismatch" });
    expect(fetched).toEqual([]);
  });

  it("replaces an earlier pin's install once the new one is in place", async () => {
    const { base } = world();
    mkdirSync(join(base.root, "anthropic-aaaaaaaaaaaa-bbbbbbbbbbbb"), { recursive: true });
    await installAnthropic(base);
    expect(readdirSync(base.root)).toEqual([`anthropic-${base.sourceSha256.slice(0, 12)}-${base.lockSha256.slice(0, 12)}`]);
  });
});

describe("a lockfile with per-platform packages", () => {
  it("keeps only the platform's optional packages, and refuses one that names no platform", () => {
    const { base } = world();
    const bytes = readFileSync(base.lockfile);
    const forMac = readLockfile(bytes, base.lockSha256, { platform: "darwin", arch: "x64" }).packages.map((entry) => entry.path);
    expect(forMac).toEqual([`node_modules/${SDK}`, `node_modules/${SDK}-darwin-x64`]);
    const lock = JSON.parse(bytes);
    lock.packages["node_modules/loose"] = { ...lock.packages[`node_modules/${SDK}`], optional: true };
    const text = Buffer.from(JSON.stringify(lock));
    const hash = createHash("sha256").update(text).digest("hex");
    expect(() => readLockfile(text, hash, { platform: "darwin", arch: "x64" })).toThrow(expect.objectContaining({ reason: "lockfile_invalid" }));
  });
});

describe("the installer as the app runs it", () => {
  it("asks for the provider's source when installing the Anthropic provider", () => {
    let stdout = "";
    try {
      execFileSync(process.execPath, [join(import.meta.dirname, "..", "..", "mirror-host", "pi-install.mjs"),
        "--kind", "anthropic", "--lockfile", "x", "--lock-sha256", "y", "--pi-root", "z", "--target", "z/t"], { encoding: "utf8", env: {} });
    } catch (error) {
      stdout = error.stdout;
      expect(error.status).toBe(2);
    }
    expect(JSON.parse(stdout.trim())).toMatchObject({ event: "failed", reason: "usage" });
  });
});

describe("the Anthropic pin", () => {
  const root = join(import.meta.dirname, "..", "..");
  const pin = readPin(root);

  it("is the vendored provider and lockfile: registry packages, sha512 each, no script, both Macs", () => {
    expect(validateAnthropicPin(pin, root)).toEqual([]);
    expect(pin.anthropic).toMatchObject({ upstream: "pi-claude-bridge", upstreamVersion: "0.9.3", claudeAgentSdk: "0.3.306", claudeCode: "2.1.306", packages: 114 });
  });

  it("fails verify for a changed source, a changed lockfile, another SDK, or another package count", () => {
    expect(validateAnthropicPin({ ...pin, anthropic: { ...pin.anthropic, sourceSha256: "0".repeat(64) } }, root)).toContain("the Anthropic provider's source does not match the pin");
    expect(validateAnthropicPin({ ...pin, anthropic: { ...pin.anthropic, lockfileSha256: "0".repeat(64) } }, root)).toEqual(["the Anthropic provider's lockfile sha256 does not match the pin"]);
    expect(validateAnthropicPin({ ...pin, anthropic: { ...pin.anthropic, claudeAgentSdk: "0.3.307" } }, root)).toContain(`the Anthropic provider's lockfile does not hold ${SDK} 0.3.307`);
    expect(validateAnthropicPin({ ...pin, anthropic: { ...pin.anthropic, packages: 113 } }, root)).toContain("the Anthropic provider's lockfile holds 114 packages, the pin 113");
  });
});
