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
// Known gap: SHASUMS256.txt is signed by Node's releasers, and this machine has no gpg, so the
// recorded hashes were taken from the file over HTTPS, not from a verified signature.

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_NODE_VERSION = "24.21.0";
export const PLATFORMS = ["darwin-arm64", "darwin-x64"];
export const PIN_PATH = "mirror-host/pin.json";

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
    extractPackage(join(root, pin.core.tarball), join(staging, "node_modules", pin.core.package));
    extractPackage(join(root, pin.core.dependencies.yaml.tarball), join(staging, "node_modules", "yaml"));
    rmSync(join(staging, "download"), { recursive: true, force: true });
    rmSync(extracted, { recursive: true, force: true });
    writeFileSync(join(staging, "pin-receipt.json"), `${JSON.stringify({
      schemaVersion: "1.0.0",
      platform,
      node: { version, sha256: actual },
      core: { commit: pin.core.commit, sha256: pin.core.sha256, desktopApiVersion: pin.core.desktopApiVersion },
      yaml: { version: pin.core.dependencies.yaml.version, integrity: pin.core.dependencies.yaml.integrity },
    }, null, 2)}\n`);
    renameSync(staging, outDir);
    placed = true;
    return { outDir, nodeBin: join(outDir, "node", "bin", "node"), coreDir: join(outDir, "node_modules", pin.core.package) };
  } finally {
    if (!placed) rmSync(staging, { recursive: true, force: true });
  }
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
  console.error("Usage: mirror_host_pin.mjs verify | materialize [--platform darwin-arm64|darwin-x64] [--replace]");
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
