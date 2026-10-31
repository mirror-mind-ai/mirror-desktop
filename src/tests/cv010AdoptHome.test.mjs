import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { HOST_METHODS } from "../../mirror-host/host.mjs";
import { layoutHost, readPin } from "../../scripts/mirror_host_pin.mjs";

// CV-010.DS-005 phase 5, slice 5a: adopting a home Mirror Desktop TS did not create. Two host
// methods, and only these two, take an unmarked home: `inspectHomeForAdoption`, which changes
// nothing, and `adoptHome`, which migrates exactly the pending list the person was shown behind the
// core's verified backup, then marks the home and writes the receipt the way back reads. Every
// other method still refuses an unmarked home.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PENDING = ["017_journey_parent_column", "018_drop_hook_injected"];
let hostDir;

// Each test starts a host or two and migrates a real database; under the full suite's parallel load
// that is well past the default five seconds.
vi.setConfig({ testTimeout: 60_000 });

beforeAll(() => {
  hostDir = join(mkdtempSync(join(tmpdir(), "mirror-adopt-layout-")), "host");
  layoutHost({ root, pin: readPin(root), outDir: hostDir });
});

function startHost() {
  const child = spawn(process.execPath, [join(hostDir, "host.mjs")], { cwd: hostDir, env: {}, stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const queue = [];
  const waiting = [];
  lines.on("line", (line) => (waiting.length ? waiting.shift()(line) : queue.push(line)));
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const next = () => new Promise((resolveLine, reject) => {
    if (queue.length) return resolveLine(queue.shift());
    const timer = setTimeout(() => reject(new Error(`no line; stderr: ${stderr}`)), 30_000);
    waiting.push((line) => { clearTimeout(timer); resolveLine(line); });
  });
  let id = 0;
  const call = async (method, params) => {
    id += 1;
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    return JSON.parse(await next());
  };
  const stop = async () => {
    child.stdin.end();
    return new Promise((resolveExit) => child.on("close", resolveExit));
  };
  return { next, call, stop, stderr: () => stderr };
}

const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** The rows a person recognises a home by, read directly, read-only. */
function counts(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const one = (sql) => db.prepare(sql).get().n;
    return {
      journeys: one("SELECT count(*) AS n FROM identity WHERE layer = 'journey'"),
      conversations: one("SELECT count(*) AS n FROM conversations"),
      memories: one("SELECT count(*) AS n FROM memories"),
      personas: one("SELECT count(*) AS n FROM identity WHERE layer = 'persona'"),
    };
  } finally {
    db.close();
  }
}

function ledger(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare("SELECT id FROM _migrations ORDER BY id").all().map((row) => row.id);
  } finally {
    db.close();
  }
}

function columns(dbPath, table) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  } finally {
    db.close();
  }
}

/**
 * A home as the Python Mirror leaves it: made by the core, given a Conversation, then regressed to
 * migration 016 the way the core's own `regressTo016` does, with Python's `hook_injected` column put
 * back, and no 0.3 marker. Made in a scratch folder and moved into `parent`, because the host never
 * creates a home where the Python homes live.
 */
async function homeAt016(name = "alisson-vale", parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-")))) {
  const host = startHost();
  await host.next();
  const made = join(realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-made-"))), name);
  const created = await host.call("createMarkedHome", { request: { homePath: made, userName: "ana" } });
  expect(created.ok).toBe(true);
  expect((await host.call("ensureConversation", { dbPath: created.result.dbPath, request: { sessionId: "s1", journeyId: "personal-growth", title: "Antiga", interface: "mirror-desktop-ts" } })).ok).toBe(true);
  await host.stop();
  rmSync(join(made, ".mirror-desktop"), { recursive: true });
  const homePath = join(parent, name);
  renameSync(made, homePath);
  const dbPath = join(homePath, "memory.db");
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("DROP INDEX IF EXISTS idx_identity_parent_journey");
    db.exec("ALTER TABLE identity DROP COLUMN parent_journey");
    db.exec("ALTER TABLE runtime_sessions ADD COLUMN hook_injected INTEGER DEFAULT 0");
    db.prepare("DELETE FROM _migrations WHERE id IN (?, ?)").run(...PENDING);
  } finally {
    db.close();
  }
  return { parent, homePath, dbPath };
}

