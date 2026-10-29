#!/usr/bin/env node
// CV-010.DS-005 phase 2, slice 2c: create a development 0.3 home.
//
//   node scripts/dev_ts_home.mjs <absolute path> [--user <name>] [--bind]
//
// The home is created through the laid-out Mirror host (`scripts/mirror_host_pin.mjs materialize`),
// so it is made by the pinned core, and marked by the host before it appears (slice 3a, the same
// call the app makes): `.mirror-desktop/home.json`, 0600 in a 0700 directory, holding exactly
// `{line: "0.3", homeId, createdAt}`. The host and the supervisor open no home without it
// (condition b of the 0.3 line).
//
// It refuses, before creating anything:
//   - a path under `~/.mirror-minds`, where the Python homes live, production among them;
//   - an existing path, a relative path, a missing parent, and a parent reached through a symlink.
//
// `--bind` writes `runtime-home.v2.json` (`{schemaVersion: "2.0.0", homePath}`) into the TS Dev
// app's data folder, refusing to overwrite one. The app reads it from slice 2d. It never writes the
// Python binding file.

import { spawn } from "node:child_process";
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { assertMarkedHome } from "../mirror-host/host.mjs";
import { hostPlatform } from "./mirror_host_pin.mjs";

export const HOME_BINDING_FILE_NAME = "runtime-home.v2.json";

function present(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Why `homePath` may not become a development home, or null. `home` is the user's home folder. */
export function targetProblem(homePath, home = homedir()) {
  if (typeof homePath !== "string" || !isAbsolute(homePath)) return "the home path must be absolute";
  const minds = join(home, ".mirror-minds");
  const realMinds = existsSync(minds) ? realpathSync(minds) : minds;
  const under = (path) => [minds, realMinds].some((root) => path === root || path.startsWith(`${root}/`));
  if (under(resolve(homePath))) return `${homePath} is under ~/.mirror-minds, where the Python homes live`;
  if (present(homePath)) return `${homePath} already exists`;
  const parent = dirname(homePath);
  if (!existsSync(parent)) return `the parent ${parent} does not exist; create it first: mkdir -p ${parent}`;
  const realParent = realpathSync(parent);
  if (realParent !== parent) return `the parent ${parent} passes through a symlink`;
  if (under(join(realParent, basename(homePath)))) return `${homePath} resolves under ~/.mirror-minds`;
  return null;
}

/** Start the laid-out host and return a request function. */
function startHost(runtimeDir, nodeBin) {
  const child = spawn(nodeBin, [join(runtimeDir, "host.mjs")], { cwd: runtimeDir, env: {}, stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const pending = [];
  lines.on("line", (line) => pending.shift()?.(line));
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const next = () => new Promise((resolveLine, reject) => {
    const timer = setTimeout(() => reject(new Error(`the Mirror host did not answer; stderr: ${stderr}`)), 60_000);
    pending.push((line) => { clearTimeout(timer); resolveLine(JSON.parse(line)); });
  });
  let id = 0;
  return {
    handshake: next(),
    async call(method, params) {
      id += 1;
      const answer = next();
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
      const response = await answer;
      if (!response.ok) throw new Error(`${method}: ${response.error.name} ${response.error.reason}: ${response.error.message}`);
      return response.result;
    },
    close: () => new Promise((resolveExit) => { child.on("close", resolveExit); child.stdin.end(); }),
  };
}

export async function createMarkedHome({ homePath, userName, runtimeDir, nodeBin, home = homedir() }) {
  const problem = targetProblem(homePath, home);
  if (problem) throw new Error(problem);
  const host = startHost(runtimeDir, nodeBin);
  try {
    const handshake = await host.handshake;
    if (handshake.type !== "ready") throw new Error("the Mirror host did not complete its handshake");
    const created = await host.call("createMarkedHome", { request: { homePath, userName } });
    const { homeId } = created;
    const report = await host.call("inspectMigrationState", { dbPath: created.dbPath });
    if (report.state !== "current") throw new Error(`the created home reads as ${report.state}`);
    return { homePath: created.homePath, dbPath: created.dbPath, homeId, state: report.state, coreVersion: handshake.coreVersion };
  } finally {
    await host.close();
  }
}

/** Bind an app's data folder to a marked home, never overwriting a binding. */
export function bindHome({ homePath, appDataRoot }) {
  try {
    assertMarkedHome(join(homePath, "memory.db"));
  } catch (error) {
    throw new Error(`${homePath} is not a marked 0.3 home: ${error.message}`);
  }
  const target = join(appDataRoot, HOME_BINDING_FILE_NAME);
  if (present(target)) throw new Error(`${target} already exists`);
  mkdirSync(appDataRoot, { recursive: true, mode: 0o700 });
  const staging = `${target}.${process.pid}.staging`;
  writeFileSync(staging, `${JSON.stringify({ schemaVersion: "2.0.0", homePath }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  try {
    linkSync(staging, target);
  } finally {
    rmSync(staging, { force: true });
  }
  return target;
}

async function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const homePath = argv[0];
  if (!homePath || homePath.startsWith("-")) {
    console.error("Usage: dev_ts_home.mjs <absolute path> [--user <name>] [--bind]");
    return 2;
  }
  const at = argv.indexOf("--user");
  const userName = at >= 0 ? argv[at + 1] : basename(homePath);
  const runtimeDir = join(root, ".mirror-host", "runtime", hostPlatform());
  if (!existsSync(join(runtimeDir, "host.mjs"))) {
    console.error(`No Mirror host runtime at ${runtimeDir}. Run: node scripts/mirror_host_pin.mjs materialize`);
    return 1;
  }
  const created = await createMarkedHome({ homePath, userName, runtimeDir, nodeBin: join(runtimeDir, "node", "bin", "node") });
  console.log(`0.3 home: ${created.homePath} (${created.state}, core ${created.coreVersion}, ${created.homeId})`);
  if (argv.includes("--bind")) {
    const identifier = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.dev.conf.json"), "utf8")).identifier;
    console.log(`Bound: ${bindHome({ homePath: created.homePath, appDataRoot: join(homedir(), "Library", "Application Support", identifier) })}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
