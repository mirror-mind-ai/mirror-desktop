#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { alphaBuildPlan } from "./alpha_build.mjs";
import { inspectReleaseCandidate, parseSemver, releaseVersionAt } from "./release_candidate.mjs";
import { releaseReadingFromSource } from "./release_notes.mjs";
import {
  defaultBaseUrl,
  manifestPaths,
  publishStagedPrivateUpdate,
  stagePrivateUpdatePublication,
} from "./private_update_publish.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultTargets = ["darwin", "darwin-x86_64", "darwin-aarch64"];

export function assertBaseUrlAgreement(derivedBaseUrl, explicitBaseUrl) {
  const normalize = (value) => String(value).replace(/\/+$/, "");
  if (explicitBaseUrl !== undefined && normalize(explicitBaseUrl) !== normalize(derivedBaseUrl)) {
    throw new Error(`Requested base URL ${explicitBaseUrl} diverges from the application updater endpoint ${derivedBaseUrl}; no installed application polls it.`);
  }
  return derivedBaseUrl;
}

export function compareReleaseVersions(left, right) {
  const parse = (value) => {
    const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) throw new Error(`Invalid release version: ${value}`);
    return { base: match.slice(1, 4).map(Number), prerelease: match[4]?.split(".") };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.base[index] !== b.base[index]) return a.base[index] - b.base[index];
  }
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const segmentA = a.prerelease[index];
    const segmentB = b.prerelease[index];
    if (segmentA === segmentB) continue;
    if (segmentA === undefined) return -1;
    if (segmentB === undefined) return 1;
    const numeric = /^\d+$/.test(segmentA) && /^\d+$/.test(segmentB);
    return numeric ? Number(segmentA) - Number(segmentB) : segmentA.localeCompare(segmentB);
  }
  return 0;
}

export function deriveRetainedVersions({ version, tags }) {
  const releaseVersion = parseSemver(version);
  const published = tags
    .map((tag) => String(tag).trim().replace(/^v/, ""))
    .filter((candidate) => {
      try {
        parseSemver(candidate);
        return candidate !== releaseVersion;
      } catch {
        return false;
      }
    })
    .sort(compareReleaseVersions);
  const previous = published.at(-1);
  return previous ? [previous, releaseVersion] : [releaseVersion];
}

export function releaseNoteAuthorship({ version, source, baseUrl = defaultBaseUrl }) {
  const reading = releaseReadingFromSource({ version, source, baseUrl: `${baseUrl.replace(/\/$/, "")}/releases` });
  return { title: reading.title, text: source };
}

export function confirmationPayload({ version, tag, revision, baseUrl, manifestPaths: paths, artifacts, gates, actions, releaseNote }) {
  parseSemver(version);
  if (tag !== `v${version}`) throw new Error(`Release tag must be v${version}.`);
  if (!/^[0-9a-f]{40}$/.test(revision ?? "")) throw new Error("Candidate revision must be a full Git SHA.");
  if (!releaseNote?.title?.trim() || !releaseNote?.text?.trim()) {
    throw new Error("The authored release note title and full text are required in the confirmation.");
  }
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("Derived manifest paths are required.");
  if (!Array.isArray(artifacts) || artifacts.length === 0
    || artifacts.some((artifact) => !/^[0-9a-f]{64}$/.test(artifact.sha256 ?? "") || artifact.sha256 === "0".repeat(64))) {
    throw new Error("Every artifact requires a real SHA-256 digest.");
  }
  if (!Array.isArray(actions) || actions.length === 0) throw new Error("The confirmed action list is required.");
  return {
    decision: "publish-release",
    version,
    tag,
    revision,
    baseUrl: baseUrl.replace(/\/$/, ""),
    manifestPaths: [...paths],
    artifacts: artifacts.map((artifact) => ({ ...artifact })),
    gates: { ...gates },
    actions: [...actions],
    releaseNote: { title: releaseNote.title, text: releaseNote.text },
  };
}

