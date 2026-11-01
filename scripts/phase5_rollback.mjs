#!/usr/bin/env node
// CV-010.DS-005 slice 5b: the way back from the 0.3 line.
//
//   node scripts/phase5_rollback.mjs <home path> [--write]
//
// A home adopted by 5a was migrated by the TypeScript core (017, 018), and migration 018 drops a
// column the Python Mirror and Mirror Desktop 0.2 still use, so neither runs on it again. This
// returns the home to the database it had before the migration: the backup recorded in
// `.mirror-desktop/adoption.json`, checked against its SHA-256. The migrated database (with its WAL)
// and the 0.3 marker are kept aside in `backups/rolled-back-<stamp>/`, never deleted, with a receipt.
// Whatever was written after the adoption is lost from the home; the run says how much, by Journey,
// counts only. Without --write it only says what it would do.
//
// The 0.2 app's own folder is not touched: the 0.2 state carried by 5a-2 was copied, never moved.
// Machine steps (quitting the apps, the terminal's wiring, the web console, reopening 0.2) are printed,
// not done: they act on the machine, not on a home, and cannot be rehearsed on a copy.

import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const DATABASE_FILES = ["memory.db", "memory.db-wal", "memory.db-shm"];
const MARKER_FOLDER = ".mirror-desktop";

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** Read-only queries against a database file, closed before returning. */
function readDatabase(path, read) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return read(db);
  } finally {
    db.close();
  }
}

