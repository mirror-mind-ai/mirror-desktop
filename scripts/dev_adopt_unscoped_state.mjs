#!/usr/bin/env node
// CV-010.DS-005 slice 3a-2: move a development app's unscoped state into one Mirror home's folder.
//
//   node scripts/dev_adopt_unscoped_state.mjs <home path> [--app-data <folder>]
//
// Before slice 3a-2, Mirror Desktop TS kept its Journey threads, Pi sessions, catalogs and outbox at
// the root of its app data folder, shared by every home. The app now reads them from
// `homes/<homeId>/` only. A 0.3 build was never published, so only a development data folder holds
// unscoped state, and this script, not the app, moves it once, naming the home it belongs to.
//
// It refuses unless every Mirror Conversation the state names is in that home's database, so state
// is never handed to a home it did not come from. All or nothing: the entries are copied into a
// hidden folder beside the target, the absolute paths recorded in their JSON files are rewritten to
// the new place, and the folder is renamed into place before the originals are removed. The default
// app data folder is the TS Dev app's.

import { randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertMarkedHome } from "../mirror-host/host.mjs";

/** The same list as `HOME_STATE_ENTRIES` in `src-tauri/src/home_state.rs`; a test compares them. */
export const HOME_STATE_ENTRIES = [
  "composer-drafts.json",
  "conversation-segments",
  "conversation-spaces",
  "dedicated-journey-conversations",
  "journey-appearance",
  "journey-preferences.json",
  "journey-registry.json",
  "journey-thread-operations",
  "journey-threads",
  "mirror-append-conflicts.jsonl",
  "mirror-append-failures.jsonl",
  "mirror-append-outbox.json",
  "mirror-append-rebinds.jsonl",
  "mirror-append-recovery-skips.jsonl",
  "pi-sessions",
  "settlement-timings",
  "turn-journal",
];

/** Every regular file under `path`; a symbolic link anywhere is refused. */
function filesUnder(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`${path} is a symbolic link`);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) throw new Error(`${path} is not a file or a folder`);
  return readdirSync(path).flatMap((name) => filesUnder(join(path, name)));
}

/** The Mirror Conversation ids the state's threads and catalogs name. */
export function namedConversationIds(appDataRoot) {
  const ids = new Set();
  for (const entry of ["journey-threads", "dedicated-journey-conversations", "conversation-spaces"]) {
    if (!existsSync(join(appDataRoot, entry))) continue;
    for (const file of filesUnder(join(appDataRoot, entry))) {
      for (const match of readFileSync(file, "utf8").matchAll(/"mirrorConversationId"\s*:\s*"([^"]+)"/g)) ids.add(match[1]);
    }
  }
  return [...ids].sort();
}

/** The ids among `ids` that the home's database does not hold. */
export async function conversationsMissingFrom(dbPath, ids) {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const statement = db.prepare("SELECT 1 FROM conversations WHERE id = ?");
    return ids.filter((id) => statement.get(id) === undefined);
  } finally {
    db.close();
  }
}

export async function adoptUnscopedState({ appDataRoot, homePath }) {
  const dbPath = join(homePath, "memory.db");
  assertMarkedHome(dbPath);
  const { homeId } = JSON.parse(readFileSync(join(homePath, ".mirror-desktop", "home.json"), "utf8"));
  const present = HOME_STATE_ENTRIES.filter((entry) => existsSync(join(appDataRoot, entry)));
  if (present.length === 0) return { homeId, adopted: [] };

  const ids = namedConversationIds(appDataRoot);
  if (ids.length === 0) throw new Error("the unscoped state names no Mirror Conversation, so whose it is cannot be told");
  const missing = await conversationsMissingFrom(dbPath, ids);
  if (missing.length > 0) throw new Error(`${homePath} does not hold the Conversations this state names: ${missing.join(", ")}`);

  const homes = join(appDataRoot, "homes");
  const target = join(homes, homeId);
  if (existsSync(target) && readdirSync(target).length > 0) throw new Error(`${target} already holds state`);
  mkdirSync(homes, { recursive: true, mode: 0o700 });
  const staging = join(homes, `.${homeId}.adopting-${randomBytes(6).toString("hex")}`);
  mkdirSync(staging, { mode: 0o700 });
  const escaped = (path) => JSON.stringify(path).slice(1, -1);
  let rewritten = 0;
  try {
    for (const entry of present) {
      filesUnder(join(appDataRoot, entry));
      cpSync(join(appDataRoot, entry), join(staging, entry), { recursive: true, errorOnExist: true, preserveTimestamps: true });
    }
    for (const file of filesUnder(staging)) {
      const text = readFileSync(file, "utf8");
      let next = text;
      for (const entry of HOME_STATE_ENTRIES) {
        next = next.split(`${escaped(appDataRoot)}/${entry}`).join(`${escaped(target)}/${entry}`);
      }
      if (next !== text) {
        writeFileSync(file, next);
        rewritten += 1;
      }
    }
    if (existsSync(target)) rmdirSync(target);
    renameSync(staging, target);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  for (const entry of present) rmSync(join(appDataRoot, entry), { recursive: true, force: true });
  return { homeId, target, adopted: present, rewritten, conversations: ids };
}

async function main(argv) {
  const homePath = argv[0];
  if (!homePath || homePath.startsWith("-")) {
    console.error("Usage: dev_adopt_unscoped_state.mjs <home path> [--app-data <folder>]");
    return 2;
  }
  const at = argv.indexOf("--app-data");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const identifier = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.dev.conf.json"), "utf8")).identifier;
  const appDataRoot = at >= 0 ? argv[at + 1] : join(homedir(), "Library", "Application Support", identifier);
  const result = await adoptUnscopedState({ appDataRoot, homePath: resolve(homePath) });
  if (result.adopted.length === 0) {
    console.log(`Nothing unscoped in ${appDataRoot}.`);
    return 0;
  }
  console.log(`Adopted into ${result.target}: ${result.adopted.join(", ")}`);
  console.log(`Rewrote paths in ${result.rewritten} file(s); Conversations checked: ${result.conversations.join(", ")}`);
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
