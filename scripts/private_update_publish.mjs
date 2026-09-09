#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { parseSemver } from "./release_candidate.mjs";
import { releaseNotesUrl } from "./release_notes.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBaseUrl = "https://updates.mirrormind.sh/mirror-desktop";
const defaultWebRoot = "/var/www/mirror-desktop-updates/mirror-desktop";
const defaultTargets = ["darwin", "darwin-x86_64", "darwin-aarch64"];

function requireFile(path, label) {
  if (!existsSync(path)) throw new Error(`${label} is unavailable at ${path}`);
  return path;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: "utf8", stdio: options.stdio ?? "pipe" });
  if (result.error || result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`${command} ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

export function updaterArtifactName(version) {
  return `Mirror Desktop_${parseSemver(version)}.app.tar.gz`;
}

export function updaterArtifactUrl(version, baseUrl = defaultBaseUrl) {
  return `${baseUrl.replace(/\/$/, "")}/artifacts/${encodeURIComponent(updaterArtifactName(version))}`;
}

export function latestMacosDmgUrl(baseUrl = defaultBaseUrl) {
  return `${baseUrl.replace(/\/$/, "")}/downloads/macos/mirror-desktop-latest.dmg`;
}

export function latestMacosDownloadManifestUrl(baseUrl = defaultBaseUrl) {
  return `${baseUrl.replace(/\/$/, "")}/downloads/macos/latest.json`;
}

export function manifestFor({ version, signature, baseUrl = defaultBaseUrl, pubDate = new Date().toISOString() }) {
  parseSemver(version);
  if (!signature?.trim()) throw new Error("Updater signature is required.");
  return {
    version,
    notes: releaseNotesUrl(`v${version}`, `${baseUrl.replace(/\/$/, "")}/releases`),
    pub_date: pubDate,
    url: updaterArtifactUrl(version, baseUrl),
    signature: signature.trim(),
  };
}

export function manifestPaths({ targets = defaultTargets, currentVersions }) {
  if (!Array.isArray(currentVersions) || currentVersions.length === 0) throw new Error("At least one current version is required.");
  return targets.flatMap((target) => currentVersions.map((currentVersion) => `${target}/${parseSemver(currentVersion)}/latest.json`));
}

export function webRootForBaseUrl(baseUrl = defaultBaseUrl, rootWebRoot = defaultWebRoot) {
  const url = new URL(baseUrl);
  const marker = "/mirror-desktop";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) throw new Error("Private update base URL must include /mirror-desktop.");
  const suffix = url.pathname.slice(markerIndex + marker.length).replace(/^\/+|\/+$/g, "");
  return suffix ? `${rootWebRoot.replace(/\/$/, "")}/${suffix}` : rootWebRoot.replace(/\/$/, "");
}

export function planPrivateUpdatePublication({ version, currentVersions, targets = defaultTargets, baseUrl = defaultBaseUrl, webRoot }) {
  const releaseVersion = parseSemver(version);
  return {
    version: releaseVersion,
    baseUrl: baseUrl.replace(/\/$/, ""),
    artifactName: updaterArtifactName(releaseVersion),
    artifactUrl: updaterArtifactUrl(releaseVersion, baseUrl),
    releaseNotesUrl: releaseNotesUrl(`v${releaseVersion}`, `${baseUrl.replace(/\/$/, "")}/releases`),
    latestMacosDmgUrl: latestMacosDmgUrl(baseUrl),
    latestMacosDownloadManifestUrl: latestMacosDownloadManifestUrl(baseUrl),
    manifestPaths: manifestPaths({ targets, currentVersions }),
    webRoot: webRoot ?? webRootForBaseUrl(baseUrl),
    boundaries: {
      privateEndpointOnly: true,
      gitTagCreated: false,
      githubReleaseCreated: false,
      notarizationClaimed: false,
      mirrorDataMutated: false,
    },
  };
}

function parseArguments(argv) {
  const args = {
    version: undefined,
    currentVersions: [],
    targets: [...defaultTargets],
    baseUrl: defaultBaseUrl,
    stageDir: undefined,
    publish: false,
    sshHost: "szen-vps",
    webRoot: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--publish") args.publish = true;
    else if (arg === "--json") args.json = true;
    else if (["--version", "--artifact", "--signature", "--dmg", "--release-note", "--release-index", "--current-version", "--target", "--base-url", "--stage-dir", "--ssh-host", "--web-root"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      if (arg === "--current-version") args.currentVersions.push(value);
      else if (arg === "--target") {
        if (args.targets.join("\0") === defaultTargets.join("\0")) args.targets = [];
        args.targets.push(value);
      } else args[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`Unsupported private update publication argument ${arg}.`);
  }
  return args;
}

export function stagePrivateUpdatePublication(options) {
  const version = parseSemver(options.version);
  const stageDir = resolve(repositoryRoot, options.stageDir ?? `.tmp/private-update-publication/v${version}`);
  const signature = readFileSync(requireFile(resolve(repositoryRoot, options.signature), "Updater signature"), "utf8");
  const manifest = manifestFor({ version, signature, baseUrl: options.baseUrl, pubDate: options.pubDate });
  const plan = planPrivateUpdatePublication({ version, currentVersions: options.currentVersions, targets: options.targets, baseUrl: options.baseUrl, webRoot: options.webRoot });

  const artifactsDir = resolve(stageDir, "artifacts");
  const releasesDir = resolve(stageDir, "releases");
  const manifestsDir = resolve(stageDir, "manifests");
  const downloadsDir = resolve(stageDir, "downloads", "macos");
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(releasesDir, { recursive: true });
  mkdirSync(manifestsDir, { recursive: true });
  mkdirSync(downloadsDir, { recursive: true });

  copyFileSync(requireFile(resolve(repositoryRoot, options.artifact), "Updater artifact"), resolve(artifactsDir, plan.artifactName));
  copyFileSync(resolve(repositoryRoot, options.signature), resolve(artifactsDir, `${plan.artifactName}.sig`));
  if (options.dmg) {
    const dmgArtifactName = basename(options.dmg);
    copyFileSync(requireFile(resolve(repositoryRoot, options.dmg), "DMG artifact"), resolve(artifactsDir, dmgArtifactName));
    copyFileSync(requireFile(resolve(repositoryRoot, options.dmg), "DMG artifact"), resolve(downloadsDir, "mirror-desktop-latest.dmg"));
    writeFileSync(resolve(downloadsDir, "latest.json"), `${JSON.stringify({
      version,
      dmg: plan.latestMacosDmgUrl,
      artifact: `${plan.baseUrl}/artifacts/${encodeURIComponent(dmgArtifactName)}`,
      releaseNotes: plan.releaseNotesUrl,
    }, null, 2)}\n`);
  }
  copyFileSync(requireFile(resolve(repositoryRoot, options.releaseNote ?? `docs/releases/v${version}.md`), "Release note"), resolve(releasesDir, `v${version}.md`));
  copyFileSync(requireFile(resolve(repositoryRoot, options.releaseIndex ?? "docs/releases/index.md"), "Release index"), resolve(releasesDir, "index.md"));

  const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(resolve(manifestsDir, "latest.json"), manifestSource);
  for (const path of plan.manifestPaths) {
    const destination = resolve(manifestsDir, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, manifestSource);
  }
  return { ...plan, stageDir };
}

export function publishStagedPrivateUpdate({ stageDir, sshHost = "szen-vps", webRoot = defaultWebRoot, manifestPaths }) {
  const downloadsDir = resolve(stageDir, "downloads", "macos");
  const remoteDirs = ["artifacts", "releases", "downloads/macos", ...manifestPaths.map((path) => dirname(path))].map((path) => `${webRoot}/${path}`);
  run("ssh", [sshHost, `set -e; sudo mkdir -p ${remoteDirs.map(shellQuote).join(" ")}; sudo chown -R $USER:$USER ${shellQuote(webRoot)}`], { stdio: "inherit" });
  run("bash", ["-lc", `scp ${shellQuote(resolve(stageDir, "artifacts"))}/* ${shellQuote(`${sshHost}:${webRoot}/artifacts/`)}`], { stdio: "inherit" });
  run("bash", ["-lc", `scp ${shellQuote(resolve(stageDir, "releases"))}/* ${shellQuote(`${sshHost}:${webRoot}/releases/`)}`], { stdio: "inherit" });
  if (existsSync(resolve(downloadsDir, "mirror-desktop-latest.dmg"))) {
    run("bash", ["-lc", `scp ${shellQuote(downloadsDir)}/* ${shellQuote(`${sshHost}:${webRoot}/downloads/macos/`)}`], { stdio: "inherit" });
  }
  for (const path of manifestPaths) {
    run("scp", [resolve(stageDir, "manifests", path), `${sshHost}:${webRoot}/${path}`], { stdio: "inherit" });
  }
  run("ssh", [sshHost, `set -e; sudo find ${shellQuote(webRoot)} -type d -exec chmod 755 {} +; sudo find ${shellQuote(webRoot)} -type f -exec chmod 644 {} +`], { stdio: "inherit" });
}

function human(plan, published) {
  return [
    `Mirror Desktop private update publication: ${published ? "PUBLISHED" : "STAGED"}`,
    `Version: ${plan.version}`,
    `Stage: ${plan.stageDir}`,
    `Artifact: ${plan.artifactUrl}`,
    `Release notes: ${plan.releaseNotesUrl}`,
    `Latest macOS DMG: ${plan.latestMacosDmgUrl}`,
    `Manifest paths: ${plan.manifestPaths.join(", ")}`,
    `Web root: ${plan.webRoot}`,
    "Boundary: private endpoint only; no Git tag, GitHub Release, notarization, push, Mirror data or app data mutation is implied.",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (!options.version) throw new Error("--version is required.");
    const plan = stagePrivateUpdatePublication(options);
    if (options.publish) publishStagedPrivateUpdate({ ...plan, sshHost: options.sshHost, webRoot: options.webRoot ?? plan.webRoot });
    console.log(options.json ? JSON.stringify({ ...plan, published: options.publish }, null, 2) : human(plan, options.publish));
  } catch (error) {
    console.error(`Mirror Desktop private update publication: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
