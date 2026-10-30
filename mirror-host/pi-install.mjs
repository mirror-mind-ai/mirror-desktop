// CV-010.DS-005 slice 3b: install the pinned Pi into a folder Mirror Desktop TS owns.
//
//   node pi-install.mjs --lockfile <package-lock.json> --lock-sha256 <hex> --pi-root <folder> --target <folder>
//
// Run by the app with the Node it carries. It does not use npm. Every package the lockfile names is
// downloaded from the npm registry only, checked against the lockfile's sha512 integrity before a
// byte is unpacked, and laid out at the lockfile's own path. No package script runs: the pin lists
// the two packages that declare one, and both were read and found to do nothing Pi needs.
//
// All or nothing: packages are unpacked into a hidden folder in `--pi-root`, Pi's own `--version`
// is checked there with a throwaway HOME, a receipt is written, and the folder is renamed to
// `--target` only then. A stopped install resumes: verified downloads stay in `cache/` until an
// install succeeds. One install at a time, through `install.lock`. `install.log` records what was
// fetched and why an attempt stopped; nothing in it is a credential, since Pi's are never read.
//
// Progress and the outcome are JSON lines on stdout: `{"event":"progress",...}`, then
// `{"event":"installed",...}` or `{"event":"failed","reason":...,"message":...}`.

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  appendFileSync, chmodSync, closeSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync,
  readFileSync, realpathSync, renameSync, rmSync, writeFileSync, writeSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REGISTRY = "https://registry.npmjs.org/";
export const PI_PACKAGE = "@earendil-works/pi-coding-agent";
const PACKAGE_PATH = /^(node_modules\/(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)(\/node_modules\/(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)*$/i;
const PARALLEL_DOWNLOADS = 6;
const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_TIMEOUT_MS = 60_000;

export class PiInstallError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

/** The packages to lay out, from a lockfile whose bytes hash to `lockSha256`, or a refusal. */
export function readLockfile(bytes, lockSha256) {
  if (createHash("sha256").update(bytes).digest("hex") !== lockSha256) {
    throw new PiInstallError("lockfile_mismatch", "Pi's lockfile is not the one this app was built with");
  }
  const lock = JSON.parse(bytes.toString("utf8"));
  if (lock.lockfileVersion !== 3 || typeof lock.packages !== "object") {
    throw new PiInstallError("lockfile_invalid", "Pi's lockfile is not a version 3 lockfile");
  }
  const packages = [];
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === "") continue;
    if (!PACKAGE_PATH.test(path) || path.split("/").includes("..")) throw new PiInstallError("lockfile_invalid", `unsafe package path ${path}`);
    if (entry.link || entry.dev || entry.optional) throw new PiInstallError("lockfile_invalid", `${path} is not a plain dependency`);
    if (typeof entry.resolved !== "string" || !entry.resolved.startsWith(REGISTRY)) {
      throw new PiInstallError("lockfile_invalid", `${path} does not come from the npm registry`);
    }
    if (typeof entry.integrity !== "string" || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity)) {
      throw new PiInstallError("lockfile_invalid", `${path} has no sha512 integrity`);
    }
    packages.push({ path, resolved: entry.resolved, integrity: entry.integrity, version: entry.version, bin: entry.bin });
  }
  const pi = packages.find((entry) => entry.path === `node_modules/${PI_PACKAGE}`);
  if (!pi || typeof pi.bin?.pi !== "string") throw new PiInstallError("lockfile_invalid", `the lockfile does not hold ${PI_PACKAGE} with its pi command`);
  // Parents before the packages nested in them.
  packages.sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  return { packages, pi };
}

export function integrityOf(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

function cacheName(integrity) {
  return `${Buffer.from(integrity.slice("sha512-".length), "base64").toString("hex")}.tgz`;
}

async function fetchVerified(entry, destination, fetchBytes) {
  let lastError;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const bytes = await fetchBytes(entry.resolved);
      if (integrityOf(bytes) !== entry.integrity) {
        throw new PiInstallError("integrity_mismatch", `${entry.path} did not match its integrity`);
      }
      const part = `${destination}.part-${randomBytes(4).toString("hex")}`;
      writeFileSync(part, bytes);
      renameSync(part, destination);
      return bytes.length;
    } catch (error) {
      if (error instanceof PiInstallError) throw error;
      lastError = error;
    }
  }
  throw new PiInstallError("download_failed", `could not download ${entry.resolved}: ${lastError?.message ?? lastError}`);
}