export function renderConfirmation(payload) {
  return [
    "Mirror Desktop release deployment: PREPARED — one confirmation required",
    `Version: ${payload.version}`,
    `Tag: ${payload.tag}`,
    `Candidate revision: ${payload.revision}`,
    `Publication base URL (derived from the application updater endpoint): ${payload.baseUrl}`,
    `Manifest paths: ${payload.manifestPaths.join(", ")}`,
    "Artifacts:",
    ...payload.artifacts.map((artifact) => `  ${artifact.name}  sha256=${artifact.sha256}`),
    "Gates:",
    ...Object.entries(payload.gates).map(([name, status]) => `  ${name}: ${status}`),
    "On confirmation, without further questions:",
    ...payload.actions.map((action) => `  - ${action}`),
    "",
    `Authored release title: ${payload.releaseNote.title}`,
    "Authored release note (full text):",
    "--- release note begin ---",
    payload.releaseNote.text.trimEnd(),
    "--- release note end ---",
  ].join("\n");
}

export async function verifyPublishedEndpoints({ baseUrl, version, targets = defaultTargets, retainedVersions, fetchJson = defaultFetchJson }) {
  const releaseVersion = parseSemver(version);
  const checks = [];
  const failures = [];
  for (const target of targets) {
    for (const currentVersion of retainedVersions) {
      const url = `${baseUrl.replace(/\/$/, "")}/${target}/${currentVersion}/latest.json`;
      try {
        const manifest = await fetchJson(url);
        if (manifest?.version !== releaseVersion) {
          failures.push(`${url} serves ${manifest?.version ?? "no version"} instead of ${releaseVersion}.`);
        } else if (typeof manifest.signature !== "string" || manifest.signature.trim().length === 0) {
          failures.push(`${url} serves ${releaseVersion} without an updater signature.`);
        } else {
          checks.push({ url, version: manifest.version, signatureBytes: manifest.signature.trim().length });
        }
      } catch (error) {
        failures.push(`${url} is unreachable: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Post-publication verification failed:\n${failures.join("\n")}`);
  }
  return { status: "verified", checks };
}

async function defaultFetchJson(url) {
  const response = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function renderPreparationEvidence({ version, tag, revision, date, gates, artifacts, baseUrl, manifestPaths: paths, releaseNote }) {
  return [
    "# Release Deployment Preparation — " + `v${version}`,
    "",
    `**Release:** \`${tag}\``,
    `**Date:** ${date}`,
    `**Candidate source revision:** \`${revision}\``,
    `**Publication base URL (derived):** \`${baseUrl}\``,
    "",
    "Generated by `scripts/release_deploy.mjs` from the data the route actually used.",
    "",
    "## Gates",
    "",
    ...Object.entries(gates).map(([name, status]) => `- \`${name}\`: ${status}`),
    "",
    "## Artifacts",
    "",
    "| Artifact | SHA-256 |",
    "|----------|---------|",
    ...artifacts.map((artifact) => `| \`${artifact.name}\` | \`${artifact.sha256}\` |`),
    "",
    "## Derived Manifest Paths",
    "",
    ...paths.map((path) => `- \`${path}\``),
    "",
    "## Authored Release Note",
    "",
    `Title: **${releaseNote.title}**. The full authored text was presented verbatim at the single confirmation point and ships unmodified from \`docs/releases/v${version}.md\`.`,
    "",
  ].join("\n");
}

export function renderPublicationEvidence({ version, tag, revision, date, baseUrl, verification, githubReleaseUrl }) {
  return [
    "# Release Deployment Publication — " + `v${version}`,
    "",
    `**Release:** \`${tag}\``,
    `**Date:** ${date}`,
    `**Tag target:** \`${revision}\``,
    `**Publication base URL (derived):** \`${baseUrl}\``,
    `**GitHub release:** ${githubReleaseUrl}`,
    "",
    "Generated by `scripts/release_deploy.mjs` from the data the route actually used.",
    "",
    "## Post-Publication Verification",
    "",
    "Every URL below is exactly what an installed application polls. Each served the released version with a non-empty updater signature; any failure would have blocked the route.",
    "",
    "| Polled URL | Served version | Signature bytes |",
    "|------------|----------------|-----------------|",
    ...verification.checks.map((check) => `| \`${check.url}\` | \`${check.version}\` | ${check.signatureBytes} |`),
    "",
    "## Boundary",
    "",
    "One Navigator instruction authorized the whole route; the single confirmation happened after preparation, over materialized artifacts and the authored release note. No Mirror data or app data was mutated.",
    "",
  ].join("\n");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "inherit",
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed${result.stderr ? `: ${String(result.stderr).trim()}` : ""}`);
  }
  return typeof result.stdout === "string" ? result.stdout.trim() : "";
}

function capture(command, args, options = {}) {
  return run(command, args, { ...options, stdio: "pipe" });
}

function sha256Of(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function stateFileFor(version) {
  return resolve(repositoryRoot, ".tmp", "release-deploy", `v${version}`, "state.json");
}

function loadState(version) {
  const path = stateFileFor(version);
  if (!existsSync(path)) return { version, stages: {} };
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveState(state) {
  const path = stateFileFor(state.version);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

async function runStage(state, name, execute) {
  if (state.stages[name]?.status === "done") {
    console.log(`[release-deploy] ${name}: already done, skipping`);
    return state.stages[name].detail;
  }
  console.log(`[release-deploy] ${name}: running`);
  const detail = (await execute()) ?? null;
  state.stages[name] = { status: "done", completedAt: new Date().toISOString(), detail };
  saveState(state);
  return detail;
}

function evidenceSlug(version) {
  const alpha = version.match(/-alpha\.(\d+)$/);
  return alpha ? `alpha-${alpha[1]}` : `v${version}`;
}

function deployContext(options) {
  const version = releaseVersionAt(repositoryRoot);
  const tag = `v${version}`;
  const baseUrl = assertBaseUrlAgreement(defaultBaseUrl, options.baseUrl);
  const tags = capture("git", ["tag", "--list", "v*"]).split("\n").filter(Boolean);
  const retainedVersions = deriveRetainedVersions({ version, tags });
  const build = alphaBuildPlan({ version });
  const releaseNotePath = resolve(repositoryRoot, "docs", "releases", `v${version}.md`);
  return { version, tag, baseUrl, retainedVersions, build, releaseNotePath, paths: manifestPaths({ currentVersions: retainedVersions }) };
}

function preparationActions(context) {
  return [
    "commit and push main",
    `create and push annotated tag ${context.tag} at the candidate revision`,
    `create the GitHub prerelease ${context.tag} with the DMG asset`,
    `stage and publish updater artifacts and manifests to ${context.baseUrl}`,
    "verify every polled manifest URL serves the released version (blocking)",
    "emit and commit publication evidence",
  ];
}

function requireMirrorCoordinates(options) {
  for (const flag of ["mirrorRoot", "mirrorHome", "mirrorUser"]) {
    if (!options[flag]) throw new Error(`--${flag.replace(/([A-Z])/g, "-$1").toLowerCase()} is required for the preflight gate.`);
  }
}

async function prepare(options) {
  requireMirrorCoordinates(options);
  const context = deployContext(options);
  const state = loadState(context.version);
  state.mode = "prepare";
  const noteSource = readFileSync(context.releaseNotePath, "utf8");
  const releaseNote = releaseNoteAuthorship({ version: context.version, source: noteSource, baseUrl: context.baseUrl });

  await runStage(state, "preflight", () => {
    run("npm", ["run", "alpha:preflight", "--", "--mirror-root", options.mirrorRoot, "--mirror-home", options.mirrorHome, "--mirror-user", options.mirrorUser]);
    return "ready";
  });
  await runStage(state, "npm-tests", () => { run("npm", ["test", "--", "--run"]); return "passed"; });
  await runStage(state, "frontend-build", () => { run("npm", ["run", "build"]); return "passed"; });
  await runStage(state, "cargo-tests", () => { run("cargo", ["test", "--locked"], { cwd: resolve(repositoryRoot, "src-tauri") }); return "passed"; });
  await runStage(state, "alpha-build", () => { run("npm", ["run", "alpha:build"]); return "built"; });

  const artifacts = await runStage(state, "artifact-hashes", () => [
    { name: context.build.dmg.split("/").pop(), path: context.build.dmg, sha256: sha256Of(resolve(repositoryRoot, context.build.dmg)) },
    { name: context.build.updaterArtifact.split("/").pop(), path: context.build.updaterArtifact, sha256: sha256Of(resolve(repositoryRoot, context.build.updaterArtifact)) },
  ]);
  const candidate = await runStage(state, "candidate", () => inspectReleaseCandidate({ sha256: artifacts[0].sha256 }));

  const gates = Object.fromEntries(
    ["preflight", "npm-tests", "frontend-build", "cargo-tests", "alpha-build"].map((name) => [name, state.stages[name].detail]),
  );
  const payload = confirmationPayload({
    version: context.version,
    tag: context.tag,
    revision: candidate.revision,
    baseUrl: context.baseUrl,
    manifestPaths: context.paths,
    artifacts: artifacts.map(({ name, sha256 }) => ({ name, sha256 })),
    gates,
    actions: preparationActions(context),
    releaseNote,
  });
  state.confirmation = payload;
  saveState(state);

  const date = new Date().toISOString().slice(0, 10);
  const preparationEvidencePath = `docs/update/${evidenceSlug(context.version)}-release-preparation-${date}.md`;
  writeFileSync(resolve(repositoryRoot, preparationEvidencePath), renderPreparationEvidence({ ...payload, date, manifestPaths: context.paths }));
  state.preparationEvidencePath = preparationEvidencePath;
  saveState(state);

  console.log(options.json ? JSON.stringify(payload, null, 2) : renderConfirmation(payload));
  console.log(`\nPreparation evidence: ${preparationEvidencePath}`);
  console.log("Boundary: nothing was pushed, tagged, released or published. Run `publish --yes` after Navigator confirmation.");
}

async function publish(options) {
  const context = deployContext(options);
  const state = loadState(context.version);
  if (!state.confirmation) throw new Error("No prepared confirmation exists for this version. Run prepare first.");
  if (!options.yes) {
    console.log(renderConfirmation(state.confirmation));
    console.log("\nDry run: pass --yes after Navigator confirmation to execute the publication route.");
    return;
  }
  const { revision } = state.confirmation;
  state.mode = "publish";

  await runStage(state, "commit-preparation-evidence", () => {
    if (capture("git", ["status", "--porcelain"]) !== "") {
      run("git", ["add", "-A"]);
      run("git", ["commit", "-m", `Record ${context.tag} preparation evidence`]);
    }
    return "committed";
  });
  await runStage(state, "push-main", () => { run("git", ["push", "origin", "HEAD"]); return "pushed"; });
  await runStage(state, "tag", () => {
    const existing = capture("git", ["tag", "--list", context.tag]);
    if (existing === "") run("git", ["tag", "-a", context.tag, revision, "-m", `${context.tag} — ${state.confirmation.releaseNote.title}`]);
    else if (capture("git", ["rev-parse", `${context.tag}^{commit}`]) !== revision) {
      throw new Error(`Tag ${context.tag} exists but does not target the confirmed revision ${revision}.`);
    }
    run("git", ["push", "origin", context.tag]);
    return revision;
  });
  const githubReleaseUrl = await runStage(state, "github-release", () => {
    const view = spawnSync("gh", ["release", "view", context.tag, "--json", "url", "-q", ".url"], { cwd: repositoryRoot, encoding: "utf8" });
    if (view.status === 0 && view.stdout.trim()) return view.stdout.trim();
    run("gh", ["release", "create", context.tag,
      "--prerelease", "--verify-tag",
      "--title", `${context.tag} — ${state.confirmation.releaseNote.title}`,
      "--notes-file", context.releaseNotePath,
      resolve(repositoryRoot, context.build.dmg)]);
    return capture("gh", ["release", "view", context.tag, "--json", "url", "-q", ".url"]);
  });
  await runStage(state, "endpoint-publish", () => {
    const plan = stagePrivateUpdatePublication({
      version: context.version,
      currentVersions: context.retainedVersions,
      artifact: context.build.updaterArtifact,
      signature: context.build.updaterSignature,
      dmg: context.build.dmg,
      baseUrl: context.baseUrl,
    });
    publishStagedPrivateUpdate({ ...plan, sshHost: options.sshHost ?? "szen-vps" });
    return { manifestPaths: plan.manifestPaths };
  });
  const verification = await runStage(state, "verify-endpoints", () => verifyPublishedEndpoints({
    baseUrl: context.baseUrl,
    version: context.version,
    retainedVersions: context.retainedVersions,
  }));

  const date = new Date().toISOString().slice(0, 10);
  const publicationEvidencePath = await runStage(state, "publication-evidence", () => {
    const path = `docs/update/${evidenceSlug(context.version)}-release-publication-${date}.md`;
    writeFileSync(resolve(repositoryRoot, path), renderPublicationEvidence({
      version: context.version, tag: context.tag, revision, date,
      baseUrl: context.baseUrl, verification, githubReleaseUrl,
    }));
    run("git", ["add", path]);
    run("git", ["commit", "-m", `Record ${context.tag} publication evidence`]);
    run("git", ["push", "origin", "HEAD"]);
    return path;
  });
  console.log(`\nMirror Desktop release deployment: PUBLISHED AND VERIFIED`);
  console.log(`Version: ${context.version}`);
  console.log(`Tag: ${context.tag} at ${revision}`);
  console.log(`GitHub release: ${githubReleaseUrl}`);
  console.log(`Verified polled URLs: ${verification.checks.length}`);
  console.log(`Publication evidence: ${publicationEvidencePath}`);
}

function plan(options) {
  const context = deployContext(options);
  console.log([
    "Mirror Desktop release deployment plan (dry run — nothing executes)",
    `Version: ${context.version}`,
    `Tag: ${context.tag}`,
    `Publication base URL (derived from the application updater endpoint): ${context.baseUrl}`,
    `Retained current versions (derived from tags): ${context.retainedVersions.join(", ")}`,
    `Manifest paths: ${context.paths.join(", ")}`,
    "Route: prepare (gates, build, candidate, confirmation payload) → one Navigator confirmation → publish --yes (push, tag, GitHub release, endpoint publish, blocking verification, evidence).",
  ].join("\n"));
}

function parseArguments(argv) {
  const options = { command: undefined, json: false, yes: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["plan", "prepare", "publish", "reset"].includes(arg) && !options.command) options.command = arg;
    else if (arg === "--json") options.json = true;
    else if (arg === "--yes") options.yes = true;
    else if (["--mirror-root", "--mirror-home", "--mirror-user", "--base-url", "--ssh-host"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`Unsupported release deployment argument ${arg}.`);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fail = (error) => {
    console.error(`Mirror Desktop release deployment: BLOCKED\n${error.message}`);
    process.exit(1);
  };
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.command === "prepare") await prepare(options).catch(fail);
    else if (options.command === "publish") await publish(options).catch(fail);
    else if (options.command === "reset") {
      const version = releaseVersionAt(repositoryRoot);
      writeFileSync(stateFileFor(version), `${JSON.stringify({ version, stages: {} }, null, 2)}\n`);
      console.log(`Release deployment state reset for v${version}.`);
    } else plan(options);
  } catch (error) {
    fail(error);
  }
}