/** The process ids holding `path` open, from lsof; empty when none does. */
function openers(path) {
  try {
    return execFileSync("lsof", ["-t", "--", path], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n").filter(Boolean).map(Number);
  } catch (error) {
    if (error.status === 1) return [];
    throw new Error(`could not ask lsof who holds ${path} open: ${error.message}`);
  }
}

function adoptionReceipt(homePath) {
  const path = join(homePath, MARKER_FOLDER, "adoption.json");
  if (!existsSync(path)) throw new Error(`${homePath} was not adopted by Mirror Desktop (no ${MARKER_FOLDER}/adoption.json); there is nothing to roll back`);
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
  if (!Array.isArray(receipt.appliedIds) || (receipt.backup !== null && typeof receipt.backup?.path !== "string")) {
    throw new Error(`${path} does not record the applied migrations and the backup`);
  }
  return receipt;
}

/** The backup, refused unless it lies in the home's backups folder and matches the recorded hash. */
function checkedBackup(homePath, backup) {
  if (!existsSync(backup.path)) throw new Error(`the backup ${backup.path} is missing`);
  const backups = realpathSync(join(homePath, "backups"));
  const real = realpathSync(backup.path);
  if (!real.startsWith(`${backups}${sep}`)) throw new Error(`the backup ${backup.path} lies outside ${backups}`);
  const hash = sha256(real);
  if (hash !== backup.sha256) throw new Error(`the backup ${backup.path} does not match the SHA-256 recorded at adoption`);
  return { path: real, sha256: hash };
}

/** The backup's ledger and ids, read from a copy so its folder gains no -wal or -shm. */
function backupContents(backupPath) {
  const folder = mkdtempSync(join(tmpdir(), "phase5-rollback-"));
  try {
    const copy = join(folder, "backup.db");
    copyFileSync(backupPath, copy);
    return readDatabase(copy, (db) => ({
      check: db.prepare("PRAGMA quick_check").get().quick_check,
      migrations: db.prepare("SELECT id FROM _migrations ORDER BY id").all().map((row) => row.id),
      conversations: new Set(db.prepare("SELECT id FROM conversations").all().map((row) => row.id)),
      messages: new Set(db.prepare("SELECT id FROM messages").all().map((row) => row.id)),
    }));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/** What the home holds that the backup does not: Conversations, messages, and messages by Journey. */
function lostSince(databasePath, backup) {
  return readDatabase(databasePath, (db) => {
    const conversations = db.prepare("SELECT id FROM conversations").all().filter((row) => !backup.conversations.has(row.id)).length;
    const byJourney = {};
    let messages = 0;
    for (const row of db.prepare("SELECT m.id, c.journey FROM messages m LEFT JOIN conversations c ON c.id = m.conversation_id").all()) {
      if (backup.messages.has(row.id)) continue;
      messages += 1;
      const journey = row.journey ?? "(no Journey)";
      byJourney[journey] = (byJourney[journey] ?? 0) + 1;
    }
    return { conversations, messages, byJourney };
  });
}

export async function rollbackHome({ homePath, dryRun = false }) {
  const receipt = adoptionReceipt(homePath);
  const database = join(homePath, "memory.db");
  let backup = null;
  let restoresTo = null;
  let lost = { conversations: 0, messages: 0, byJourney: {} };
  if (receipt.backup !== null) {
    backup = checkedBackup(homePath, receipt.backup);
    const contents = backupContents(backup.path);
    if (contents.check !== "ok") throw new Error(`the backup ${backup.path} fails SQLite's quick_check: ${contents.check}`);
    const already = receipt.appliedIds.find((id) => contents.migrations.includes(id));
    if (already) throw new Error(`the backup already holds ${already}, a migration it is meant to undo; it is not the database from before the adoption`);
    restoresTo = contents.migrations.at(-1) ?? null;
    lost = lostSince(database, contents);
  }
  const openBy = openers(database);
  const result = { dryRun, homePath, backup, restoresTo, undoes: backup ? receipt.appliedIds : [], lost, openBy };
  if (dryRun) return result;
  if (openBy.length) throw new Error(`${database} is open by process ${openBy.join(", ")}; quit Mirror Desktop and any terminal Mirror first`);

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const aside = join(homePath, "backups", `rolled-back-${stamp}-${randomBytes(3).toString("hex")}`);
  let staged;
  if (backup) {
    staged = join(homePath, `memory.db.restoring-${randomBytes(4).toString("hex")}`);
    copyFileSync(backup.path, staged);
    if (sha256(staged) !== backup.sha256) {
      rmSync(staged, { force: true });
      throw new Error(`the copy of ${backup.path} does not match its SHA-256; nothing was changed`);
    }
  }
  const moved = [];
  try {
    mkdirSync(aside, { mode: 0o700 });
    for (const name of [...(backup ? DATABASE_FILES : []), MARKER_FOLDER]) {
      if (!existsSync(join(homePath, name))) continue;
      renameSync(join(homePath, name), join(aside, name));
      moved.push(name);
    }
    if (staged) renameSync(staged, database);
  } catch (error) {
    if (staged) rmSync(staged, { force: true });
    throw new Error(`the way back stopped midway (${error.message}); ${moved.length ? `${moved.join(", ")} are in ${aside}; move them back to resume` : "nothing was moved"}`);
  }
  const receiptPath = join(aside, "rollback.json");
  writeFileSync(receiptPath, `${JSON.stringify({ rolledBackAt: new Date().toISOString(), homePath, backup, restoresTo, undoes: result.undoes, keptAside: moved, lost }, null, 2)}\n`, { mode: 0o600 });
  chmodSync(receiptPath, 0o600);
  return { ...result, keptAside: aside };
}

/** Mirror Desktop TS processes, which may write the home's state at any moment. */
function runningDesktopTs() {
  return execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" })
    .split("\n").filter((line) => line.includes("Mirror Desktop TS") && line.includes("/Contents/MacOS/"));
}

async function main(argv) {
  const homePath = argv[0];
  if (!homePath || homePath.startsWith("-")) {
    console.error("Usage: phase5_rollback.mjs <home path> [--write]");
    return 2;
  }
  const dryRun = !argv.includes("--write");
  if (!dryRun && runningDesktopTs().length) {
    console.error("Mirror Desktop TS is running; quit it before rolling back.");
    return 1;
  }
  const result = await rollbackHome({ homePath: resolve(homePath), dryRun });
  if (result.backup) {
    console.log(`${dryRun ? "Would restore" : "Restored"} ${relative(result.homePath, result.backup.path)} (sha256 ${result.backup.sha256.slice(0, 12)}…), ledger back to ${result.restoresTo}, undoing ${result.undoes.join(", ")}`);
  } else {
    console.log(`Adopted without a migration: ${dryRun ? "would remove" : "removed"} only the 0.3 marker; the database is unchanged.`);
  }
  const { conversations, messages, byJourney } = result.lost;
  console.log(`Written since the adoption, ${dryRun ? "would be" : "now"} only in the migrated database: ${conversations} Conversation(s), ${messages} message(s)`);
  for (const [journey, count] of Object.entries(byJourney).sort()) console.log(`  ${journey}: ${count}`);
  if (dryRun) {
    if (result.openBy.length) console.log(`The database is open by process ${result.openBy.join(", ")}; --write will refuse until it is closed.`);
    console.log("Dry run: nothing was written. Add --write to roll back.");
    return 0;
  }
  console.log(`Kept aside, with the receipt: ${result.keptAside}`);
  console.log("Then, on this machine (not done by this script):");
  console.log("  1. if the terminal was moved to the TypeScript core: npm uninstall -g mirror-mind, and undo its runtime wiring");
  console.log("  2. restart what the cutover stopped (the web console), and reopen Mirror Desktop 0.2");
  // `journeys` answers even on a migrated database; `mirror load` reads runtime_sessions.hook_injected and does not.
  console.log("  3. check: uv run python -m memory mirror load --persona <any> exits 0, and 0.2 opens a Journey");
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