describe("the two adoption methods", () => {
  it("are the host's, beside the others", () => {
    expect(HOST_METHODS).toContain("inspectHomeForAdoption");
    expect(HOST_METHODS).toContain("adoptHome");
  });
});

describe("inspecting a home for adoption", () => {
  it("reports a home at 016, what it holds, and changes nothing", async () => {
    const { homePath, dbPath } = await homeAt016();
    const before = { hash: sha(dbPath), ledger: ledger(dbPath), entries: readdirSync(homePath).sort() };
    const host = startHost();
    await host.next();
    const inspected = await host.call("inspectHomeForAdoption", { request: { homePath } });
    expect(inspected).toMatchObject({
      ok: true,
      result: {
        homePath,
        dbPath,
        marked: false,
        report: { state: "pending", pending: PENDING },
        contents: counts(dbPath),
      },
    });
    expect(inspected.result.contents.conversations).toBe(1);
    expect(inspected.result.contents.personas).toBeGreaterThan(0);
    await host.stop();
    expect(sha(dbPath)).toBe(before.hash);
    expect(ledger(dbPath)).toEqual(before.ledger);
    expect(readdirSync(homePath).filter((entry) => !/^memory\.db-(wal|shm)$/.test(entry)).sort())
      .toEqual(before.entries.filter((entry) => !/^memory\.db-(wal|shm)$/.test(entry)));
    expect(existsSync(join(homePath, ".mirror-desktop"))).toBe(false);
    expect(existsSync(join(homePath, "backups"))).toBe(false);
  });

  it("answers marked, and nothing more, for a home Mirror Desktop TS made", async () => {
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-marked-")));
    const host = startHost();
    await host.next();
    const created = await host.call("createMarkedHome", { request: { homePath: join(parent, "ana"), userName: "ana" } });
    expect(await host.call("inspectHomeForAdoption", { request: { homePath: created.result.homePath } }))
      .toEqual({ id: 2, ok: true, result: { homePath: created.result.homePath, dbPath: created.result.dbPath, marked: true } });
    await host.stop();
  });

  it("reports a home a newer core migrated, and one that is not a Mirror database, without counts", async () => {
    const { homePath, dbPath } = await homeAt016();
    const db = new DatabaseSync(dbPath);
    db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run("099_from_a_newer_core", "2026-11-01T00:00:00Z");
    db.close();
    const notMirror = join(realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-plain-"))), "plain");
    mkdirSync(notMirror);
    writeFileSync(join(notMirror, "memory.db"), "not a database");
    const host = startHost();
    await host.next();
    expect(await host.call("inspectHomeForAdoption", { request: { homePath } }))
      .toMatchObject({ ok: true, result: { marked: false, report: { state: "ahead", unknown: ["099_from_a_newer_core"] }, contents: null } });
    expect(await host.call("inspectHomeForAdoption", { request: { homePath: notMirror } }))
      .toMatchObject({ ok: true, result: { marked: false, report: { state: "not_mirror" }, contents: null } });
    await host.stop();
  });

  it("refuses a path it would not adopt, before reading anything", async () => {
    const { parent, homePath } = await homeAt016();
    const empty = join(parent, "empty");
    mkdirSync(empty);
    const link = join(parent, "link");
    symlinkSync(homePath, link);
    const repository = join(realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-repo-"))), "checkout");
    mkdirSync(join(repository, ".git"), { recursive: true });
    mkdirSync(join(repository, "home"));
    writeFileSync(join(repository, "home", "memory.db"), "");
    const host = startHost();
    await host.next();
    const refusal = async (homePathGiven) => (await host.call("inspectHomeForAdoption", { request: { homePath: homePathGiven } })).error;
    expect(await refusal("relative/home")).toMatchObject({ name: "HomeAdoptionRefusedError", reason: "invalid_home_path" });
    expect(await refusal(`${homePath}/../${homePath.split("/").pop()}`)).toMatchObject({ reason: "invalid_home_path" });
    expect(await refusal(link)).toMatchObject({ reason: "invalid_home_path" });
    expect(await refusal(join(parent, "absent"))).toMatchObject({ reason: "invalid_home_path" });
    expect(await refusal(empty)).toMatchObject({ reason: "no_database" });
    expect(await refusal(join(repository, "home"))).toMatchObject({ reason: "inside_repository" });
    await host.stop();
  });

  it("allows the folder the Python homes live in, which is what adoption is for", async () => {
    const parent = join(realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-minds-"))), ".mirror-minds");
    mkdirSync(parent);
    const { homePath } = await homeAt016("alisson-vale", parent);
    const host = startHost();
    await host.next();
    expect(await host.call("inspectHomeForAdoption", { request: { homePath } })).toMatchObject({ ok: true, result: { report: { state: "pending" } } });
    await host.stop();
  });
});

describe("adopting a home", () => {
  it("migrates exactly the list shown behind a verified backup, marks the home, and leaves its receipt", async () => {
    const { homePath, dbPath } = await homeAt016();
    const before = counts(dbPath);
    const host = startHost();
    await host.next();
    const adopted = await host.call("adoptHome", { request: { homePath, expectedPending: PENDING } });
    expect(adopted).toMatchObject({ ok: true, result: { homePath, dbPath, appliedIds: PENDING } });
    const { homeId, backup } = adopted.result;
    expect(homeId).toMatch(/^home-[0-9a-f-]{36}$/);
    expect(await host.call("inspectMigrationState", { dbPath })).toMatchObject({ ok: true, result: { state: "current" } });
    expect(await host.call("readJourneyTree", { dbPath })).toMatchObject({ ok: true });
    await host.stop();

    expect(counts(dbPath)).toEqual(before);
    expect(ledger(dbPath)).toEqual(expect.arrayContaining(PENDING));
    expect(columns(dbPath, "runtime_sessions")).not.toContain("hook_injected");
    expect(columns(dbPath, "identity")).toContain("parent_journey");

    const marker = JSON.parse(readFileSync(join(homePath, ".mirror-desktop", "home.json"), "utf8"));
    expect(marker).toEqual({ line: "0.3", homeId, createdAt: expect.any(String) });

    expect(dirname(backup.path)).toBe(join(homePath, "backups"));
    expect(sha(backup.path)).toBe(backup.sha256);
    expect(statSync(backup.path).size).toBe(backup.sizeBytes);
    expect(ledger(backup.path)).not.toContain(PENDING[0]);

    const receiptPath = join(homePath, ".mirror-desktop", "adoption.json");
    expect(statSync(receiptPath).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(receiptPath, "utf8"))).toEqual({
      adoptedAt: expect.any(String),
      coreVersion: readPin(root).core.version,
      appliedIds: PENDING,
      backup,
    });
  });

  it("marks a home that is already current without migrating or backing up", async () => {
    const { homePath, dbPath } = await homeAt016();
    const host = startHost();
    await host.next();
    // A terminal `mirror` of the same core already migrated it; the person was shown nothing pending.
    expect((await host.call("adoptHome", { request: { homePath, expectedPending: PENDING } })).ok).toBe(true);
    rmSync(join(homePath, ".mirror-desktop"), { recursive: true });
    rmSync(join(homePath, "backups"), { recursive: true });
    const hash = sha(dbPath);
    const adopted = await host.call("adoptHome", { request: { homePath, expectedPending: [] } });
    expect(adopted).toMatchObject({ ok: true, result: { appliedIds: [], backup: null } });
    await host.stop();
    expect(sha(dbPath)).toBe(hash);
    expect(existsSync(join(homePath, "backups"))).toBe(false);
    expect(JSON.parse(readFileSync(join(homePath, ".mirror-desktop", "adoption.json"), "utf8"))).toMatchObject({ appliedIds: [], backup: null });
  });

  it("refuses a pending list that is not the one shown, and changes nothing", async () => {
    const { homePath, dbPath } = await homeAt016();
    const hash = sha(dbPath);
    const host = startHost();
    await host.next();
    for (const expectedPending of [[PENDING[0]], [], [...PENDING].reverse(), "017_journey_parent_column", undefined]) {
      const refused = await host.call("adoptHome", { request: { homePath, expectedPending } });
      expect(refused.ok).toBe(false);
      expect(refused.error).toMatchObject({ name: "MigrateHomeRejectedError", reason: "pending_changed" });
    }
    await host.stop();
    expect(sha(dbPath)).toBe(hash);
    expect(existsSync(join(homePath, ".mirror-desktop"))).toBe(false);
    expect(existsSync(join(homePath, "backups"))).toBe(false);
  });

  it("refuses a marked home, a newer core's home and a file that is not a Mirror database", async () => {
    const { homePath, dbPath } = await homeAt016();
    const host = startHost();
    await host.next();
    expect((await host.call("adoptHome", { request: { homePath, expectedPending: PENDING } })).ok).toBe(true);
    expect((await host.call("adoptHome", { request: { homePath, expectedPending: [] } })).error)
      .toMatchObject({ name: "HomeAdoptionRefusedError", reason: "already_marked" });

    const ahead = await homeAt016("ahead");
    const db = new DatabaseSync(ahead.dbPath);
    db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run("099_from_a_newer_core", "2026-11-01T00:00:00Z");
    db.close();
    const aheadHash = sha(ahead.dbPath);
    expect((await host.call("adoptHome", { request: { homePath: ahead.homePath, expectedPending: PENDING } })).error)
      .toMatchObject({ name: "HomeAdoptionRefusedError", reason: "not_adoptable" });
    expect(sha(ahead.dbPath)).toBe(aheadHash);
    expect(existsSync(join(ahead.homePath, ".mirror-desktop"))).toBe(false);

    const plain = join(realpathSync(mkdtempSync(join(tmpdir(), "mirror-adopt-plain-"))), "plain");
    mkdirSync(plain);
    writeFileSync(join(plain, "memory.db"), "not a database");
    expect((await host.call("adoptHome", { request: { homePath: plain, expectedPending: [] } })).error)
      .toMatchObject({ name: "HomeAdoptionRefusedError", reason: "not_adoptable" });
    expect(readFileSync(join(plain, "memory.db"), "utf8")).toBe("not a database");
    await host.stop();
    expect(dbPath).toBeTruthy();
  });

  it("checks the path again, as inspection does", async () => {
    const { parent, homePath } = await homeAt016();
    const link = join(parent, "link");
    symlinkSync(homePath, link);
    const host = startHost();
    await host.next();
    expect((await host.call("adoptHome", { request: { homePath: link, expectedPending: PENDING } })).error).toMatchObject({ reason: "invalid_home_path" });
    expect((await host.call("adoptHome", { request: { expectedPending: PENDING } })).error).toMatchObject({ reason: "invalid_home_path" });
    await host.stop();
    expect(existsSync(join(homePath, ".mirror-desktop"))).toBe(false);
  });
});

describe("every other method", () => {
  it("still refuses an unmarked home, including one just inspected", async () => {
    const { homePath, dbPath } = await homeAt016();
    const hash = sha(dbPath);
    const host = startHost();
    await host.next();
    expect((await host.call("inspectHomeForAdoption", { request: { homePath } })).ok).toBe(true);
    for (const method of HOST_METHODS.filter((name) => !["inspectHomeForAdoption", "adoptHome", "createMarkedHome"].includes(name))) {
      const refused = await host.call(method, { dbPath, request: { expectedPending: PENDING } });
      expect(refused, method).toMatchObject({ ok: false, error: { name: "HomeNotMarkedError" } });
    }
    await host.stop();
    expect(sha(dbPath)).toBe(hash);
  });
});
