#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { releaseNotesUrl } from "./release_notes.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function parseSemver(value) {
  const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/);
  if (!match) throw new Error(`Invalid release version: ${value}`);
  return match[0];
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readCargoVersion(path) {
  const match = readFileSync(path, "utf8").match(/^version\s*=\s*["']([^"']+)["']/m);
  if (!match) throw new Error("Could not read Cargo package version.");
  return match[1];
}

export function releaseVersionAt(root = repositoryRoot) {
  const packageVersion = parseSemver(readJson(resolve(root, "package.json")).version);
  const tauriVersion = parseSemver(readJson(resolve(root, "src-tauri", "tauri.conf.json")).version);
  const cargoVersion = parseSemver(readCargoVersion(resolve(root, "src-tauri", "Cargo.toml")));
  const versions = new Set([packageVersion, tauriVersion, cargoVersion]);
  if (versions.size !== 1) {
    throw new Error(`Version mismatch: package.json=${packageVersion}, tauri.conf.json=${tauriVersion}, Cargo.toml=${cargoVersion}`);
  }
  return packageVersion;
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
  return result.stdout.trim();
}

export function assertReleaseTag(version, tag) {
  const expected = `v${parseSemver(version)}`;
  if (tag !== expected) throw new Error(`Release tag must be ${expected}.`);
  return tag;
}

export function artifactName({ productName = "Mirror Desktop", version, architecture, extension = "dmg" }) {
  if (!["x64", "aarch64", "universal"].includes(architecture)) {
    throw new Error(`Unsupported release architecture: ${architecture}`);
  }
  return `${productName}_${parseSemver(version)}_${architecture}.${extension}`;
}

export function buildProvenance({ version, revision, tag, artifact, sha256, architecture, checks }) {
  parseSemver(version);
  assertReleaseTag(version, tag);
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error("Revision must be a full Git SHA.");
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error("SHA-256 must be a 64-character lowercase hex digest.");
  return {
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version,
    tag,
    revision,
    releaseNotes: releaseNotesUrl(tag),
    artifact,
    architecture,
    sha256,
    checks,
    boundaries: {
      binariesCommittedToSource: false,
      selfUpdateAuthority: false,
      signingOrNotarizationClaimed: false,
    },
  };
}

export function parseArguments(argv) {
  const result = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") result.json = true;
    else if (["--artifact", "--sha256", "--architecture"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      result[arg.slice(2)] = value;
      index += 1;
    } else throw new Error(`Unsupported release candidate argument ${arg}.`);
  }
  return result;
}

export function inspectReleaseCandidate(options = {}) {
  const version = releaseVersionAt(repositoryRoot);
  const tag = assertReleaseTag(version, `v${version}`);
  const revision = capture("git", ["rev-parse", "HEAD"]);
  const worktreeClean = capture("git", ["status", "--porcelain"]) === "";
  const architecture = options.architecture ?? capture("uname", ["-m"]).replace("x86_64", "x64").replace("arm64", "aarch64");
  const artifact = options.artifact ?? artifactName({ version, architecture });
  const sha256 = options.sha256 ?? "0".repeat(64);
  return buildProvenance({
    version, tag, revision, artifact, architecture, sha256,
    checks: { worktreeClean, versionFilesAgree: true },
  });
}

function human(report) {
  return [
    "Mirror Desktop release candidate inspection: READY",
    `Version: ${report.version}`,
    `Tag: ${report.tag}`,
    `Revision: ${report.revision}`,
    `Release notes: ${report.releaseNotes}`,
    `Artifact: ${report.artifact}`,
    `Architecture: ${report.architecture}`,
    `Worktree: ${report.checks.worktreeClean ? "clean" : "dirty"}`,
    "Boundary: inspection only; no tag, artifact, release, push or publication was created.",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = inspectReleaseCandidate(parseArguments(process.argv.slice(2)));
    console.log(process.argv.includes("--json") ? JSON.stringify(report, null, 2) : human(report));
  } catch (error) {
    console.error(`Mirror Desktop release candidate inspection: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
