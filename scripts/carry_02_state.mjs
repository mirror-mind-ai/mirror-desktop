#!/usr/bin/env node
// CV-010.DS-005 slice 5a-2: the 0.2 conversation surface continues in 0.3.
//
//   node scripts/carry_02_state.mjs <home path> [--from <0.2 app data>] [--recorded-as <folder>] [--to <0.3 app data>] [--write]
//
// After 5a adopts the production home, this copies the 0.2 app's per-Journey state (threads, Pi
// sessions, segments, catalogs) into that home's folder in the 0.3 app, so each Journey opens on its
// own exchanges and continues them. Run by hand with both apps closed. Without --write it only says
// what it would do.
//
// The 0.2 folder is never written, so 0.2 keeps working through the window back. All or nothing:
// everything is validated first, then staged beside the target and swapped in by rename. Only the
// structural `piSessionFile` and `sessionFile` values that point into the 0.2 `pi-sessions` folder
// are rewritten; the same path inside a tool's arguments or output is what the agent did and said,
// and is left alone. Pi's own session files keep every line but their header, whose `cwd` moves to
// the bound home: Pi takes a resumed session's working folder from that header, so a carried session
// would otherwise run its tools and load its instructions where 0.2 ran (the Python checkout).
//
// 0.2's model choices (agent-settings.json) are app-wide in both lines. They are merged into the 0.3
// app's settings: the 0.2 global profile and every override 0.2 names win; 0.3 overrides 0.2 does
// not name stay. What 0.3 held before is kept beside the receipt.
//
// --from may be a snapshot of the 0.2 folder (a clone taken while 0.2 runs); --recorded-as then names
// the folder its records were written in. If there are sessions to carry and no record would move,
// the carry refuses, since the records would keep pointing into the 0.2 folder.

import { randomBytes } from "node:crypto";
import { accessSync, constants, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertMarkedHome } from "../mirror-host/host.mjs";
import { conversationsMissingFrom, HOME_STATE_ENTRIES, namedConversationIds } from "./dev_adopt_unscoped_state.mjs";

/** Every per-home entry but the Journey registry, a cache 0.3 rebuilds from Mirror. */
export const CARRIED_ENTRIES = HOME_STATE_ENTRIES.filter((entry) => entry !== "journey-registry.json");

/** Entries whose presence in the target means a Journey has already been used in 0.3. */
const CONVERSATION_ENTRIES = ["conversation-segments", "dedicated-journey-conversations", "journey-threads", "pi-sessions"];
const RECEIPT = "carried-from-0.2.json";
const PATH_KEYS = new Set(["piSessionFile", "sessionFile"]);
const SETTINGS = "agent-settings.json";
const SETTINGS_BEFORE = "agent-settings-before-carry.json";
const SETTINGS_KEYS = ["schemaVersion", "globalProfile", "journeyOverrides", "conversationOverrides"];
const OVERRIDES = ["journeyOverrides", "conversationOverrides"];

/** Every regular file under `path`; a symbolic link anywhere is refused. */
function filesUnder(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`${path} is a symbolic link`);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) throw new Error(`${path} is not a file or a folder`);
  return readdirSync(path).sort().flatMap((name) => filesUnder(join(path, name)));
}

/** Whether a carried file is parsed for session paths; Pi's own transcripts never are. */
function structural(sourceRoot, file) {
  return !relative(sourceRoot, file).startsWith("pi-sessions/") && /\.jsonl?$/.test(file);
}

