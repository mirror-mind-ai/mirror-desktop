#!/usr/bin/env node
// CV-013.DS-003: the 0.3 app's state continues in Nautilus.
//
//   node scripts/carry_03_state.mjs [--dev] [--from <0.3 app data>] [--recorded-as <folder>] [--to <Nautilus app data>] [--write]
//
// Nautilus has its own bundle identifier, so macOS gives it its own app data folder. This copies
// the whole 0.3 folder (ai.mirrormind.desktop.ts, or .ts.dev with --dev) into Nautilus's
// (ai.mirrormind.nautilus, or .nautilus.dev): each Mirror home's Desktop state, Pi and Claude Code
// as installed, the model settings, the OpenRouter key file, the avatar and the home binding. The
// Mirror home itself does not move. Run by hand with both apps closed, before Nautilus is first
// opened. Without --write it only says what it would do.
//
// The 0.3 folder is never written, so Mirror Desktop TS stays the way back. All or nothing:
// everything is read and checked first, then copied into a staging folder beside the target and
// renamed into place. The tree is copied by `cp -c -R -p`, which clones files where the disk allows
// (APFS), so the copy costs little room, and keeps modes and times; Node's own copy does neither on
// macOS. Where cloning fails, a plain `cp -R -p` copies instead.
//
// Only the structural `piSessionFile` and `sessionFile` values that point into the old folder move,
// and they move in place: the rest of each file keeps its bytes. The same path inside what the
// agent did and said is history and stays. Only the app's records are read: the JSON files of each
// home's state. Pi's transcripts, the installed tools and anything else are copied byte for byte. A Conversation Segment receipt (`complete.json`) hashes its manifest and segments;
// a hash is recomputed for a file whose bytes changed only when the recorded hash held in the
// source, so a receipt verifies in Nautilus exactly when it verified in 0.3.
//
// The key file is copied as bytes, never parsed or shown; the receipt says only whether it existed.
//
// --from may be a snapshot of the 0.3 folder (a clone taken while 0.3 runs); --recorded-as then names
// the folder its records were written in.

import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CURRENT_RELEASE_LINE, RELEASE_LINES } from "./release_line.mjs";

const PATH_KEYS = ["piSessionFile", "sessionFile"];
const RECEIPT = "carried-from-0.3.json";
const KEY_FILE = "openrouter-key.secret";
/** The apps that write these folders, by the path of their running executable. */
const APPS = {
  user: ["/Mirror Desktop TS.app/Contents/MacOS/", "/Nautilus for Mirror.app/Contents/MacOS/"],
  dev: ["/Mirror Desktop TS Dev.app/Contents/MacOS/", "/Nautilus for Mirror Dev.app/Contents/MacOS/", "/target/debug/mirror-desktop"],
};

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Copy `from` to the new folder `to`: cloned when `clone` and the disk allow, else plainly. */
function copyTree(from, to, clone) {
  if (clone) {
    if (spawnSync("cp", ["-c", "-R", "-p", from, to], { stdio: "ignore" }).status === 0) return true;
    rmSync(to, { recursive: true, force: true });
  }
  const copied = spawnSync("cp", ["-R", "-p", from, to], { encoding: "utf8" });
  if (copied.status !== 0) throw new Error(`copying ${from} failed: ${copied.stderr.trim()}`);
  return false;
}

/** The 0.3 folder and Nautilus's, in `support` (Application Support). */
export function defaultFolders({ support, dev = false }) {
  const line03 = RELEASE_LINES.find((line) => line.line === "0.3");
  const suffix = dev ? ".dev" : "";
  return { source: join(support, line03.identifier + suffix), target: join(support, CURRENT_RELEASE_LINE.identifier + suffix) };
}

/** Running executables of either app, from `ps`. */
export function runningApps({ dev = false } = {}) {
  const listed = spawnSync("ps", ["-axo", "command="], { encoding: "utf8" });
  if (listed.status !== 0) throw new Error("could not list running processes to check that both apps are closed");
  const marks = APPS[dev ? "dev" : "user"];
  return listed.stdout.split("\n").filter((line) => marks.some((mark) => line.includes(mark)));
}

/** Every folder and regular file under `root`, relative; a symbolic link anywhere is refused. */
function entriesUnder(root) {
  const folders = [];
  const files = [];
  const walk = (relativePath) => {
    const path = join(root, relativePath);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`${path} is a symbolic link; nothing was carried`);
    if (stat.isFile()) files.push(relativePath);
    else if (stat.isDirectory()) {
      if (relativePath) folders.push(relativePath);
      for (const name of readdirSync(path).sort()) walk(relativePath ? join(relativePath, name) : name);
    } else throw new Error(`${path} is not a file or a folder; nothing was carried`);
  };
  walk("");
  return { folders, files };
}

