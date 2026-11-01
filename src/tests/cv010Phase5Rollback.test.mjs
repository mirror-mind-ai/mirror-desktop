import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rollbackHome } from "../../scripts/phase5_rollback.mjs";

// CV-010.DS-005 slice 5b: the way back. A home adopted by 5a is returned to the database it had
// before the migration (the backup 5a recorded, checked against its SHA-256), the migrated database
// and the 0.3 marker kept aside, never deleted, so Mirror 0.2 and the Python terminal run on it again.

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function database(path, { migrations, conversations, hookInjected }) {
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE _migrations (id TEXT PRIMARY KEY)");
  db.exec("CREATE TABLE conversations (id TEXT PRIMARY KEY, journey TEXT)");
  db.exec("CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT, created_at TEXT)");
  db.exec(`CREATE TABLE runtime_sessions (id TEXT PRIMARY KEY${hookInjected ? ", hook_injected INTEGER" : ""})`);
  for (const id of migrations) db.prepare("INSERT INTO _migrations (id) VALUES (?)").run(id);
  for (const [id, journey, messages] of conversations) {
    db.prepare("INSERT INTO conversations (id, journey) VALUES (?, ?)").run(id, journey);
    for (let index = 0; index < messages; index += 1) {
      db.prepare("INSERT INTO messages (id, conversation_id, created_at) VALUES (?, ?, ?)").run(`${id}-m${index}`, id, `2026-10-3${index}T00:00:00Z`);
    }
  }
  db.close();
}

const BEFORE = ["015_x", "016_builder_workbench_display_codes"];
const APPLIED = ["017_journey_parent_column", "018_drop_hook_injected"];

/** A home 5a adopted: migrated database, backup, marker and receipt; one Conversation and one turn more since. */
function adoptedHome({ backupMigrations = BEFORE, receiptBackup } = {}) {
  const homePath = join(realpathSync(mkdtempSync(join(tmpdir(), "rollback-5b-"))), "home");
  mkdirSync(join(homePath, "backups"), { recursive: true });
  mkdirSync(join(homePath, ".mirror-desktop"));
  const backup = join(homePath, "backups", "pre-migration-016_builder_workbench_display_codes-20261101T000000Z-abc.db");
  database(backup, { migrations: backupMigrations, conversations: [["c1", "alpha", 2]], hookInjected: true });
  database(join(homePath, "memory.db"), {
    migrations: [...BEFORE, ...APPLIED],
    conversations: [["c1", "alpha", 3], ["c2", "beta", 2]],
    hookInjected: false,
  });
  writeFileSync(join(homePath, ".mirror-desktop", "home.json"), JSON.stringify({ line: "0.3", homeId: "home-1", createdAt: "2026-11-01T00:00:00Z" }));
  const recorded = receiptBackup === undefined
    ? { path: backup, sha256: sha256(backup), sizeBytes: statSync(backup).size }
    : receiptBackup;
  writeFileSync(join(homePath, ".mirror-desktop", "adoption.json"), JSON.stringify({ adoptedAt: "2026-11-01T00:00:00Z", coreVersion: "0.39.0", appliedIds: APPLIED, backup: recorded }));
  return { homePath, backup };
}

/** Every file under the home with its hash, to prove a refusal or a dry run wrote nothing. */
function fingerprint(path) {
  const entries = [];
  const walk = (folder) => {
    for (const name of readdirSync(folder).sort()) {
      const full = join(folder, name);
      if (statSync(full).isDirectory()) walk(full);
      else entries.push(`${full} ${sha256(full)}`);
    }
  };
  walk(path);
  return entries;
}

const ledger = (path) => {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return {
      migrations: db.prepare("SELECT id FROM _migrations ORDER BY id").all().map((row) => row.id),
      hookInjected: db.prepare("PRAGMA table_info(runtime_sessions)").all().some((row) => row.name === "hook_injected"),
    };
  } finally {
    db.close();
  }
};

