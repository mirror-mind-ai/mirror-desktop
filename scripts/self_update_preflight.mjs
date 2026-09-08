#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_STATIC_TARGETS = ["darwin-x86_64", "darwin-aarch64"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeConfig(base, overlay) {
  if (!isRecord(base) || !isRecord(overlay)) return overlay;
  const merged = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    merged[key] = key in merged ? mergeConfig(merged[key], value) : value;
  }
  return merged;
}

export function parseArguments(argv) {
  const result = { json: false, configs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") result.json = true;
    else if (arg === "--config") {
      const value = argv[index + 1];
      if (!value) throw new Error("--config requires a path.");
      result.configs.push(value);
      index += 1;
    } else throw new Error(`Unsupported self-update preflight argument ${arg}.`);
  }
  return result;
}

export function loadMergedTauriConfig(root = repositoryRoot, configPaths = []) {
  let config = readJson(resolve(root, "src-tauri", "tauri.conf.json"));
  for (const configPath of configPaths) {
    const absolute = resolve(root, configPath);
    if (!existsSync(absolute)) throw new Error(`Config overlay not found: ${configPath}`);
    config = mergeConfig(config, readJson(absolute));
  }
  return config;
}

function validateUpdaterPubkey(pubkey, findings) {
  if (typeof pubkey !== "string" || pubkey.trim() === "") {
    findings.push("plugins.updater.pubkey is required.");
    return;
  }
  try {
    const decoded = Buffer.from(pubkey, "base64").toString("utf8");
    if (!decoded.includes("minisign public key")) findings.push("plugins.updater.pubkey must be a minisign public key.");
  } catch {
    findings.push("plugins.updater.pubkey must be base64-encoded.");
  }
}

export function inspectSelfUpdateConfig(config) {
  const findings = [];
  if (config.productName !== "Mirror Desktop") findings.push("productName must remain Mirror Desktop.");
  if (config.identifier !== "ai.mirrormind.desktop") findings.push("identifier must remain ai.mirrormind.desktop.");
  const createUpdaterArtifacts = config.bundle?.createUpdaterArtifacts;
  if (createUpdaterArtifacts !== true && createUpdaterArtifacts !== "v1Compatible") {
    findings.push("bundle.createUpdaterArtifacts must be true for self-update rehearsal builds.");
  }
  const updater = config.plugins?.updater;
  if (!isRecord(updater)) {
    findings.push("plugins.updater is required for release self-update validation.");
  } else {
    if (!Array.isArray(updater.endpoints) || updater.endpoints.length === 0) {
      findings.push("plugins.updater.endpoints must contain at least one HTTPS endpoint.");
    } else {
      for (const endpoint of updater.endpoints) {
        if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
          findings.push("plugins.updater.endpoints may only contain HTTPS URLs.");
        }
        if (typeof endpoint === "string" && (!endpoint.includes("{{target}}") || !endpoint.includes("{{current_version}}"))) {
          findings.push("plugins.updater.endpoints should include {{target}} and {{current_version}} to bind update selection to the running app.");
        }
      }
    }
    validateUpdaterPubkey(updater.pubkey, findings);
    for (const flag of ["dangerousInsecureTransportProtocol", "dangerousAcceptInvalidCerts", "dangerousAcceptInvalidHostnames"]) {
      if (updater[flag]) findings.push(`plugins.updater.${flag} must not be enabled.`);
    }
  }
  return {
    status: findings.length === 0 ? "ready" : "blocked",
    product: config.productName,
    identifier: config.identifier,
    version: config.version,
    expectedManifestTargets: REQUIRED_STATIC_TARGETS,
    boundaries: {
      publishesRelease: false,
      createsSigningKeys: false,
      touchesMirrorHome: false,
      touchesMemoryDatabase: false,
    },
    findings,
  };
}

export function inspectSelfUpdatePreflight({ root = repositoryRoot, configs = [] } = {}) {
  return inspectSelfUpdateConfig(loadMergedTauriConfig(root, configs));
}

function human(report) {
  const lines = [
    `Mirror Desktop self-update preflight: ${report.status === "ready" ? "READY" : "BLOCKED"}`,
    `Product: ${report.product}`,
    `Identifier: ${report.identifier}`,
    `Version: ${report.version}`,
    `Expected manifest targets: ${report.expectedManifestTargets.join(", ")}`,
    "Boundary: validation only; no signing key, release, tag, push, publication, app data or Mirror data was created or changed.",
  ];
  if (report.findings.length > 0) lines.push("Findings:", ...report.findings.map((finding) => `- ${finding}`));
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const report = inspectSelfUpdatePreflight({ configs: options.configs });
    console.log(options.json ? JSON.stringify(report, null, 2) : human(report));
    if (report.status !== "ready") process.exit(1);
  } catch (error) {
    console.error(`Mirror Desktop self-update preflight: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
