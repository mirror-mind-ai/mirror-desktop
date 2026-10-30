#!/usr/bin/env node
// CV-010.DS-005 phase 2, slice 2a: the runtime the 0.3 line embeds, pinned rather than found.
//
// `mirror-host/pin.json` records:
//   - an official Node build: its version (at least 24.21.0, the first release Core's CI measured
//     the FTS5 shadow-table refusal on) and the SHA-256 of its macOS archives, copied from that
//     release's SHASUMS256.txt;
//   - the TypeScript core: a tarball packed from a recorded Core commit and vendored under
//     `vendor/mirror-host/`, with its SHA-256, and its one dependency, `yaml`, with the integrity
//     Core's own lockfile records.
//
// `materialize` builds `.mirror-host/runtime/<platform>/` (gitignored) from those, all or nothing:
// it works in a staging directory beside the target, verifies every hash before using a byte,
// checks the extracted Node reports the pinned version, and renames into place only when done.
//
// `stage` copies what the app needs from a materialized runtime into `.mirror-host/bundle/<platform>/`
// (slice 2f): the `node` binary and its licence, `host.mjs`, the receipt and `node_modules`, after
// checking the runtime still matches the pin and the current `host.mjs`. Packaged builds add that
// folder to the app's resources as `mirror-host/` through `bundleConfig`.
//
// Slice 3b adds Pi, which the app installs at first run rather than carries: `pin.pi` records the
// package, its version, and the SHA-256 of a vendored npm lockfile (`mirror-host/pi/`) whose sha512
// integrity covers every dependency. The runtime carries that lockfile and `pi-install.mjs`, and
// the receipt records both hashes. `scriptsNotRun` names the packages that declare an install
// script, which the installer never runs; a new pin that adds one fails `verify` until it is read.
//
// Known gap: SHASUMS256.txt is signed by Node's releasers, and this machine has no gpg, so the
// recorded hashes were taken from the file over HTTPS, not from a verified signature.

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_NODE_VERSION = "24.21.0";
export const PLATFORMS = ["darwin-arm64", "darwin-x64"];
export const PIN_PATH = "mirror-host/pin.json";
export const HOST_SCRIPT_PATH = "mirror-host/host.mjs";
export const PI_INSTALLER_PATH = "mirror-host/pi-install.mjs";
export const PI_REGISTRY = "https://registry.npmjs.org/";

export function readPin(root) {
  return JSON.parse(readFileSync(join(root, PIN_PATH), "utf8"));
}

