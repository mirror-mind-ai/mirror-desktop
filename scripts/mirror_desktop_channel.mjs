#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { loadRuntimeBinding } from "./runtime_binding_file.mjs";

const mode = process.argv[2];
const tauri = resolve("node_modules", ".bin", process.platform === "win32" ? "tauri.cmd" : "tauri");
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