export async function defaultFetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Every path under `root`; a symbolic link anywhere is refused. */
function refuseLinks(root) {
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new PiInstallError("unsafe_package", `${path} is a symbolic link`);
    if (stat.isDirectory()) refuseLinks(path);
  }
}

/** Unpack a verified npm tarball into `target`, which must not exist yet. */
function unpack(tarball, target, scratch) {
  const listing = execFileSync("/usr/bin/tar", ["-tzf", tarball], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n").filter(Boolean);
  const tops = new Set(listing.map((name) => name.replace(/^\.\//, "").split("/")[0]));
  if (tops.size !== 1 || listing.some((name) => name.startsWith("/") || name.split("/").includes(".."))) {
    throw new PiInstallError("unsafe_package", `${tarball} is not a single package folder`);
  }
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  execFileSync("/usr/bin/tar", ["-xzf", tarball, "-C", scratch]);
  refuseLinks(scratch);
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) throw new PiInstallError("unsafe_package", `${target} was laid out twice`);
  renameSync(join(scratch, [...tops][0]), target);
  rmSync(scratch, { recursive: true, force: true });
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/** Take `install.lock`, or refuse while a live install holds it. Returns the release. */
function takeLock(piRoot) {
  const lock = join(piRoot, "install.lock");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lock, "wx", 0o600);
      writeSync(fd, String(process.pid));
      closeSync(fd);
      return () => rmSync(lock, { force: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const holder = Number(readFileSync(lock, "utf8"));
      if (Number.isInteger(holder) && holder > 0 && processIsAlive(holder)) {
        throw new PiInstallError("already_installing", "Pi is already being installed");
      }
      rmSync(lock, { force: true });
    }
  }
  throw new PiInstallError("already_installing", "Pi is already being installed");
}

export function readInstallReceipt(target) {
  try {
    return JSON.parse(readFileSync(join(target, "install-receipt.json"), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Install the lockfile's packages at `target`, all or nothing. `fetchBytes(url)` downloads (tests
 * inject it); `checkVersion(bin, home)` returns what Pi's `--version` prints.
 */
export async function installPi({
  lockfile,
  lockSha256,
  piRoot,
  target,
  nodeBin = process.execPath,
  fetchBytes = defaultFetchBytes,
  checkVersion = (bin, home) => execFileSync(nodeBin, [bin, "--version"], {
    encoding: "utf8",
    cwd: home,
    env: { HOME: home, PATH: dirname(nodeBin) },
    timeout: 60_000,
  }).trim(),
  progress = () => {},
  log = () => {},
}) {
  if (resolve(dirname(target)) !== resolve(piRoot)) throw new PiInstallError("invalid_target", "the target is not inside the Pi folder");
  const { packages, pi } = readLockfile(readFileSync(lockfile), lockSha256);
  mkdirSync(piRoot, { recursive: true, mode: 0o700 });
  const release = takeLock(piRoot);
  const staging = join(piRoot, `.installing-${randomBytes(6).toString("hex")}`);
  try {
    const receipt = readInstallReceipt(target);
    if (receipt?.lockfileSha256 === lockSha256 && receipt?.version === pi.version) {
      return { target, version: pi.version, packages: packages.length, alreadyInstalled: true };
    }
    // What a stopped install left: hidden folders, never a finished one.
    for (const name of readdirSync(piRoot)) {
      if (name.startsWith(".installing-")) rmSync(join(piRoot, name), { recursive: true, force: true });
    }
    log(`install ${PI_PACKAGE}@${pi.version}: ${packages.length} packages, lockfile ${lockSha256.slice(0, 12)}`);

    const cache = join(piRoot, "cache");
    mkdirSync(cache, { recursive: true, mode: 0o700 });
    let done = 0;
    let downloaded = 0;
    let reused = 0;
    let bytes = 0;
    progress({ phase: "download", done, total: packages.length });
    const queue = [...packages];
    const worker = async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        const file = join(cache, cacheName(entry.integrity));
        if (existsSync(file) && integrityOf(readFileSync(file)) === entry.integrity) {
          reused += 1;
        } else {
          rmSync(file, { force: true });
          // Awaited first: `bytes += await …` would read `bytes` before the download and lose the others'.
          const fetched = await fetchVerified(entry, file, fetchBytes);
          bytes += fetched;
          downloaded += 1;
        }
        done += 1;
        progress({ phase: "download", done, total: packages.length });
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));
    log(`downloaded ${downloaded} (${bytes} bytes), reused ${reused} verified from the cache`);

    mkdirSync(staging, { mode: 0o700 });
    for (const [index, entry] of packages.entries()) {
      const tarball = join(cache, cacheName(entry.integrity));
      // Checked again: the cache is only trusted for what it holds now.
      if (integrityOf(readFileSync(tarball)) !== entry.integrity) {
        throw new PiInstallError("integrity_mismatch", `${entry.path} changed in the cache`);
      }
      unpack(tarball, join(staging, ...entry.path.split("/")), join(staging, ".unpack"));
      progress({ phase: "unpack", done: index + 1, total: packages.length });
    }

    const bin = join(staging, "node_modules", ...PI_PACKAGE.split("/"), ...pi.bin.pi.split("/"));
    if (!resolve(bin).startsWith(staging + sep) || !existsSync(bin)) throw new PiInstallError("unsafe_package", "Pi's command is not inside its package");
    chmodSync(bin, 0o755);
    progress({ phase: "check", done: 0, total: 1 });
    const checkHome = join(staging, ".check-home");
    mkdirSync(checkHome, { mode: 0o700 });
    let reported;
    try {
      reported = checkVersion(bin, checkHome);
    } catch (error) {
      throw new PiInstallError("check_failed", `the installed Pi did not start: ${error.message}`);
    }
    rmSync(checkHome, { recursive: true, force: true });
    if (reported !== pi.version) throw new PiInstallError("check_failed", `the installed Pi reports ${reported}, not ${pi.version}`);
    progress({ phase: "check", done: 1, total: 1 });

    writeFileSync(join(staging, "install-receipt.json"), `${JSON.stringify({
      schemaVersion: "1.0.0",
      package: PI_PACKAGE,
      version: pi.version,
      lockfileSha256: lockSha256,
      bin: pi.bin.pi,
      packages: packages.length,
      installedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    rmSync(target, { recursive: true, force: true });
    renameSync(staging, target);
    // Earlier pins' installs and the cache are no longer needed.
    for (const name of readdirSync(piRoot)) {
      const path = join(piRoot, name);
      if (path !== target && name.startsWith("pi-")) rmSync(path, { recursive: true, force: true });
    }
    rmSync(cache, { recursive: true, force: true });
    log(`installed at ${target}`);
    return { target, version: pi.version, packages: packages.length, alreadyInstalled: false };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    log(`stopped: ${error.reason ?? "failed"}: ${error.message}`);
    throw error;
  } finally {
    release();
  }
}

function argument(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

async function main(argv) {
  const say = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);
  const [lockfile, lockSha256, piRoot, target] = ["--lockfile", "--lock-sha256", "--pi-root", "--target"].map((name) => argument(argv, name));
  if (!lockfile || !lockSha256 || !piRoot || !target) {
    say({ event: "failed", reason: "usage", message: "usage: pi-install.mjs --lockfile --lock-sha256 --pi-root --target" });
    return 2;
  }
  const logFile = join(piRoot, "install.log");
  const log = (line) => {
    try {
      appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`, { mode: 0o600 });
    } catch {
      // The log never decides an install.
    }
  };
  try {
    const result = await installPi({ lockfile, lockSha256, piRoot, target, progress: (step) => say({ event: "progress", ...step }), log });
    say({ event: "installed", ...result });
    return 0;
  } catch (error) {
    say({ event: "failed", reason: error.reason ?? "failed", message: error.message });
    return 1;
  }
}

/** Whether this file is the script Node was asked to run. Real paths on both sides: the app's path
 * holds spaces, which a URL percent-encodes, and may pass through a link (`/tmp`), which Node
 * resolves for the module but not in `argv`. A mismatch would exit 0 having done nothing. */
function isEntryPoint() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  process.exitCode = await main(process.argv.slice(2));
}
