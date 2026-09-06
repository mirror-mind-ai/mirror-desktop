#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

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

export function matchesCompatibility(version, requirement) {
  const parsed = parseVersion(version);
  return requirement.split(",").every((clause) => {
    const match = clause.trim().match(/^(>=|<)(\d+\.\d+\.\d+)$/);
    if (!match) throw new Error("Runtime compatibility requirement is unsupported.");
    const comparison = compareVersion(parsed, parseVersion(match[2]));
    return match[1] === ">=" ? comparison >= 0 : comparison < 0;
  });
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

export function validateRuntimeCoordinates({ mirrorRoot, mirrorHome, mirrorUser }, requirement) {
  if (![mirrorRoot, mirrorHome, mirrorUser].every((value) => typeof value === "string" && value)) {
    throw new Error("Mirror root, home and user are all required.");
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(mirrorUser)) {
    throw new Error("Mirror user must be a bounded lowercase slug.");
  }
  canonicalPath(mirrorRoot, "directory", "Mirror root");
  canonicalPath(mirrorHome, "directory", "Mirror home");
  canonicalPath(resolve(mirrorRoot, "src", "memory"), "directory", "Mirror Core package");
  const pyproject = resolve(mirrorRoot, "pyproject.toml");
  canonicalPath(pyproject, "file", "Mirror Core project");
  const database = resolve(mirrorHome, "memory.db");
  canonicalPath(database, "file", "Mirror database");
  if (dirname(database) !== mirrorHome || basename(database) !== "memory.db") {
    throw new Error("Mirror database must be memory.db directly beneath Mirror home.");
  }
  const versionMatch = readFileSync(pyproject, "utf8").match(/^version\s*=\s*["']([^"']+)["']/m);
  if (!versionMatch || !matchesCompatibility(versionMatch[1], requirement)) {
    throw new Error(`Mirror Core is incompatible with ${requirement}.`);
  }
  return versionMatch[1];
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
    else if (["--mirror-root", "--mirror-home", "--mirror-user"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      result[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`Unsupported preflight argument ${arg}.`);
  }
  return result;
}

export function runPreflight(options) {
  if (process.platform !== "darwin") throw new Error("Private alpha supports macOS only.");
  const architecture = capture("uname", ["-m"]);
  if (!["x86_64", "arm64"].includes(architecture)) throw new Error(`Unsupported architecture ${architecture}.`);
  const origin = sanitizeOrigin(capture("git", ["remote", "get-url", "origin"]));
  if (!canonicalOrigins.has(origin)) throw new Error("Git origin is not the canonical private Mirror Desktop repository.");
  for (const lockfile of ["package-lock.json", "src-tauri/Cargo.lock"]) {
    canonicalPath(resolve(repositoryRoot, lockfile), "file", `${lockfile} lockfile`);
  }
  const compatibility = JSON.parse(readFileSync(resolve(repositoryRoot, "config/runtime-compatibility.json"), "utf8"));
  if (compatibility.schemaVersion !== "1.0.0"
    || typeof compatibility.mirrorCore !== "string"
    || typeof compatibility.minimumMacOS !== "string") {
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
    cargo: capture("cargo", ["--version"]), uv: capture("uv", ["--version"]),
    pi: capture("pi", ["--version"]), xcode: "available",
  };
  if (parseVersion(tools.node)[0] < 20) throw new Error("Node.js 20 or newer is required.");
  const coreVersion = validateRuntimeCoordinates(options, compatibility.mirrorCore);
  return {
    schemaVersion: "1.0.0", status: "ready",
    sourceRevision: capture("git", ["rev-parse", "HEAD"]),
    worktreeClean: capture("git", ["status", "--porcelain"]) === "",
    repository: "mirror-mind-ai/mirror-desktop",
    host: { architecture, macOS, minimumMacOS: compatibility.minimumMacOS },
    tools,
    runtime: { status: "compatible", coreVersion, requirement: compatibility.mirrorCore },
    lockfiles: { npm: "present", cargo: "present" },
  };
}

function humanReport(report) {
  return [
    "Mirror Desktop private alpha preflight: READY",
    `Revision: ${report.sourceRevision}`,
    `Host: macOS ${report.host.macOS} ${report.host.architecture}`,
    `Mirror Core: ${report.runtime.coreVersion} (${report.runtime.requirement})`,
    `Worktree: ${report.worktreeClean ? "clean" : "dirty"}`,
    "Required tools and lockfiles: ready",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const report = runPreflight(options);
    console.log(options.json ? JSON.stringify(report, null, 2) : humanReport(report));
  } catch (error) {
    console.error(`Mirror Desktop private alpha preflight: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
