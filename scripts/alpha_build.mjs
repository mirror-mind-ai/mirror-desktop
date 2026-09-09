#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { releaseVersionAt } from "./release_candidate.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultAlphaConfig = "src-tauri/tauri.alpha-update.conf.json";
const defaultSigningKey = `${process.env.HOME}/.mirror-desktop-updater/alpha/updater.key`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "inherit",
    env: options.env ?? process.env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

export function alphaBuildPlan({ version = releaseVersionAt(repositoryRoot), config = defaultAlphaConfig, signingKey = defaultSigningKey } = {}) {
  const normalizedVersion = String(version).replace(/^v/, "");
  return {
    version: normalizedVersion,
    config,
    signingKey,
    app: "src-tauri/target/release/bundle/macos/Mirror Desktop.app",
    dmg: `src-tauri/target/release/bundle/dmg/Mirror Desktop_${normalizedVersion}_x64.dmg`,
    updaterArtifact: "src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz",
    updaterSignature: "src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig",
    boundaries: {
      publishesRelease: false,
      createsGitTag: false,
      pushesGit: false,
      notarizes: false,
      mutatesMirrorData: false,
      mutatesAppData: false,
    },
  };
}

export function validateAlphaBuildInputs(plan) {
  if (!existsSync(resolve(repositoryRoot, plan.config))) throw new Error(`Alpha updater config is unavailable at ${plan.config}`);
  if (!existsSync(plan.signingKey)) throw new Error(`Alpha updater signing key is unavailable at ${plan.signingKey}`);
}

export function validateAlphaBuildOutputs(plan) {
  for (const [label, path] of Object.entries({ app: plan.app, dmg: plan.dmg, updaterArtifact: plan.updaterArtifact, updaterSignature: plan.updaterSignature })) {
    if (!existsSync(resolve(repositoryRoot, path))) throw new Error(`Expected ${label} output is unavailable at ${path}`);
  }
}

function parseArguments(argv) {
  const args = { json: false, dryRun: false, config: defaultAlphaConfig, signingKey: defaultSigningKey };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") args.json = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (["--config", "--signing-key"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      args[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`Unsupported alpha build argument ${arg}.`);
  }
  return args;
}

function human(plan, dryRun) {
  return [
    `Mirror Desktop alpha build: ${dryRun ? "READY" : "BUILT"}`,
    `Version: ${plan.version}`,
    `Config: ${plan.config}`,
    `DMG: ${plan.dmg}`,
    `Updater artifact: ${plan.updaterArtifact}`,
    `Updater signature: ${plan.updaterSignature}`,
    "Boundary: local build only; no Git tag, GitHub Release, notarization, push, publication, Mirror data or app data mutation is implied.",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const plan = alphaBuildPlan(options);
    validateAlphaBuildInputs(plan);
    if (!options.dryRun) {
      const signingKey = readFileSync(plan.signingKey, "utf8");
      run("npm", ["run", "alpha:channel:check"]);
      run("npm", ["run", "tauri", "--", "build", "--bundles", "app,dmg", "--config", plan.config], {
        env: {
          ...process.env,
          TAURI_SIGNING_PRIVATE_KEY: signingKey,
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "",
        },
      });
      validateAlphaBuildOutputs(plan);
    }
    console.log(options.json ? JSON.stringify({ ...plan, dryRun: options.dryRun }, null, 2) : human(plan, options.dryRun));
  } catch (error) {
    console.error(`Mirror Desktop alpha build: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