const inHome = (file, part) => file.startsWith("homes/") && file.split("/")[2] === part;
/**
 * Whether a file is one of the app's records read for session paths: JSON in a home's state outside
 * Pi's transcripts, where every record that names a session lives. Everything else (the folder's own
 * settings, installed tools, the avatar) is copied as it is and never parsed.
 */
const structural = (file) => /\.jsonl?$/.test(file) && file.startsWith("homes/") && file.split("/").length > 2 && !inHome(file, "pi-sessions");

/**
 * The record's text with its session paths moved in place, or undefined when it names none. The
 * text edit is checked against a parse: both must agree, or the record is refused.
 */
function moved(file, text, recordedRoot, targetRoot, counts) {
  const parse = (source) => {
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new Error(`${file} is not valid JSON (${error.message}); nothing was carried`);
    }
  };
  let expected = 0;
  const move = (value) => {
    if (Array.isArray(value)) return value.map(move);
    if (value === null || typeof value !== "object") return value;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (PATH_KEYS.includes(key) && typeof item === "string" && item.startsWith(`${recordedRoot}/`)) {
        if (!item.startsWith(`${recordedRoot}/homes/`)) throw new Error(`${file}: ${key} names a file outside the homes: ${item}`);
        next[key] = targetRoot + item.slice(recordedRoot.length);
        expected += 1;
      } else next[key] = move(item);
    }
    return next;
  };
  const documents = file.endsWith(".jsonl") ? text.split("\n").filter((line) => line.trim()) : [text];
  const wanted = documents.map((document) => move(parse(document)));
  if (expected === 0) return undefined;

  const encoded = (root) => JSON.stringify(root).slice(1, -1);
  const pattern = new RegExp(`"(${PATH_KEYS.join("|")})"(\\s*:\\s*)"${encoded(recordedRoot).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/homes/`, "g");
  const next = text.replace(pattern, (_, key, colon) => `"${key}"${colon}"${encoded(targetRoot)}/homes/`);
  const result = file.endsWith(".jsonl") ? next.split("\n").filter((line) => line.trim()) : [next];
  if (JSON.stringify(result.map((document) => JSON.parse(document))) !== JSON.stringify(wanted)) {
    throw new Error(`${file}: its session paths could not be moved in place; nothing was carried`);
  }
  counts.files += 1;
  counts.values += expected;
  return next;
}

