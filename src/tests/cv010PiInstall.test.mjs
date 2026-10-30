import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { integrityOf, installPi, readLockfile } from "../../mirror-host/pi-install.mjs";
import { readPin, validatePiPin } from "../../scripts/mirror_host_pin.mjs";

// CV-010.DS-005 slice 3b: the app installs the Pi it pins without npm: registry only, every package
// checked against the lockfile's sha512 before it is unpacked, no package script, all or nothing,
// resumable from verified downloads.

const PI = "@earendil-works/pi-coding-agent";
const REGISTRY = "https://registry.npmjs.org/";

function scratch() {
  return realpathSync(mkdtempSync(join(tmpdir(), "pi-install-")));
}

/** An npm-style tarball: `package/` holding `files`. */
function tarball(work, name, files, { top = "package", link, second } = {}) {
  const source = join(work, "src", name.replaceAll("/", "__"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(source, top, path, ".."), { recursive: true });
    writeFileSync(join(source, top, path), text);
  }
  if (link) symlinkSync(link, join(source, top, "planted"));
  if (second) {
    mkdirSync(join(source, second));
    writeFileSync(join(source, second, "extra.js"), "");
  }
  const file = join(work, `${name.replaceAll("/", "__")}.tgz`);
  execFileSync("/usr/bin/tar", ["-czf", file, "-C", source, top, ...(second ? [second] : [])]);
  return readFileSync(file);
}

/** Pi and one dependency, nested one level, with a lockfile naming them. */
function world(options = {}) {
  const work = scratch();
  const tarballs = {
    [`${REGISTRY}${PI}/-/pi-coding-agent-1.4.0.tgz`]: tarball(work, PI, { "package.json": "{}", "dist/bundle/cli.js": "// pi\n" }, options.pi),
    [`${REGISTRY}chalk/-/chalk-6.0.0.tgz`]: tarball(work, "chalk", { "package.json": "{}", "index.js": "" }),
    [`${REGISTRY}semver/-/semver-6.3.1.tgz`]: tarball(work, "semver-old", { "package.json": "{\"version\":\"6.3.1\"}" }),
  };
  const [piUrl, chalkUrl, semverUrl] = Object.keys(tarballs);
  const lock = {
    name: "mirror-desktop-pi",
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { [PI]: "1.4.0" } },
      [`node_modules/${PI}`]: { version: "1.4.0", resolved: piUrl, integrity: integrityOf(tarballs[piUrl]), bin: { pi: "dist/bundle/cli.js" } },
      "node_modules/chalk": { version: "6.0.0", resolved: chalkUrl, integrity: integrityOf(tarballs[chalkUrl]) },
      [`node_modules/${PI}/node_modules/semver`]: { version: "6.3.1", resolved: semverUrl, integrity: integrityOf(tarballs[semverUrl]) },
      ...options.extra,
    },
  };
  const lockfile = join(work, "package-lock.json");
  writeFileSync(lockfile, JSON.stringify(lock));
  const lockSha256 = createHash("sha256").update(readFileSync(lockfile)).digest("hex");
  const piRoot = join(work, "app-data", "pi");
  const fetched = [];
  const served = { ...tarballs, ...options.served };
  const fetchBytes = async (url) => {
    fetched.push(url);
    if (options.offline?.(url)) throw new Error("offline");
    return served[url];
  };
  const base = {
    lockfile, lockSha256, piRoot, target: join(piRoot, `pi-1.4.0-${lockSha256.slice(0, 12)}`), fetchBytes,
    checkVersion: options.checkVersion ?? (() => "1.4.0"),
  };
  return { work, base, fetched, tarballs };
}