export function nodeArchiveName(version, platform) {
  return `node-v${version}-${platform}.tar.gz`;
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function sha512Integrity(path) {
  return `sha512-${createHash("sha512").update(readFileSync(path)).digest("base64")}`;
}

function versionAtLeast(version, floor) {
  const parse = (value) => String(value).split(".").map((part) => Number(part));
  const [a, b] = [parse(version), parse(floor)];
  if (a.length !== 3 || a.some((part) => !Number.isInteger(part) || part < 0)) return false;
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return true;
}

/** Every problem with `pin`, or none. */
export function validatePin(pin, root) {
  const problems = [];
  const version = pin?.node?.version;
  if (!versionAtLeast(version, MIN_NODE_VERSION)) {
    problems.push(`Node ${version} is below ${MIN_NODE_VERSION}, the floor that keeps the FTS5 refusal`);
  }
  for (const platform of PLATFORMS) {
    const entry = pin?.node?.platforms?.[platform];
    if (!entry) {
      problems.push(`Node has no archive pinned for ${platform}`);
      continue;
    }
    if (entry.file !== nodeArchiveName(version, platform)) problems.push(`Node ${platform} archive is misnamed`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) problems.push(`Node ${platform} sha256 is malformed`);
  }
  const core = pin?.core ?? {};
  if (!/^[0-9a-f]{40}$/.test(core.commit ?? "")) problems.push("core commit is not a full commit id");
  const tarball = core.tarball ? join(root, core.tarball) : "";
  if (!tarball || !existsSync(tarball)) problems.push("core tarball is missing");
  else if (sha256File(tarball) !== core.sha256) problems.push("core tarball sha256 does not match the pin");
  const yaml = core.dependencies?.yaml;
  const yamlTarball = yaml?.tarball ? join(root, yaml.tarball) : "";
  if (!yamlTarball || !existsSync(yamlTarball)) problems.push("yaml tarball is missing");
  else if (sha512Integrity(yamlTarball) !== yaml.integrity) problems.push("yaml tarball integrity does not match the pin");
  problems.push(...validatePiPin(pin, root));
  return problems;
}

/** Every problem with `pin.pi` and its lockfile, or none. */
export function validatePiPin(pin, root) {
  const pi = pin?.pi;
  if (!pi) return ["Pi is not pinned"];
  const lockfile = pi.lockfile ? join(root, pi.lockfile) : "";
  if (!lockfile || !existsSync(lockfile)) return ["Pi's lockfile is missing"];
  if (sha256File(lockfile) !== pi.lockfileSha256) return ["Pi's lockfile sha256 does not match the pin"];
  const problems = [];
  const packages = JSON.parse(readFileSync(lockfile, "utf8")).packages ?? {};
  const entries = Object.entries(packages).filter(([path]) => path !== "");
  if (packages[""]?.dependencies?.[pi.package] !== pi.version) problems.push(`Pi's lockfile does not ask for ${pi.package} ${pi.version}`);
  const own = packages[`node_modules/${pi.package}`];
  if (own?.version !== pi.version) problems.push(`Pi's lockfile does not hold ${pi.package} ${pi.version}`);
  if (typeof own?.bin?.pi !== "string") problems.push("Pi's lockfile does not name the pi command");
  const engine = /^>=(\d+\.\d+\.\d+)$/.exec(own?.engines?.node ?? "");
  if (!engine || !versionAtLeast(pin.node?.version, engine[1])) problems.push(`the pinned Node does not meet Pi's engine ${own?.engines?.node}`);
  if (entries.length !== pi.packages) problems.push(`Pi's lockfile holds ${entries.length} packages, the pin ${pi.packages}`);
  for (const [path, entry] of entries) {
    if (!String(entry.resolved ?? "").startsWith(PI_REGISTRY)) problems.push(`${path} does not come from the npm registry`);
    if (!String(entry.integrity ?? "").startsWith("sha512-")) problems.push(`${path} has no sha512 integrity`);
  }
  const scripted = entries.filter(([, entry]) => entry.hasInstallScript).map(([path]) => path.slice(path.lastIndexOf("node_modules/") + 13)).sort();
  if (JSON.stringify(scripted) !== JSON.stringify([...(pi.scriptsNotRun ?? [])].sort())) {
    problems.push(`the packages with install scripts are ${scripted.join(", ")}, not the ones the pin read (${(pi.scriptsNotRun ?? []).join(", ")})`);
  }
  return problems;
}

export function hostPlatform() {
  return `${process.platform}-${process.arch}`;
}

async function downloadArchive(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not download ${url}: HTTP ${response.status}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function extractPackage(tarball, target) {
  mkdirSync(target, { recursive: true });
  execFileSync("tar", ["-xzf", tarball, "-C", target, "--strip-components=1"]);
}

/**
 * Lay out the host beside its core in `outDir`, which must not exist: `host.mjs`, the core and
 * `yaml` under `node_modules`, and a receipt. Without Node, so the host's tests can run it on any
 * Node; `materializeHost` adds the pinned Node to the same layout.
 */
export function layoutHost({ root, pin, outDir, node = null }) {
  const problems = validatePin(pin, root);
  if (problems.length > 0) throw new Error(`the pin is invalid: ${problems.join("; ")}`);
  if (existsSync(outDir)) throw new Error(`${outDir} already exists`);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  extractPackage(join(root, pin.core.tarball), join(outDir, "node_modules", pin.core.package));
  extractPackage(join(root, pin.core.dependencies.yaml.tarball), join(outDir, "node_modules", "yaml"));
  copyFileSync(join(root, HOST_SCRIPT_PATH), join(outDir, "host.mjs"));
  copyFileSync(join(root, PI_INSTALLER_PATH), join(outDir, "pi-install.mjs"));
  mkdirSync(join(outDir, "pi"));
  copyFileSync(join(root, pin.pi.lockfile), join(outDir, "pi", "package-lock.json"));
  writeFileSync(join(outDir, "pin-receipt.json"), `${JSON.stringify({
    schemaVersion: "1.0.0",
    ...(node ?? {}),
    core: { commit: pin.core.commit, sha256: pin.core.sha256, desktopApiVersion: pin.core.desktopApiVersion },
    yaml: { version: pin.core.dependencies.yaml.version, integrity: pin.core.dependencies.yaml.integrity },
    host: { sha256: sha256File(join(root, HOST_SCRIPT_PATH)) },
    pi: { package: pin.pi.package, version: pin.pi.version, lockfileSha256: pin.pi.lockfileSha256 },
    piInstaller: { sha256: sha256File(join(root, PI_INSTALLER_PATH)) },
  }, null, 2)}\n`);
}

/**
 * Build `outDir` from `pin` for `platform`, or nothing. `fetchArchive(url, destination)` downloads
 * the Node archive (injected by tests); `runVersionCheck` runs the extracted `node --version`,
 * which is only possible for the host's own platform.
 */
export async function materializeHost({
  root,
  pin,
  platform,
  outDir,
  fetchArchive = downloadArchive,
  runVersionCheck = platform === hostPlatform(),
}) {
  if (!PLATFORMS.includes(platform)) throw new Error(`unsupported platform ${platform}`);
  const problems = validatePin(pin, root);
  if (problems.length > 0) throw new Error(`the pin is invalid: ${problems.join("; ")}`);
  if (existsSync(outDir)) throw new Error(`${outDir} already exists`);

  const { version } = pin.node;
  const archiveName = nodeArchiveName(version, platform);
  mkdirSync(dirname(outDir), { recursive: true });
  const staging = join(dirname(outDir), `.${basename(outDir)}.materializing-${process.pid}-${randomBytes(6).toString("hex")}`);
  mkdirSync(staging, { mode: 0o700 });
  let placed = false;
  try {
    const archive = join(staging, "download", archiveName);
    mkdirSync(dirname(archive));
    await fetchArchive(`https://nodejs.org/dist/v${version}/${archiveName}`, archive);
    const actual = sha256File(archive);
    if (actual !== pin.node.platforms[platform].sha256) {
      throw new Error(`sha256 mismatch for ${archiveName}: expected ${pin.node.platforms[platform].sha256}, got ${actual}`);
    }
    const extracted = join(staging, "extract");
    mkdirSync(extracted);
    execFileSync("tar", ["-xzf", archive, "-C", extracted]);
    const top = join(extracted, `node-v${version}-${platform}`);
    if (!existsSync(join(top, "bin", "node"))) {
      throw new Error(`${archiveName} does not hold node-v${version}-${platform}/bin/node`);
    }
    renameSync(top, join(staging, "node"));
    const nodeBin = join(staging, "node", "bin", "node");
    if (runVersionCheck) {
      const reported = execFileSync(nodeBin, ["--version"], { encoding: "utf8" }).trim();
      if (reported !== `v${version}`) throw new Error(`the extracted Node reports ${reported}, not v${version}`);
    }
    rmSync(join(staging, "download"), { recursive: true, force: true });
    rmSync(extracted, { recursive: true, force: true });
    // The host and its core are laid out inside the staging directory, and the Node joins them.
    const laidOut = join(staging, "layout");
    layoutHost({ root, pin, outDir: laidOut, node: { platform, node: { version, sha256: actual } } });
    renameSync(join(staging, "node"), join(laidOut, "node"));
    renameSync(laidOut, outDir);
    rmSync(staging, { recursive: true, force: true });
    placed = true;
    return { outDir, nodeBin: join(outDir, "node", "bin", "node"), coreDir: join(outDir, "node_modules", pin.core.package) };
  } finally {
    if (!placed) rmSync(staging, { recursive: true, force: true });
  }
}

/** Every way the runtime laid out at `dir` differs from `pin` and the current host, or none. */
export function checkRuntime({ root, pin, platform, dir }) {
  const receiptPath = join(dir, "pin-receipt.json");
  if (!existsSync(receiptPath)) return [`no runtime at ${dir}; run: node scripts/mirror_host_pin.mjs materialize`];
  const problems = [];
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  if (receipt.platform !== platform) problems.push(`the runtime is for ${receipt.platform}, not ${platform}`);
  if (receipt.node?.version !== pin.node.version) problems.push(`the runtime's Node is ${receipt.node?.version}, the pin's ${pin.node.version}`);
  if (receipt.node?.sha256 !== pin.node.platforms[platform]?.sha256) problems.push("the runtime's Node archive hash is not the pin's");
  if (receipt.core?.commit !== pin.core.commit || receipt.core?.sha256 !== pin.core.sha256) problems.push("the runtime's core is not the pinned one");
  if (receipt.yaml?.integrity !== pin.core.dependencies.yaml.integrity) problems.push("the runtime's yaml is not the pinned one");
  if (receipt.host?.sha256 !== sha256File(join(root, HOST_SCRIPT_PATH))) {
    problems.push(`the runtime's host is not the current ${HOST_SCRIPT_PATH}; rematerialize with --replace`);
  }
  if (receipt.pi?.version !== pin.pi.version || receipt.pi?.lockfileSha256 !== pin.pi.lockfileSha256) {
    problems.push("the runtime's Pi pin is not the current one; rematerialize with --replace");
  }
  if (receipt.piInstaller?.sha256 !== sha256File(join(root, PI_INSTALLER_PATH))) {
    problems.push(`the runtime's Pi installer is not the current ${PI_INSTALLER_PATH}; rematerialize with --replace`);
  }
  const lockCopy = join(dir, "pi", "package-lock.json");
  if (!existsSync(lockCopy) || sha256File(lockCopy) !== receipt.pi?.lockfileSha256) problems.push("the runtime's Pi lockfile is not the one its receipt records");
  const installer = join(dir, "pi-install.mjs");
  if (!existsSync(installer) || sha256File(installer) !== receipt.piInstaller?.sha256) problems.push("the runtime's pi-install.mjs is not the one its receipt records");
  const host = join(dir, "host.mjs");
  if (!existsSync(host) || sha256File(host) !== receipt.host?.sha256) problems.push("the runtime's host.mjs is not the one its receipt records");
  if (!existsSync(join(dir, "node", "bin", "node"))) problems.push("the runtime has no node/bin/node");
  const corePackage = join(dir, "node_modules", pin.core.package, "package.json");
  if (!existsSync(corePackage) || JSON.parse(readFileSync(corePackage, "utf8")).version !== pin.core.version) {
    problems.push(`the runtime's ${pin.core.package} is not version ${pin.core.version}`);
  }
  return problems;
}

/** What the app carries from a runtime: npm, corepack and Node's headers stay behind. */
export const BUNDLE_ENTRIES = ["host.mjs", "pin-receipt.json", "node/bin/node", "node/LICENSE", "node_modules", "pi-install.mjs", "pi"];

/**
 * Copy `BUNDLE_ENTRIES` of the runtime at `runtimeDir` into `outDir`, replacing it, all or
 * nothing. Refuses a runtime that `checkRuntime` faults, and any symlink inside it.
 */
export function stageBundle({ root, pin, platform, runtimeDir, outDir }) {
  const problems = checkRuntime({ root, pin, platform, dir: runtimeDir });
  if (problems.length > 0) throw new Error(`the runtime cannot be bundled: ${problems.join("; ")}`);
  mkdirSync(dirname(outDir), { recursive: true });
  const staging = join(dirname(outDir), `.${basename(outDir)}.staging-${process.pid}-${randomBytes(6).toString("hex")}`);
  try {
    for (const entry of BUNDLE_ENTRIES) {
      const target = join(staging, entry);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(runtimeDir, entry), target, {
        recursive: true,
        filter: (source) => {
          if (lstatSync(source).isSymbolicLink()) throw new Error(`the runtime holds a symlink: ${source}`);
          return true;
        },
      });
    }
    chmodSync(join(staging, "node", "bin", "node"), 0o755);
    rmSync(outDir, { recursive: true, force: true });
    renameSync(staging, outDir);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return { outDir, entries: BUNDLE_ENTRIES };
}

/** The Tauri config a packaged build merges so the staged runtime ships as `Resources/mirror-host/`. */
export function bundleConfig(platform) {
  if (!PLATFORMS.includes(platform)) throw new Error(`unsupported platform ${platform}`);
  return { bundle: { resources: { [`../.mirror-host/bundle/${platform}/`]: "mirror-host/" } } };
}

/** Stage this machine's runtime and return the `--config` arguments that ship it in the app. */
export function prepareBundledBuild(root) {
  const platform = hostPlatform();
  stageBundle({
    root,
    pin: readPin(root),
    platform,
    runtimeDir: join(root, ".mirror-host", "runtime", platform),
    outDir: join(root, ".mirror-host", "bundle", platform),
  });
  return ["--config", JSON.stringify(bundleConfig(platform))];
}

async function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pin = readPin(root);
  const [command, ...rest] = argv;
  if (command === "verify") {
    const problems = validatePin(pin, root);
    for (const problem of problems) console.error(`- ${problem}`);
    console.log(problems.length === 0 ? "Mirror host pin: READY" : "Mirror host pin: INVALID");
    return problems.length === 0 ? 0 : 1;
  }
  if (command === "materialize") {
    const at = rest.indexOf("--platform");
    const platform = at >= 0 ? rest[at + 1] : hostPlatform();
    const outDir = join(root, ".mirror-host", "runtime", platform);
    if (rest.includes("--replace")) rmSync(outDir, { recursive: true, force: true });
    const result = await materializeHost({ root, pin, platform, outDir });
    console.log(`Mirror host runtime: ${result.outDir}`);
    console.log(`Node: ${result.nodeBin} (v${pin.node.version})`);
    console.log(`Core: ${pin.core.package}@${pin.core.version} from ${pin.core.commit.slice(0, 8)}`);
    return 0;
  }
  if (command === "check" || command === "stage") {
    const at = rest.indexOf("--platform");
    const platform = at >= 0 ? rest[at + 1] : hostPlatform();
    const runtimeDir = join(root, ".mirror-host", "runtime", platform);
    if (command === "check") {
      const problems = checkRuntime({ root, pin, platform, dir: runtimeDir });
      for (const problem of problems) console.error(`- ${problem}`);
      console.log(problems.length === 0 ? `Mirror host runtime ${platform}: READY` : `Mirror host runtime ${platform}: STALE`);
      return problems.length === 0 ? 0 : 1;
    }
    const result = stageBundle({ root, pin, platform, runtimeDir, outDir: join(root, ".mirror-host", "bundle", platform) });
    console.log(`Mirror host bundle: ${result.outDir}`);
    return 0;
  }
  console.error("Usage: mirror_host_pin.mjs verify | materialize | check | stage [--platform darwin-arm64|darwin-x64] [--replace]");
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
