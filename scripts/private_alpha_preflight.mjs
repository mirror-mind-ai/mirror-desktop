#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { checkRuntime, hostPlatform, readPin, validatePin } from "./mirror_host_pin.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalOrigins = new Set([
  "https://github.com/mirror-mind-ai/mirror-desktop.git",
  "git@github.com:mirror-mind-ai/mirror-desktop.git",
  "ssh://git@github.com/mirror-mind-ai/mirror-desktop.git",
]);

export function parseVersion(value) {
  const match = String(value).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Could not parse version from ${String(value).slice(0, 80)}.`);
  return match.slice(1).map(Number);
}

function compareVersion(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function supportsMinimumMacOS(version, minimum) {
  return compareVersion(parseVersion(version), parseVersion(minimum)) >= 0;
}

export function sanitizeOrigin(origin) {
  const trimmed = String(origin).trim();
  if (/^https?:\/\//.test(trimmed)) {
    const url = new URL(trimmed);
    url.username = "";
    url.password = "";
    return url.toString();
  }
  return trimmed;
}

function canonicalPath(path, kind, label) {
  if (!isAbsolute(path) || !existsSync(path)) throw new Error(`${label} is unavailable or not absolute.`);
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || realpathSync(path) !== path
    || (kind === "directory" ? !metadata.isDirectory() : !metadata.isFile())) {
    throw new Error(`${label} is not a safe canonical ${kind}.`);
  }
}

/**
 * Start the runtime's host with an empty environment, read its handshake, and ask it about a home
 * with no 0.3 marker. Returns both answers; `checkMirrorHost` judges them.
 */
export function runHostProbe(runtimeDir) {
  const probe = realpathSync(mkdtempSync(join(tmpdir(), "mirror-preflight-unmarked-")));
  try {
    writeFileSync(join(probe, "memory.db"), "");
    const request = { id: 1, method: "inspectMigrationState", params: { dbPath: join(probe, "memory.db") } };
    const result = spawnSync(join(runtimeDir, "node", "bin", "node"), ["host.mjs"], {
      cwd: runtimeDir, env: {}, input: `${JSON.stringify(request)}\n`, encoding: "utf8", timeout: 30_000,
    });
    if (result.error || result.status !== 0) throw new Error("The Mirror host did not start from the pinned runtime.");
    const [handshake, refusal] = result.stdout.trim().split("\n").map((line) => JSON.parse(line));
    return { handshake, refusal };
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
}

/**
 * CV-010.DS-005 slice 2f: the 0.3 line's Mirror is the pinned host runtime, not a Python checkout.
 * The pin must verify, the materialized runtime must be the pinned one, its host must hand-shake
 * with the pinned Node, Core and Desktop API, and it must refuse a home without the 0.3 marker.
 */
export function checkMirrorHost({ root = repositoryRoot, platform = hostPlatform(), probe = runHostProbe } = {}) {
  const pin = readPin(root);
  const pinProblems = validatePin(pin, root);
  if (pinProblems.length > 0) throw new Error(`Mirror host pin is invalid: ${pinProblems.join("; ")}.`);
  const runtimeDir = join(root, ".mirror-host", "runtime", platform);
  const runtimeProblems = checkRuntime({ root, pin, platform, dir: runtimeDir });
  if (runtimeProblems.length > 0) throw new Error(`Mirror host runtime is not the pinned one: ${runtimeProblems.join("; ")}.`);
  const { handshake, refusal } = probe(runtimeDir);
  if (handshake?.type !== "ready"
    || handshake.node !== `v${pin.node.version}`
    || handshake.coreVersion !== pin.core.version
    || handshake.desktopApiVersion !== pin.core.desktopApiVersion) {
    throw new Error("Mirror host handshake does not match the pin.");
  }
  if (refusal?.error?.name !== "HomeNotMarkedError" || refusal.error.reason !== "unmarked") {
    throw new Error("Mirror host did not refuse a home without the 0.3 marker.");
  }
  return {
    status: "pinned", platform, node: pin.node.version, coreVersion: pin.core.version,
    coreCommit: pin.core.commit, desktopApiVersion: pin.core.desktopApiVersion, markerGuard: "refuses unmarked homes",
  };
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} is unavailable or failed its readiness probe.`);
  }
  return result.stdout.trim().split("\n")[0].slice(0, 120);
}

export function parseArguments(argv) {
  const result = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") result.json = true;
    else throw new Error(`Unsupported preflight argument ${arg}.`);
  }
  return result;
}

export function runPreflight() {
  if (process.platform !== "darwin") throw new Error("Private alpha supports macOS only.");
  const architecture = capture("uname", ["-m"]);
  if (!["x86_64", "arm64"].includes(architecture)) throw new Error(`Unsupported architecture ${architecture}.`);
  const origin = sanitizeOrigin(capture("git", ["remote", "get-url", "origin"]));
  if (!canonicalOrigins.has(origin)) throw new Error("Git origin is not the canonical private Mirror Desktop repository.");
  for (const lockfile of ["package-lock.json", "src-tauri/Cargo.lock"]) {
    canonicalPath(resolve(repositoryRoot, lockfile), "file", `${lockfile} lockfile`);
  }
  const compatibility = JSON.parse(readFileSync(resolve(repositoryRoot, "config/runtime-compatibility.json"), "utf8"));
  if (compatibility.schemaVersion !== "1.0.0" || typeof compatibility.minimumMacOS !== "string") {
    throw new Error("Runtime compatibility configuration is invalid.");
  }
  const macOS = capture("sw_vers", ["-productVersion"]);
  if (!supportsMinimumMacOS(macOS, compatibility.minimumMacOS)) {
    throw new Error(`macOS ${compatibility.minimumMacOS} or newer is required by this alpha.`);
  }
  capture("xcode-select", ["-p"]);
  const tools = {
    git: capture("git", ["--version"]), node: capture("node", ["--version"]),
    npm: capture("npm", ["--version"]), rustc: capture("rustc", ["--version"]),
    cargo: capture("cargo", ["--version"]),
    pi: capture("pi", ["--version"]), xcode: "available",
  };
  if (parseVersion(tools.node)[0] < 20) throw new Error("Node.js 20 or newer is required.");
  const runtime = checkMirrorHost();
  return {
    schemaVersion: "1.0.0", status: "ready",
    sourceRevision: capture("git", ["rev-parse", "HEAD"]),
    worktreeClean: capture("git", ["status", "--porcelain"]) === "",
    repository: "mirror-mind-ai/mirror-desktop",
    host: { architecture, macOS, minimumMacOS: compatibility.minimumMacOS },
    tools,
    runtime,
    lockfiles: { npm: "present", cargo: "present" },
  };
}

function humanReport(report) {
  return [
    "Mirror Desktop private alpha preflight: READY",
    `Revision: ${report.sourceRevision}`,
    `Host: macOS ${report.host.macOS} ${report.host.architecture}`,
    `Mirror host: Node ${report.runtime.node}, core ${report.runtime.coreVersion} (${report.runtime.coreCommit.slice(0, 8)}), Desktop API ${report.runtime.desktopApiVersion}, ${report.runtime.markerGuard}`,
    `Worktree: ${report.worktreeClean ? "clean" : "dirty"}`,
    "Required tools and lockfiles: ready",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const report = runPreflight();
    console.log(options.json ? JSON.stringify(report, null, 2) : humanReport(report));
  } catch (error) {
    console.error(`Mirror Desktop private alpha preflight: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
