import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CV-010.DS-005 phase 3 acceptance: the script the clean account runs sorts what the app wrote, and
// fails on anything written where the terminal Mirror lives.

const script = join(import.meta.dirname, "..", "..", "scripts", "acceptance", "phase3_account_check.sh");

function account() {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "phase3-account-")));
  const home = join(base, "home");
  mkdirSync(home);
  const old = join(home, "Documents", "before.txt");
  mkdirSync(join(home, "Documents"));
  writeFileSync(old, "x");
  utimesSync(old, new Date(2020, 0, 1), new Date(2020, 0, 1));
  const env = { HOME: home, PATH: "/usr/bin:/bin", MIRROR_ACCEPTANCE_STATE: join(base, "state") };
  const run = (command) => {
    try {
      return { status: 0, out: execFileSync("/bin/bash", [script, command], { env, encoding: "utf8" }) };
    } catch (error) {
      return { status: error.status, out: `${error.stdout}${error.stderr}` };
    }
  };
  const write = (rel, text = "x") => {
    mkdirSync(join(home, rel, ".."), { recursive: true });
    writeFileSync(join(home, rel), text);
  };
  return { home, run, write };
}

describe("the phase 3 account check", () => {
  it("sorts what was written since the start and reads the new home", () => {
    const { home, run, write } = account();
    expect(run("start").out).toContain(`absent: ${home}/.config/mirror`);
    execFileSync("/bin/sleep", ["1"]);
    write("Library/Application Support/ai.mirrormind.desktop.ts.dev/runtime-home.v2.json");
    write(".pi/agent/auth.json");
    write("Library/Caches/ai.mirrormind.desktop.ts.dev/cache");
    write("Library/Preferences/com.apple.finder.plist");
    mkdirSync(join(home, "Mirror Homes", "ana-souza"), { recursive: true });
    execFileSync("/usr/bin/sqlite3", [join(home, "Mirror Homes", "ana-souza", "memory.db"),
      "CREATE TABLE runtime_sessions (session_id TEXT, mirror_active INTEGER);" +
      "INSERT INTO runtime_sessions VALUES ('/s/one.jsonl', 1), ('__global_operating_mode__', 1);" +
      "CREATE TABLE llm_calls (role TEXT); INSERT INTO llm_calls VALUES ('reception'), ('embedding');" +
      "CREATE TABLE messages (created_at TEXT); INSERT INTO messages VALUES ('2026-10-30T12:00:00Z');"]);
    const report = run("report");
    expect(report.status).toBe(0);
    expect(report.out).toContain("expected: 3 files; app chrome: 1; other: 1; FORBIDDEN: 0");
    expect(report.out).toContain("sessions in Mirror Mode: 1");
    expect(report.out).toContain("provider calls: embedding 1, reception 1");
    expect(report.out).toContain("messages: 1, last 2026-10-30T12:00:00Z");
    expect(report.out).toContain("Library/Preferences/com.apple.finder.plist");
    expect(report.out).not.toContain("before.txt");
  });

  it("fails on the terminal Mirror's places, ~/Mirror included", () => {
    for (const rel of [".config/mirror/env", ".mirror-minds/ana/memory.db", "Mirror/README.md", "mirror/x"]) {
      const { run, write } = account();
      run("start");
      execFileSync("/bin/sleep", ["1"]);
      write(rel);
      const report = run("report");
      expect(report.status, rel).toBe(1);
      expect(report.out).toContain("FORBIDDEN: 1");
    }
  });

  it("reads a home the core closed, whose -wal and -shm are gone, in a folder with a space", () => {
    const { home, run } = account();
    run("start");
    const db = join(home, "Mirror Homes", "carlos-antonio", "memory.db");
    mkdirSync(join(db, ".."), { recursive: true });
    // As the core leaves it: WAL mode, closed, no -wal and no -shm (found in the phase 3 acceptance).
    execFileSync(process.execPath, ["-e",
      'const { DatabaseSync } = require("node:sqlite"); const db = new DatabaseSync(process.argv[1]);' +
      'db.exec("PRAGMA journal_mode=WAL; CREATE TABLE runtime_sessions (session_id TEXT, mirror_active INTEGER);' +
      ' CREATE TABLE llm_calls (role TEXT); CREATE TABLE messages (created_at TEXT); INSERT INTO messages VALUES (\'t\')"); db.close();', db],
      { stdio: "ignore" });
    expect(existsSync(`${db}-shm`)).toBe(false);
    const report = run("report");
    expect(report.out).not.toContain("unable to open");
    expect(report.out).toContain("messages: 1, last t");
  });

  it("refuses a report without a start", () => {
    expect(account().run("report").status).toBe(2);
  });
});
