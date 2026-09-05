#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import process from "node:process";

const mode = process.argv[2];
const tauri = resolve("node_modules", ".bin", process.platform === "win32" ? "tauri.cmd" : "tauri");
const home = homedir();
const inheritedMirrorEnvironment = ["MIRROR_HOME", "MIRROR_USER", "DB_PATH"];

const channels = {
  user: {
    channel: "user",
    identifier: "ai.mirrormind.desktop",
    args: ["dev"],
    bundle: "Mirror Desktop.app",
  },
  dev: {
    channel: "development",
    identifier: "ai.mirrormind.desktop.dev",
    args: ["dev", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    bundle: "Mirror Desktop Dev.app",
  },
  "build-dev": {
    channel: "development",
    identifier: "ai.mirrormind.desktop.dev",
    args: ["build", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    bundle: "Mirror Desktop Dev.app",
  },
  "build-user": {
    channel: "user",
    identifier: "ai.mirrormind.desktop",
    args: ["build"],
    bundle: "Mirror Desktop.app",
  },
  "import-user": {
    channel: "user",
    identifier: "ai.mirrormind.desktop",
    args: [],
    bundle: "Mirror Desktop.app",
  },
  "import-dev": {
    channel: "development",
    identifier: "ai.mirrormind.desktop.dev",
    args: [],
    bundle: "Mirror Desktop Dev.app",
  },
};

function appDataRoot(profile) {
  if (process.platform !== "darwin") {
    throw new Error("Portable runtime binding launch currently supports macOS only.");
  }
  return resolve(home, "Library", "Application Support", profile.identifier);
}

function loadRuntimeBinding(profile) {
  const path = resolve(appDataRoot(profile), "runtime-binding.v1.json");
  if (!existsSync(path)) throw new Error(`Runtime binding is unavailable at ${path}. Configure it in Mirror Desktop Runtime Settings.`);
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || !metadata.isFile() || realpathSync(path) !== path) {
    throw new Error("Runtime binding is not a safe canonical file.");
  }
  const binding = JSON.parse(readFileSync(path, "utf8"));
  const keys = Object.keys(binding).sort();
  const expected = ["channel", "dbPath", "mirrorHome", "mirrorRoot", "mirrorUser", "schemaVersion"].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)
    || binding.schemaVersion !== "1.0.0"
    || binding.channel !== profile.channel
    || ![binding.mirrorRoot, binding.mirrorHome, binding.dbPath].every((value) => typeof value === "string" && isAbsolute(value))
    || typeof binding.mirrorUser !== "string" || !binding.mirrorUser) {
    throw new Error("Runtime binding does not match the selected desktop channel.");
  }
  return binding;
}

function cleanLaunchEnvironment(extra = {}) {
  const environment = { ...process.env };
  for (const name of inheritedMirrorEnvironment) delete environment[name];
  return { ...environment, ...extra };
}

function runBootstrap(profile) {
  const binding = loadRuntimeBinding(profile);
  const environment = cleanLaunchEnvironment({
    MIRROR_HOME: binding.mirrorHome,
    MIRROR_USER: binding.mirrorUser,
    DB_PATH: binding.dbPath,
  });
  const bootstrap = spawnSync("python3", [
    "scripts/export_mirror_bootstrap.py",
    "--mirror-root", binding.mirrorRoot,
    "--app-identifier", profile.identifier,
  ], { cwd: process.cwd(), env: environment, stdio: "inherit" });
  if (bootstrap.error || bootstrap.status !== 0) {
    console.error(bootstrap.error?.message ?? "Could not initialize the canonical Journey registry.");
    process.exit(bootstrap.status ?? 1);
  }
}

function launchDesktopValidation() {
  if (process.platform !== "darwin") {
    console.error("Source-built desktop validation launch currently supports macOS only.");
    process.exit(2);
  }
  const profiles = [channels["import-user"], channels["import-dev"]];
  for (const profile of profiles) runBootstrap(profile);
  for (const profile of profiles) {
    const bundle = resolve("src-tauri", "target", "release", "bundle", "macos", profile.bundle);
    if (!existsSync(bundle)) {
      console.error(`Built bundle is unavailable at ${bundle}. Build both channels before validation.`);
      process.exit(1);
    }
    const launch = spawnSync("open", ["-n", bundle], {
      cwd: process.cwd(), env: cleanLaunchEnvironment(), stdio: "inherit",
    });
    if (launch.error || launch.status !== 0) {
      console.error(launch.error?.message ?? `Could not launch ${profile.bundle}.`);
      process.exit(launch.status ?? 1);
    }
  }
}

if (mode === "validate-desktop") {
  launchDesktopValidation();
  process.exit(0);
}
const selected = channels[mode];
if (!selected) {
  console.error("Usage: node scripts/mirror_desktop_channel.mjs <user|dev|build-dev|build-user|import-user|import-dev|validate-desktop>");
  process.exit(2);
}
if (mode === "import-user" || mode === "import-dev") {
  runBootstrap(selected);
  process.exit(0);
}
const result = spawnSync(tauri, [...selected.args, ...process.argv.slice(3)], {
  cwd: process.cwd(), env: cleanLaunchEnvironment(), stdio: "inherit",
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