/** The plan: each file's new text where it changes, and what the receipts' hashes become. */
function planCarry(sourceRoot, recordedRoot, targetRoot, files) {
  const changed = new Map();
  const rewritten = { files: 0, values: 0 };
  for (const file of files.filter(structural)) {
    const text = moved(file, readFileSync(join(sourceRoot, file), "utf8"), recordedRoot, targetRoot, rewritten);
    if (text !== undefined) changed.set(file, text);
  }
  const segments = { rehashed: 0, manifestsRehashed: 0, unverifiedKept: 0 };
  for (const receiptFile of files.filter((file) => file.endsWith(".segments/complete.json") && inHome(file, "conversation-segments"))) {
    const folder = dirname(receiptFile);
    const receiptText = changed.get(receiptFile) ?? readFileSync(join(sourceRoot, receiptFile), "utf8");
    const receipt = JSON.parse(receiptText);
    let touched = false;
    const rehash = (file, recorded) => {
      if (!changed.has(file) || typeof recorded !== "string") return recorded;
      if (sha(readFileSync(join(sourceRoot, file))) !== recorded) {
        segments.unverifiedKept += 1;
        return recorded;
      }
      touched = true;
      return sha(Buffer.from(changed.get(file), "utf8"));
    };
    const manifest = `${folder.slice(0, -".segments".length)}.json`;
    const manifestSha256 = rehash(manifest, receipt.manifestSha256);
    if (manifestSha256 !== receipt.manifestSha256) segments.manifestsRehashed += 1;
    const hashes = Array.isArray(receipt.projectionHashes) ? receipt.projectionHashes.map((entry) => {
      const next = rehash(join(folder, `${entry?.segmentId}.json`), entry?.sha256);
      if (next !== entry?.sha256) segments.rehashed += 1;
      return next === entry?.sha256 ? entry : { ...entry, sha256: next };
    }) : receipt.projectionHashes;
    if (touched) {
      const indent = /^[[{]\r?\n( +|\t)/.exec(receiptText)?.[1];
      changed.set(receiptFile, JSON.stringify({ ...receipt, manifestSha256, projectionHashes: hashes }, null, indent) + (receiptText.endsWith("\n") ? "\n" : ""));
    }
  }
  return { changed, rewritten, segments };
}

function outboxWaiting(sourceRoot, files) {
  return files.filter((file) => inHome(file, "mirror-append-outbox.json")).reduce((sum, file) => {
    const items = JSON.parse(readFileSync(join(sourceRoot, file), "utf8")).items;
    return sum + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

export async function carry03State({
  sourceRoot, recordedRoot = sourceRoot, targetRoot, dryRun = false, dev = false,
  runningApps: listRunning = () => runningApps({ dev }), onStaged = () => {}, clone = true,
}) {
  if (!existsSync(join(sourceRoot, "homes"))) throw new Error(`${sourceRoot} holds no homes; there is no 0.3 state to carry`);
  if (existsSync(targetRoot) && (readdirSync(targetRoot).length > 0 || !statSync(targetRoot).isDirectory())) {
    throw new Error(`${targetRoot} already holds Nautilus state; the 0.3 state is carried once, before Nautilus is first opened`);
  }
  // A snapshot can be taken while the app runs; the live folder cannot.
  if (recordedRoot === sourceRoot) {
    const running = listRunning();
    if (running.length > 0) throw new Error(`quit Mirror Desktop TS and Nautilus first; running: ${running.join("; ")}`);
  }

  // Everything is read and checked before anything is written.
  const { folders, files } = entriesUnder(sourceRoot);
  const { changed, rewritten, segments } = planCarry(sourceRoot, recordedRoot, targetRoot, files);
  const homes = readdirSync(join(sourceRoot, "homes")).filter((name) => statSync(join(sourceRoot, "homes", name)).isDirectory()).sort();
  const bytes = files.reduce((sum, file) => sum + statSync(join(sourceRoot, file)).size, 0);
  const plan = {
    source: sourceRoot, recordedAs: recordedRoot, target: targetRoot, homes, files: files.length, bytes, rewritten, segments,
    keyFile: files.includes(KEY_FILE), outboxWaiting: outboxWaiting(sourceRoot, files),
  };
  if (dryRun) return { dryRun: true, ...plan };

  const parent = dirname(targetRoot);
  mkdirSync(parent, { recursive: true });
  const staging = join(parent, `.${basename(targetRoot)}.carrying-${randomBytes(6).toString("hex")}`);
  let cloned;
  try {
    cloned = copyTree(sourceRoot, staging, clone);
    const staged = entriesUnder(staging);
    if (JSON.stringify(staged.files) !== JSON.stringify(files) || JSON.stringify(staged.folders) !== JSON.stringify(folders)) {
      throw new Error("the copy does not hold exactly the files of the 0.3 folder; nothing was carried");
    }
    // A clone is its own file: writing it leaves the 0.3 file as it was.
    for (const [file, text] of changed) {
      const to = join(staging, file);
      const stat = statSync(join(sourceRoot, file));
      writeFileSync(to, text);
      chmodSync(to, stat.mode & 0o7777);
      utimesSync(to, stat.atimeMs / 1000, stat.mtimeMs / 1000);
    }
    const receipt = { carriedAt: new Date().toISOString(), cloned, ...plan };
    writeFileSync(join(staging, RECEIPT), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    onStaged(staging);
    if (existsSync(targetRoot)) rmdirSync(targetRoot);
    renameSync(staging, targetRoot);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  return { ...plan, cloned };
}

async function main(argv) {
  const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const dev = argv.includes("--dev");
  const folders = defaultFolders({ support: join(homedir(), "Library", "Application Support"), dev });
  const sourceRoot = resolve(option("--from") ?? folders.source);
  const recordedRoot = resolve(option("--recorded-as") ?? sourceRoot);
  const targetRoot = resolve(option("--to") ?? folders.target);
  const dryRun = !argv.includes("--write");
  const result = await carry03State({ sourceRoot, recordedRoot, targetRoot, dryRun, dev });
  const gigabytes = (result.bytes / 1024 ** 3).toFixed(2);
  console.log(`${dryRun ? "Would carry" : "Carried"} ${result.files} file(s), ${gigabytes} GB, from ${sourceRoot} into ${targetRoot}`);
  if (recordedRoot !== sourceRoot) console.log(`Records written in: ${recordedRoot}`);
  console.log(`Homes: ${result.homes.join(", ")}`);
  console.log(`Session paths moved: ${result.rewritten.values} in ${result.rewritten.files} file(s)`);
  const s = result.segments;
  console.log(`Segment receipts: ${s.rehashed} segment(s) and ${s.manifestsRehashed} manifest(s) hashed again; ${s.unverifiedKept} that did not verify in 0.3 left as they were`);
  console.log(`OpenRouter key file: ${result.keyFile ? "carried as bytes" : "none"}; turns waiting for Mirror: ${result.outboxWaiting}`);
  if (!dryRun) console.log(result.cloned ? "Files were cloned: the copy shares their blocks with the 0.3 folder." : "Files were copied in full: this disk could not clone them.");
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