describe("installing the pinned Pi", () => {
  it("lays every package out at its lockfile path, makes pi runnable, and keeps nothing else", async () => {
    const { base, fetched } = world();
    const steps = [];
    const lines = [];
    const result = await installPi({ ...base, progress: (step) => steps.push(step), log: (line) => lines.push(line) });
    expect(result).toEqual({ target: base.target, version: "1.4.0", packages: 3, alreadyInstalled: false });
    const bin = join(base.target, "node_modules", PI, "dist", "bundle", "cli.js");
    expect(statSync(bin).mode & 0o111).toBe(0o111);
    expect(existsSync(join(base.target, "node_modules", "chalk", "index.js"))).toBe(true);
    expect(JSON.parse(readFileSync(join(base.target, "node_modules", PI, "node_modules", "semver", "package.json"), "utf8")).version).toBe("6.3.1");
    expect(JSON.parse(readFileSync(join(base.target, "install-receipt.json"), "utf8"))).toMatchObject({
      package: PI, version: "1.4.0", lockfileSha256: base.lockSha256, bin: "dist/bundle/cli.js", packages: 3,
    });
    expect(readdirSync(base.piRoot).sort()).toEqual([`pi-1.4.0-${base.lockSha256.slice(0, 12)}`]);
    expect(readdirSync(base.target).sort()).toEqual(["install-receipt.json", "node_modules"]);
    expect(fetched).toHaveLength(3);
    expect(fetched.every((url) => url.startsWith(REGISTRY))).toBe(true);
    expect(steps.at(-1)).toEqual({ phase: "check", done: 1, total: 1 });
    expect(steps.filter((step) => step.phase === "unpack").map((step) => step.done)).toEqual([1, 2, 3]);
    expect(lines.join("\n")).toMatch(/downloaded 3 \(\d+ bytes\), reused 0/);

    const again = await installPi({ ...base });
    expect(again.alreadyInstalled).toBe(true);
    expect(fetched).toHaveLength(3);
  });

  it("checks Pi starts with a throwaway home inside its own unfinished folder", async () => {
    let seen;
    const { base } = world({ checkVersion: (bin, home) => { seen = { bin, home, exists: existsSync(home) }; return "1.4.0"; } });
    await installPi(base);
    expect(seen.exists).toBe(true);
    expect(seen.home.startsWith(`${base.piRoot}/.installing-`)).toBe(true);
    expect(seen.bin.startsWith(`${base.piRoot}/.installing-`)).toBe(true);
    expect(existsSync(join(base.target, ".check-home"))).toBe(false);
  });

  it("refuses a package that does not match its integrity, and installs nothing", async () => {
    const { base, tarballs } = world({ served: {} });
    const [piUrl] = Object.keys(tarballs);
    const tampered = world({ served: { [piUrl]: Buffer.from("not pi") } });
    await expect(installPi(tampered.base)).rejects.toMatchObject({ reason: "integrity_mismatch" });
    // Refused when downloaded: what failed its check never reaches the cache.
    const cache = join(tampered.base.piRoot, "cache");
    const kept = existsSync(cache) ? readdirSync(cache).map((name) => readFileSync(join(cache, name), "utf8")) : [];
    expect(kept).not.toContain("not pi");
    expect(readdirSync(tampered.base.piRoot).filter((name) => !["cache"].includes(name))).toEqual([]);
    expect(existsSync(base.target)).toBe(false);
  });

  it("resumes from verified downloads after a stopped install", async () => {
    let down = true;
    const offline = (url) => down && url.includes("semver");
    const { base, fetched } = world({ offline });
    await expect(installPi(base)).rejects.toMatchObject({ reason: "download_failed" });
    expect(existsSync(base.target)).toBe(false);
    expect(readdirSync(join(base.piRoot, "cache"))).toHaveLength(2);
    expect(readdirSync(base.piRoot).some((name) => name.startsWith(".installing-"))).toBe(false);
    const before = fetched.length;
    const lines = [];
    down = false;
    await installPi({ ...base, log: (line) => lines.push(line) });
    expect(existsSync(base.target)).toBe(true);
    // The two kept downloads are reused; only the missing one is fetched again.
    expect(fetched.slice(before).every((url) => url.includes("semver"))).toBe(true);
    expect(lines.join("\n")).toMatch(/reused 2 verified from the cache/);
  });

  it("downloads again what the cache holds damaged, rather than failing", async () => {
    const { base, fetched, tarballs } = world();
    const [piUrl] = Object.keys(tarballs);
    const integrity = JSON.parse(readFileSync(base.lockfile, "utf8")).packages[`node_modules/${PI}`].integrity;
    mkdirSync(join(base.piRoot, "cache"), { recursive: true });
    writeFileSync(join(base.piRoot, "cache", `${Buffer.from(integrity.slice(7), "base64").toString("hex")}.tgz`), "damaged");
    await installPi(base);
    expect(fetched).toContain(piUrl);
    expect(existsSync(base.target)).toBe(true);
  });

  it("refuses a Pi that does not start or reports another version", async () => {
    for (const checkVersion of [() => { throw new Error("SyntaxError"); }, () => "1.3.9"]) {
      const { base } = world({ checkVersion });
      await expect(installPi(base)).rejects.toMatchObject({ reason: "check_failed" });
      expect(existsSync(base.target)).toBe(false);
      expect(readdirSync(base.piRoot).some((name) => name.startsWith(".installing-"))).toBe(false);
    }
  });

  it("refuses a tarball holding a symbolic link or more than one folder", async () => {
    const linked = world({ pi: { link: "/etc/hosts" } });
    await expect(installPi(linked.base)).rejects.toMatchObject({ reason: "unsafe_package" });
    expect(existsSync(linked.base.target)).toBe(false);
    const doubled = world({ pi: { second: "elsewhere" } });
    await expect(installPi(doubled.base)).rejects.toMatchObject({ reason: "unsafe_package" });
    expect(existsSync(doubled.base.target)).toBe(false);
  });

  it("refuses a lockfile that is not the pinned one, or names anything but registry sha512 packages", () => {
    const { base } = world();
    const bytes = readFileSync(base.lockfile);
    expect(() => readLockfile(bytes, "0".repeat(64))).toThrow(expect.objectContaining({ reason: "lockfile_mismatch" }));
    const lock = JSON.parse(bytes);
    const variants = [
      ["node_modules/evil", { resolved: "https://example.com/evil.tgz", integrity: lock.packages["node_modules/chalk"].integrity }],
      ["node_modules/weak", { resolved: `${REGISTRY}weak/-/weak-1.tgz`, integrity: "sha1-abc" }],
      ["node_modules/../../escape", { resolved: `${REGISTRY}x/-/x-1.tgz`, integrity: lock.packages["node_modules/chalk"].integrity }],
      ["node_modules/linked", { link: true, resolved: `${REGISTRY}x/-/x-1.tgz`, integrity: lock.packages["node_modules/chalk"].integrity }],
    ];
    for (const [path, entry] of variants) {
      const text = Buffer.from(JSON.stringify({ ...lock, packages: { ...lock.packages, [path]: entry } }));
      const hash = createHash("sha256").update(text).digest("hex");
      expect(() => readLockfile(text, hash), path).toThrow(expect.objectContaining({ reason: "lockfile_invalid" }));
    }
  });

  it("waits for another live install, and takes over a dead one's lock", async () => {
    const { base } = world();
    mkdirSync(base.piRoot, { recursive: true });
    writeFileSync(join(base.piRoot, "install.lock"), String(process.pid));
    await expect(installPi(base)).rejects.toMatchObject({ reason: "already_installing" });
    expect(readFileSync(join(base.piRoot, "install.lock"), "utf8")).toBe(String(process.pid));
    writeFileSync(join(base.piRoot, "install.lock"), "999999");
    mkdirSync(join(base.piRoot, ".installing-stale"));
    await installPi(base);
    expect(readdirSync(base.piRoot).sort()).toEqual([`pi-1.4.0-${base.lockSha256.slice(0, 12)}`]);
  });

  it("replaces an earlier pin's install once the new one is in place", async () => {
    const { base } = world();
    mkdirSync(join(base.piRoot, "pi-1.3.0-aaaaaaaaaaaa", "node_modules"), { recursive: true });
    await installPi(base);
    expect(readdirSync(base.piRoot)).toEqual([`pi-1.4.0-${base.lockSha256.slice(0, 12)}`]);
  });
});