/** The file's text with its session paths moved, or undefined when it has none to move. */
function rewritten(file, recordedRoot, target, counts) {
  const text = readFileSync(file, "utf8");
  const from = `${recordedRoot}/pi-sessions/`;
  const to = `${target}/pi-sessions/`;
  let values = 0;
  const move = (value) => {
    if (Array.isArray(value)) return value.map(move);
    if (value === null || typeof value !== "object") return value;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (PATH_KEYS.has(key) && typeof item === "string" && item.startsWith(`${recordedRoot}/`)) {
        if (!item.startsWith(from)) throw new Error(`${file}: ${key} names a file outside pi-sessions: ${item}`);
        next[key] = to + item.slice(from.length);
        values += 1;
      } else {
        next[key] = move(item);
      }
    }
    return next;
  };
  const parse = (source) => {
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new Error(`${file} is not valid JSON: ${error.message}`);
    }
  };
  let next;
  if (file.endsWith(".jsonl")) {
    const lines = text.split("\n");
    next = lines.map((line) => (line.trim() ? JSON.stringify(move(parse(line))) : line)).join("\n");
  } else {
    const indent = /^[[{]\r?\n( +|\t)/.exec(text)?.[1];
    next = JSON.stringify(move(parse(text)), null, indent) + (text.endsWith("\n") ? "\n" : "");
  }
  if (values === 0) return undefined;
  counts.files += 1;
  counts.values += values;
  return next;
}

/** A Pi session's text with its header naming `cwd`, or undefined when it has no header to move. */
function movedHeader(file, cwd) {
  const text = readFileSync(file, "utf8");
  const end = text.indexOf("\n");
  const first = end === -1 ? text : text.slice(0, end);
  let header;
  try {
    header = JSON.parse(first);
  } catch {
    return undefined;
  }
  if (header?.type !== "session" || typeof header.cwd !== "string" || header.cwd === cwd) return undefined;
  return JSON.stringify({ ...header, cwd }) + (end === -1 ? "" : text.slice(end));
}

const piSession = (sourceRoot, file) => relative(sourceRoot, file).startsWith("pi-sessions/") && file.endsWith(".jsonl");

/** Agent settings read as the app reads them, or undefined when there are none. */
function readSettings(path) {
  if (!existsSync(path)) return undefined;
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
  const object = (item) => item !== null && typeof item === "object" && !Array.isArray(item);
  if (!object(value) || Object.keys(value).some((key) => !SETTINGS_KEYS.includes(key))
    || !["1.0.0", "1.1.0"].includes(value.schemaVersion) || !object(value.globalProfile)
    || OVERRIDES.some((key) => value[key] !== undefined && !object(value[key]))) {
    throw new Error(`${path} is not agent settings this app can read`);
  }
  return value;
}

/** 0.3's settings with 0.2's choices laid over them, and what the merge did. */
function mergedSettings(source, target) {
  if (source === undefined) return undefined;
  const merged = {
    schemaVersion: [source.schemaVersion, target?.schemaVersion ?? "1.0.0"].sort().at(-1),
    globalProfile: source.globalProfile,
  };
  let replaced = 0;
  for (const key of OVERRIDES) {
    const before = target?.[key] ?? {};
    const carried = source[key] ?? {};
    for (const [name, value] of Object.entries(carried)) {
      if (name in before && JSON.stringify(before[name]) !== JSON.stringify(value)) replaced += 1;
    }
    merged[key] = { ...before, ...carried };
  }
  const summary = {
    journeys: Object.keys(source.journeyOverrides ?? {}).length,
    conversations: Object.keys(source.conversationOverrides ?? {}).length,
    replaced,
  };
  return { merged, summary };
}

function outboxItems(sourceRoot) {
  const path = join(sourceRoot, "mirror-append-outbox.json");
  if (!existsSync(path)) return 0;
  const items = JSON.parse(readFileSync(path, "utf8")).items;
  if (!Array.isArray(items)) throw new Error(`${path} has no item list`);
  return items.length;
}

export async function carry02State({ sourceRoot, recordedRoot = sourceRoot, targetAppDataRoot, homePath, dryRun = false }) {
  const dbPath = join(homePath, "memory.db");
  assertMarkedHome(dbPath);
  const { homeId } = JSON.parse(readFileSync(join(homePath, ".mirror-desktop", "home.json"), "utf8"));
  const homes = join(targetAppDataRoot, "homes");
  const target = join(homes, homeId);

  const used = existsSync(join(target, RECEIPT))
    || CONVERSATION_ENTRIES.some((entry) => existsSync(join(target, entry)) && filesUnder(join(target, entry)).length > 0);
  if (used) throw new Error(`${target} already holds conversation state; the 0.2 state is carried once, before any Journey is used in 0.3`);

  const waiting = outboxItems(sourceRoot);
  if (waiting > 0) {
    throw new Error(`${waiting} turn${waiting === 1 ? "" : "s"} of 0.2 ${waiting === 1 ? "is" : "are"} not yet in Mirror; open 0.2 until it delivers ${waiting === 1 ? "it" : "them"}, then carry again`);
  }

  const conversations = namedConversationIds(sourceRoot);
  if (conversations.length === 0) throw new Error("the 0.2 state names no Mirror Conversation, so whose it is cannot be told");
  const missing = await conversationsMissingFrom(dbPath, conversations);
  if (missing.length > 0) throw new Error(`${homePath} does not hold the Conversations this state names: ${missing.join(", ")}`);

  // Everything is read and checked before anything is written.
  const carried = CARRIED_ENTRIES.filter((entry) => existsSync(join(sourceRoot, entry)));
  const files = carried.flatMap((entry) => filesUnder(join(sourceRoot, entry)));
  const counts = { files: 0, values: 0 };
  let headers = 0;
  for (const file of files) {
    if (structural(sourceRoot, file)) rewritten(file, recordedRoot, target, counts);
    else if (piSession(sourceRoot, file)) headers += movedHeader(file, homePath) === undefined ? 0 : 1;
    else accessSync(file, constants.R_OK);
  }
  const settingsPath = join(targetAppDataRoot, SETTINGS);
  const settings = mergedSettings(readSettings(join(sourceRoot, SETTINGS)), readSettings(settingsPath));
  if (counts.values === 0 && files.some((file) => relative(sourceRoot, file).startsWith("pi-sessions/"))) {
    throw new Error(`the records name no Pi session in ${recordedRoot}/pi-sessions; if ${sourceRoot} is a snapshot, pass the folder they were recorded in with --recorded-as`);
  }
  const plan = { homeId, target, carried, files: files.length, rewritten: counts, headers, settings: settings?.summary ?? null, conversations };
  if (dryRun) return { dryRun: true, ...plan };

  mkdirSync(homes, { recursive: true, mode: 0o700 });
  const tag = randomBytes(6).toString("hex");
  const staging = join(homes, `.${homeId}.carrying-${tag}`);
  const previous = join(homes, `.${homeId}.before-carry-${tag}`);
  const stagedSettings = `${settingsPath}.carrying-${tag}`;
  const settingsBefore = existsSync(settingsPath) ? readFileSync(settingsPath) : undefined;
  let settingsSwapped = false;
  mkdirSync(staging, { mode: 0o700 });
  try {
    if (existsSync(target)) {
      for (const name of readdirSync(target)) cpSync(join(target, name), join(staging, name), { recursive: true, preserveTimestamps: true });
    }
    const written = { files: 0, values: 0 };
    for (const file of files) {
      const destination = join(staging, relative(sourceRoot, file));
      mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
      rmSync(destination, { force: true });
      const text = structural(sourceRoot, file) ? rewritten(file, recordedRoot, target, written)
        : piSession(sourceRoot, file) ? movedHeader(file, homePath) : undefined;
      if (text === undefined) cpSync(file, destination, { preserveTimestamps: true });
      else writeFileSync(destination, text, { mode: statSync(file).mode & 0o777 });
    }
    const receipt = { carriedAt: new Date().toISOString(), source: sourceRoot, recordedAs: recordedRoot, carried, files: files.length, rewritten: written, headers, settings: plan.settings, conversations };
    writeFileSync(join(staging, RECEIPT), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    if (settings !== undefined) {
      if (settingsBefore !== undefined) writeFileSync(join(staging, SETTINGS_BEFORE), settingsBefore, { flag: "wx", mode: 0o600 });
      writeFileSync(stagedSettings, `${JSON.stringify(settings.merged, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      renameSync(stagedSettings, settingsPath);
      settingsSwapped = true;
    }
    if (existsSync(target)) renameSync(target, previous);
    renameSync(staging, target);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    rmSync(stagedSettings, { force: true });
    if (settingsSwapped) {
      if (settingsBefore === undefined) rmSync(settingsPath, { force: true });
      else writeFileSync(settingsPath, settingsBefore, { mode: 0o600 });
    }
    if (existsSync(previous) && !existsSync(target)) renameSync(previous, target);
    throw error;
  }
  rmSync(previous, { recursive: true, force: true });
  return plan;
}

async function main(argv) {
  const homePath = argv[0];
  if (!homePath || homePath.startsWith("-")) {
    console.error("Usage: carry_02_state.mjs <home path> [--from <0.2 app data>] [--recorded-as <folder>] [--to <0.3 app data>] [--write]");
    return 2;
  }
  const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const support = join(homedir(), "Library", "Application Support");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const identifier = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8")).identifier;
  const recordedRoot = join(support, "ai.mirrormind.desktop");
  const sourceRoot = resolve(option("--from") ?? recordedRoot);
  const targetAppDataRoot = resolve(option("--to") ?? join(support, identifier));
  const dryRun = !argv.includes("--write");
  const result = await carry02State({ sourceRoot, recordedRoot: resolve(option("--recorded-as") ?? recordedRoot), targetAppDataRoot, homePath: resolve(homePath), dryRun });
  console.log(`${dryRun ? "Would carry" : "Carried"} ${result.files} file(s) from ${sourceRoot} into ${result.target}`);
  console.log(`Entries: ${result.carried.join(", ")}`);
  console.log(`Session paths rewritten: ${result.rewritten.values} in ${result.rewritten.files} file(s); Conversations checked: ${result.conversations.length}`);
  console.log(`Pi session headers moved to work in the home: ${result.headers}`);
  const s = result.settings;
  console.log(s ? `Model choices from 0.2: global profile, ${s.journeys} Journey and ${s.conversations} conversation override(s); ${s.replaced} 0.3 choice(s) replaced` : "Model choices: 0.2 has none");
  if (dryRun) console.log("Dry run: nothing was written. Add --write to carry.");
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