describe("the way back from an adopted home to the database it had before", () => {
  it("says what it would restore and what would be lost, and writes nothing on a dry run", async () => {
    const { homePath, backup } = adoptedHome();
    const before = fingerprint(homePath);
    const result = await rollbackHome({ homePath, dryRun: true });
    expect(result).toMatchObject({
      dryRun: true,
      backup: { path: backup, sha256: sha256(backup) },
      restoresTo: "016_builder_workbench_display_codes",
      undoes: APPLIED,
      lost: { conversations: 1, messages: 3, byJourney: { alpha: 1, beta: 2 } },
    });
    expect(fingerprint(homePath)).toEqual(before);
  });

  it("restores the backup's bytes, keeps the migrated database and the marker aside, and leaves a receipt", async () => {
    const { homePath, backup } = adoptedHome();
    const migrated = sha256(join(homePath, "memory.db"));
    writeFileSync(join(homePath, "memory.db-wal"), "");
    writeFileSync(join(homePath, "memory.db-shm"), "");
    const backupHash = sha256(backup);

    const result = await rollbackHome({ homePath });

    expect(sha256(join(homePath, "memory.db"))).toBe(backupHash);
    expect(ledger(join(homePath, "memory.db"))).toEqual({ migrations: BEFORE, hookInjected: true });
    expect(existsSync(join(homePath, ".mirror-desktop"))).toBe(false);
    expect(existsSync(join(homePath, "memory.db-wal"))).toBe(false);
    expect(sha256(backup)).toBe(backupHash);

    const aside = result.keptAside;
    expect(aside.startsWith(join(homePath, "backups", "rolled-back-"))).toBe(true);
    expect(readdirSync(aside).sort()).toEqual([".mirror-desktop", "memory.db", "memory.db-shm", "memory.db-wal", "rollback.json"]);
    expect(sha256(join(aside, "memory.db"))).toBe(migrated);
    expect(readdirSync(join(aside, ".mirror-desktop")).sort()).toEqual(["adoption.json", "home.json"]);
    expect(statSync(join(aside, "rollback.json")).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(join(aside, "rollback.json"), "utf8"))).toMatchObject({
      backup: { sha256: backupHash },
      restoresTo: "016_builder_workbench_display_codes",
      lost: { conversations: 1, messages: 3 },
    });
    expect(readdirSync(homePath).filter((name) => name.includes("rollback"))).toEqual([]);
    await expect(rollbackHome({ homePath })).rejects.toThrow(/not adopted by Mirror Desktop/);
  });

  it("only removes the marker when the home was adopted without a migration", async () => {
    const { homePath } = adoptedHome({ receiptBackup: null });
    const database = sha256(join(homePath, "memory.db"));
    const result = await rollbackHome({ homePath });
    expect(result).toMatchObject({ backup: null, undoes: [] });
    expect(sha256(join(homePath, "memory.db"))).toBe(database);
    expect(existsSync(join(homePath, ".mirror-desktop"))).toBe(false);
    expect(readdirSync(result.keptAside).sort()).toEqual([".mirror-desktop", "rollback.json"]);
  });

  it.each([
    ["a home 5a never adopted", ({ homePath }) => unlinkSync(join(homePath, ".mirror-desktop", "adoption.json")), /not adopted by Mirror Desktop/],
    ["a backup whose bytes changed", ({ backup }) => writeFileSync(backup, "changed"), /backup .* does not match the SHA-256/],
    ["a backup that is gone", ({ backup }) => renameSync(backup, `${backup}.moved`), /backup .* is missing/],
    ["a backup outside the home's backups folder", ({ homePath, backup }) => pointReceiptAt(homePath, join(homePath, "elsewhere.db"), backup), /outside .*backups/],
    ["a database a process holds open", () => undefined, /open by process/, true],
  ])("refuses %s and writes nothing", async (_name, mutate, message, holdOpen) => {
    const fixture = adoptedHome();
    mutate(fixture);
    const before = fingerprint(fixture.homePath);
    const held = holdOpen ? new DatabaseSync(join(fixture.homePath, "memory.db")) : undefined;
    try {
      await expect(rollbackHome({ homePath: fixture.homePath })).rejects.toThrow(message);
    } finally {
      held?.close();
    }
    expect(fingerprint(fixture.homePath)).toEqual(before);
  });

  it("refuses a backup that already holds the migrations it is meant to undo", async () => {
    const { homePath } = adoptedHome({ backupMigrations: [...BEFORE, APPLIED[0]] });
    const before = fingerprint(homePath);
    await expect(rollbackHome({ homePath })).rejects.toThrow(/backup already holds 017_journey_parent_column/);
    expect(fingerprint(homePath)).toEqual(before);
  });
});

function pointReceiptAt(homePath, elsewhere, backup) {
  writeFileSync(elsewhere, readFileSync(backup));
  const receiptPath = join(homePath, ".mirror-desktop", "adoption.json");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, backup: { ...receipt.backup, path: elsewhere } }));
}