describe("the installer as the app runs it", () => {
  it("runs from a folder whose path has spaces and passes through a link", () => {
    // Reached through a link, as `/tmp` is on macOS: Node resolves the module's path, not argv.
    const real = scratch();
    const linked = join(scratch(), "linked");
    symlinkSync(real, linked);
    const folder = join(linked, "Mirror Desktop TS Dev.app", "Contents", "Resources", "mirror-host");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "pi-install.mjs"), readFileSync(join(import.meta.dirname, "..", "..", "mirror-host", "pi-install.mjs")));
    let stdout = "";
    try {
      execFileSync(process.execPath, [join(folder, "pi-install.mjs")], { encoding: "utf8", env: {} });
    } catch (error) {
      stdout = error.stdout;
      expect(error.status).toBe(2);
    }
    expect(JSON.parse(stdout.trim())).toMatchObject({ event: "failed", reason: "usage" });
  });
});

describe("the Pi pin", () => {
  const root = join(import.meta.dirname, "..", "..");
  const pin = readPin(root);

  it("is the vendored lockfile: registry packages, sha512 each, and the scripts it does not run were read", () => {
    expect(validatePiPin(pin, root)).toEqual([]);
    expect(pin.pi).toMatchObject({ package: PI, version: "1.4.0", packages: 121, scriptsNotRun: ["@google/genai", "protobufjs"] });
  });

  it("fails verify for a new script, a changed lockfile, or a Node below Pi's engine", () => {
    expect(validatePiPin({ ...pin, pi: { ...pin.pi, scriptsNotRun: ["protobufjs"] } }, root)[0]).toMatch(/install scripts are @google\/genai, protobufjs/);
    expect(validatePiPin({ ...pin, pi: { ...pin.pi, lockfileSha256: "0".repeat(64) } }, root)).toEqual(["Pi's lockfile sha256 does not match the pin"]);
    expect(validatePiPin({ ...pin, node: { ...pin.node, version: "22.0.0" } }, root)).toContain("the pinned Node does not meet Pi's engine >=22.19.0");
    expect(validatePiPin({ ...pin, pi: { ...pin.pi, version: "1.4.1" } }, root)).toContain(`Pi's lockfile does not hold ${PI} 1.4.1`);
    expect(validatePiPin({ ...pin, pi: { ...pin.pi, packages: 120 } }, root)).toContain("Pi's lockfile holds 121 packages, the pin 120");
  });
});
