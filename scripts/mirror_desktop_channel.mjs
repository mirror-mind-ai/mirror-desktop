#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { prepareBundledBuild } from "./mirror_host_pin.mjs";

const mode = process.argv[2];
const tauri = resolve("node_modules", ".bin", process.platform === "win32" ? "tauri.cmd" : "tauri");
const inheritedMirrorEnvironment = ["MIRROR_HOME", "MIRROR_USER", "DB_PATH"];
const inheritedSigningEnvironment = ["TAURI_SIGNING_PRIVATE_KEY", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"];
const defaultUserSigningKey = resolve(process.env.HOME ?? "", ".mirror-desktop-updater", "alpha", "updater.key");

const channels = {
  user: {
    channel: "user",
    identifier: "ai.mirrormind.desktop.ts",
    args: ["dev", "--config", "src-tauri/tauri.ts-update.conf.json"],
    bundle: "Mirror Desktop TS.app",
  },
  dev: {
    channel: "development",
    identifier: "ai.mirrormind.desktop.ts.dev",
    args: ["dev", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    bundle: "Mirror Desktop TS Dev.app",
  },
  "build-dev": {
    channel: "development",
    identifier: "ai.mirrormind.desktop.ts.dev",
    args: ["build", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    bundle: "Mirror Desktop TS Dev.app",
  },
  "build-user": {
    channel: "user",
    identifier: "ai.mirrormind.desktop.ts",
    args: ["build", "--config", "src-tauri/tauri.ts-update.conf.json"],
    bundle: "Mirror Desktop TS.app",
    requiresUpdaterSigning: true,
  },
  "build-eval": {
    channel: "evaluation",
    identifier: "ai.mirrormind.desktop.ts",
    args: ["build", "--config", "src-tauri/tauri.eval.conf.json", "--features", "evaluation-channel"],
    bundle: "Mirror Desktop TS Eval.app",
  },
  "install-eval": {
    channel: "evaluation",
    identifier: "ai.mirrormind.desktop.ts",
    args: ["build", "--config", "src-tauri/tauri.eval.conf.json", "--features", "evaluation-channel"],
    bundle: "Mirror Desktop TS Eval.app",
    installsEvaluationBundle: true,
  },
};

function cleanLaunchEnvironment(extra = {}) {
  const environment = { ...process.env };
  for (const name of [...inheritedMirrorEnvironment, ...inheritedSigningEnvironment]) delete environment[name];
  return { ...environment, ...extra };
}

function userBuildEnvironment() {
  const signingKey = process.env.MIRROR_DESKTOP_UPDATER_SIGNING_KEY || defaultUserSigningKey;
  if (!existsSync(signingKey)) {
    console.error(`User-channel build requires the trusted updater signing key at ${signingKey}. Use npm run tauri:build:dev for unsigned local validation.`);
    process.exit(2);
  }
  return cleanLaunchEnvironment({
    TAURI_SIGNING_PRIVATE_KEY: readFileSync(signingKey, "utf8"),
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "",
  });
}

function installEvaluationBundle(profile) {
  if (process.platform !== "darwin") {
    console.error("Mirror Desktop TS Eval installation currently supports macOS only.");
    process.exit(2);
  }
  const source = resolve("src-tauri", "target", "release", "bundle", "macos", profile.bundle);
  const destination = resolve(process.env.HOME ?? "", "Applications", "Mirror Desktop TS Eval.app");
  if (!existsSync(source)) {
    console.error(`Built evaluation bundle is unavailable at ${source}.`);
    process.exit(1);
  }
  const plist = resolve(source, "Contents", "Info.plist");
  const identifier = spawnSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", plist], { encoding: "utf8" });
  const name = spawnSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleName", plist], { encoding: "utf8" });
  if (identifier.status !== 0 || identifier.stdout.trim() !== "ai.mirrormind.desktop.ts"
    || name.status !== 0 || name.stdout.trim() !== "Mirror Desktop TS Eval") {
    console.error("Built evaluation bundle identity is invalid.");
    process.exit(1);
  }
  mkdirSync(resolve(process.env.HOME ?? "", "Applications"), { recursive: true });
  const staged = `${destination}.installing-${process.pid}`;
  const backup = `${destination}.backup-${process.pid}`;
  rmSync(staged, { recursive: true, force: true });
  rmSync(backup, { recursive: true, force: true });
  cpSync(source, staged, { recursive: true, dereference: false });
  let replaced = false;
  try {
    if (existsSync(destination)) {
      renameSync(destination, backup);
      replaced = true;
    }
    renameSync(staged, destination);
    rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    rmSync(staged, { recursive: true, force: true });
    if (replaced && !existsSync(destination) && existsSync(backup)) renameSync(backup, destination);
    throw error;
  }
  console.log(`Installed Mirror Desktop TS Eval at ${destination}. It was not launched.`);
}

function launchDesktopValidation() {
  if (process.platform !== "darwin") {
    console.error("Source-built desktop validation launch currently supports macOS only.");
    process.exit(2);
  }
  // CV-010.DS-005 slice 2f-2: no Python import before launch; each app binds its own 0.3 home.
  const profiles = [channels["build-user"], channels["build-dev"]];
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
  console.error("Usage: node scripts/mirror_desktop_channel.mjs <user|dev|build-dev|build-user|build-eval|install-eval|validate-desktop>");
  process.exit(2);
}
// A user build without its signing key is refused first, before the runtime is copied for bundling.
const launchEnvironment = selected.requiresUpdaterSigning ? userBuildEnvironment() : cleanLaunchEnvironment();
// CV-010.DS-005 slice 2f: every packaged build carries the pinned Mirror host runtime; dev runs the
// repository's materialized one.
let bundledRuntime = [];
if (selected.args[0] === "build") {
  try {
    bundledRuntime = prepareBundledBuild(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  } catch (error) {
    console.error(`The Mirror host runtime cannot be bundled: ${error.message}`);
    process.exit(1);
  }
}
const result = spawnSync(tauri, [...selected.args, ...bundledRuntime, ...process.argv.slice(3)], {
  cwd: process.cwd(),
  env: launchEnvironment,
  stdio: "inherit",
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
if (selected.installsEvaluationBundle) installEvaluationBundle(selected);
process.exit(0);
