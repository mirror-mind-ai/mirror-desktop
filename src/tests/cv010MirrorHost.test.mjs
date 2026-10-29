import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { assertMarkedHome, createMarkedHome, HOST_METHODS, HOST_PROTOCOL_VERSION, MAX_REQUEST_BYTES } from "../../mirror-host/host.mjs";
import { layoutHost, readPin } from "../../scripts/mirror_host_pin.mjs";

// CV-010.DS-005 phase 2, slice 2b: the host process. It imports the vendored core through
// `mirror-mind/desktop` and serves line-delimited JSON on stdio. Its first line is a handshake;
// every later line answers exactly one request. Only the library's calls are methods, and a
// refusal from the core comes back named, with the host still serving.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let hostDir;

beforeAll(() => {
  hostDir = join(mkdtempSync(join(tmpdir(), "mirror-host-layout-")), "host");
  layoutHost({ root, pin: readPin(root), outDir: hostDir });
});

/** Write a marker by hand, for the refusal cases; the host writes its own when it creates a home. */
function mark(homePath, marker = { line: "0.3", homeId: "home-0000-test", createdAt: "2026-10-29T00:00:00Z" }) {
  mkdirSync(join(homePath, ".mirror-desktop"), { mode: 0o700 });
  writeFileSync(join(homePath, ".mirror-desktop", "home.json"), typeof marker === "string" ? marker : JSON.stringify(marker));
}

/** Start the host with an empty environment; returns a request function and the process. */
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
    const timer = setTimeout(() => reject(new Error(`no line; stderr: ${stderr}`)), 15_000);
    waiting.push((line) => { clearTimeout(timer); resolveLine(line); });
  });
  const send = async (raw) => {
    child.stdin.write(`${typeof raw === "string" ? raw : JSON.stringify(raw)}\n`);
    return JSON.parse(await next());
  };
  const exited = new Promise((resolveExit) => child.on("close", (code) => resolveExit(code)));
  return { child, next, send, exited, stderr: () => stderr };
}

describe("the Mirror host", () => {
  it("opens with a handshake naming its protocol, API, core, Node and methods", async () => {
    const host = startHost();
    const handshake = JSON.parse(await host.next());
    expect(handshake).toEqual({
      type: "ready",
      hostProtocol: HOST_PROTOCOL_VERSION,
      desktopApiVersion: 1,
      coreVersion: "0.37.0",
      node: process.version,
      methods: HOST_METHODS,
    });
    expect(HOST_METHODS).toEqual([
      "inspectMigrationState", "migrateHome", "createMarkedHome", "ensureConversation",
      "appendConversationMessages", "renameConversation", "rebindConversationJourney",
      "readJourneyTree", "listJourneyConversations", "inspectConversation",
    ]);
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("serves the library end to end on a scratch home", async () => {
    const host = startHost();
    await host.next();
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-host-home-")));
    const created = await host.send({ id: 1, method: "createMarkedHome", params: { request: { homePath: join(parent, "ana"), userName: "ana" } } });
    expect(created).toMatchObject({ id: 1, ok: true, result: { homePath: join(parent, "ana") } });
    const dbPath = created.result.dbPath;
    expect(await host.send({ id: 2, method: "inspectMigrationState", params: { dbPath } })).toMatchObject({ id: 2, ok: true, result: { state: "current" } });
    const ensured = await host.send({ id: 3, method: "ensureConversation", params: { dbPath, request: { sessionId: "s1", journeyId: "j1", title: "Primeira", interface: "mirror-desktop-ts" } } });
    expect(ensured.ok).toBe(true);
    const conversationId = ensured.result.conversationId;
    const appended = await host.send({
      id: 4, method: "appendConversationMessages",
      params: { dbPath, request: { schemaVersion: "1.0.0", conversationId, journeyId: "j1", sourceInterface: "mirror-desktop-ts", messages: [{ id: "m-1", role: "user", content: "olá", createdAt: "2026-10-29T12:00:00Z" }] } },
    });
    expect(appended).toMatchObject({ id: 4, ok: true, result: { status: "accepted", insertedCount: 1 } });
    expect(await host.send({ id: 5, method: "renameConversation", params: { dbPath, request: { conversationId, journeyId: "j1", title: "Renomeada" } } })).toMatchObject({ ok: true, result: { title: "Renomeada" } });
    expect(await host.send({ id: 6, method: "rebindConversationJourney", params: { dbPath, request: { conversationId, journeyId: "j2" } } })).toMatchObject({ ok: true, result: { rebound: true } });
    expect(await host.send({ id: 7, method: "listJourneyConversations", params: { dbPath, request: { journeyId: "j2", limit: 10 } } })).toMatchObject({ ok: true, result: [{ conversationId, messageCount: 1 }] });
    expect(await host.send({ id: 8, method: "inspectConversation", params: { dbPath, request: { conversationId } } })).toMatchObject({ ok: true, result: { journeyId: "j2" } });
    expect(await host.send({ id: 9, method: "readJourneyTree", params: { dbPath } })).toMatchObject({ ok: true, result: { findings: [] } });
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
    expect(host.stderr()).not.toMatch(/ExperimentalWarning/);
  });

  it("names every refusal and keeps serving", async () => {
    const host = startHost();
    await host.next();
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-host-refusals-")));
    const missing = join(parent, "nowhere", "memory.db");
    const markedButEmpty = join(parent, "marked-empty");
    mkdirSync(markedButEmpty);
    mark(markedButEmpty);
    const emptyDb = join(markedButEmpty, "memory.db");
    expect(await host.send({ id: 1, method: "readJourneyTree", params: { dbPath: emptyDb } }))
      .toMatchObject({ id: 1, ok: false, error: { name: "DatabaseNotCurrentError", reason: "missing" } });
    expect(await host.send({ id: 2, method: "migrateHome", params: { dbPath: emptyDb, request: { expectedPending: [] } } }))
      .toMatchObject({ id: 2, ok: false, error: { name: "MigrateHomeRejectedError", reason: "not_migratable" } });
    expect(await host.send({ id: 3, method: "createMarkedHome", params: { request: { homePath: parent, userName: "ana" } } }))
      .toMatchObject({ id: 3, ok: false, error: { name: "HomeCreationRefusedError", reason: "home_exists" } });
    const created = await host.send({ id: 4, method: "createMarkedHome", params: { request: { homePath: join(parent, "ana"), userName: "ana" } } });
    expect(await host.send({ id: 5, method: "inspectConversation", params: { dbPath: created.result.dbPath, request: { conversationId: "conv-none-0001" } } }))
      .toMatchObject({ id: 5, ok: false, error: { name: "ConversationCallRejectedError", reason: "conversation_unavailable" } });
    expect(await host.send({ id: 6, method: "inspectMigrationState", params: { dbPath: emptyDb } })).toMatchObject({ id: 6, ok: true, result: { state: "missing" } });
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("refuses anything that is not a request for an allowlisted method, and keeps serving", async () => {
    const host = startHost();
    await host.next();
    for (const method of ["DESKTOP_API_VERSION", "DatabaseNotCurrentError", "constructor", "__proto__", "toString", "deleteConversation"]) {
      expect(await host.send({ id: 1, method, params: {} })).toEqual({
        id: 1, ok: false, error: { name: "HostProtocolError", reason: "unknown_method", message: `unknown method: ${method}` },
      });
    }
    expect(await host.send("{not json")).toMatchObject({ id: null, ok: false, error: { reason: "malformed_request" } });
    expect(await host.send({ method: "readJourneyTree", params: {} })).toMatchObject({ id: null, ok: false, error: { reason: "malformed_request" } });
    expect(await host.send({ id: 2, method: "readJourneyTree", params: [] })).toMatchObject({ id: 2, ok: false, error: { reason: "malformed_request" } });
    expect(await host.send("x".repeat(MAX_REQUEST_BYTES + 1))).toMatchObject({ id: null, ok: false, error: { reason: "limit_exceeded" } });
    expect(await host.send({ id: 3, method: "inspectMigrationState", params: { dbPath: "/nonexistent/memory.db" } })).toMatchObject({ id: 3, ok: false, error: { name: "HomeNotMarkedError" } });
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("opens only a marked 0.3 home, before any core call (condition b)", async () => {
    const host = startHost();
    await host.next();
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-host-marker-")));
    const created = await host.send({ id: 1, method: "createMarkedHome", params: { request: { homePath: join(parent, "ana"), userName: "ana" } } });
    const { homePath, dbPath } = created.result;
    rmSync(join(homePath, ".mirror-desktop"), { recursive: true });
    const refused = (id, method, path = dbPath) => host.send({ id, method, params: { dbPath: path, request: {} } });

    // Unmarked: every method that names a home is refused, the read-only report included.
    for (const method of ["inspectMigrationState", "readJourneyTree", "migrateHome", "ensureConversation"]) {
      expect(await refused(2, method)).toMatchObject({ id: 2, ok: false, error: { name: "HomeNotMarkedError", reason: "unmarked" } });
    }
    // Malformed or foreign markers are refused too.
    for (const marker of ["{not json", { line: "0.2", homeId: "home-0000-test", createdAt: "x" }, { line: "0.3", homeId: "", createdAt: "x" }, { line: "0.3", homeId: "home-0000-test", createdAt: "x", extra: 1 }]) {
      const other = join(parent, `bad-${Math.random().toString(16).slice(2)}`);
      mkdirSync(other);
      mark(other, marker);
      expect(await refused(3, "inspectMigrationState", join(other, "memory.db"))).toMatchObject({ ok: false, error: { name: "HomeNotMarkedError" } });
    }
    // A path that is not <home>/memory.db, a relative path, and a symlinked home are refused.
    expect(await refused(4, "inspectMigrationState", join(homePath, "other.db"))).toMatchObject({ ok: false, error: { name: "HomeNotMarkedError", reason: "invalid_home" } });
    expect(await refused(5, "inspectMigrationState", "ana/memory.db")).toMatchObject({ ok: false, error: { name: "HomeNotMarkedError", reason: "invalid_home" } });
    mark(homePath);
    const link = join(parent, "linked");
    symlinkSync(homePath, link);
    expect(await refused(6, "inspectMigrationState", join(link, "memory.db"))).toMatchObject({ ok: false, error: { name: "HomeNotMarkedError", reason: "invalid_home" } });
    // Marked: served.
    expect(await refused(7, "inspectMigrationState")).toMatchObject({ id: 7, ok: true, result: { state: "current" } });
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("creates a home marked before it appears, and refuses before creating anything (slice 3a)", async () => {
    const host = startHost();
    await host.next();
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-host-create-")));
    const created = await host.send({ id: 1, method: "createMarkedHome", params: { request: { homePath: join(parent, "ana"), userName: "ana" } } });
    expect(created).toMatchObject({ id: 1, ok: true, result: { homePath: join(parent, "ana"), dbPath: join(parent, "ana", "memory.db") } });
    expect(created.result.homeId).toMatch(/^home-[0-9a-f-]{36}$/);
    expect(() => assertMarkedHome(created.result.dbPath)).not.toThrow();
    const marker = JSON.parse(readFileSync(join(parent, "ana", ".mirror-desktop", "home.json"), "utf8"));
    expect(marker).toEqual({ line: "0.3", homeId: created.result.homeId, createdAt: expect.any(String) });
    expect(statSync(join(parent, "ana", ".mirror-desktop", "home.json")).mode & 0o777).toBe(0o600);
    expect(await host.send({ id: 2, method: "inspectMigrationState", params: { dbPath: created.result.dbPath } })).toMatchObject({ ok: true, result: { state: "current" } });

    mkdirSync(join(parent, ".mirror-minds"));
    mkdirSync(join(parent, "real"));
    // A checkout, as `~/mirror` is: neither it nor a folder under it may hold a home.
    mkdirSync(join(parent, "checkout", ".git"), { recursive: true });
    mkdirSync(join(parent, "checkout", "docs"));
    symlinkSync(join(parent, "real"), join(parent, "linked"));
    const refusals = [
      [join(parent, ".mirror-minds", "new"), "ana", "HomeCreationRefusedError", "reserved_location"],
      [join(parent, ".Mirror-Minds", "new"), "ana", "HomeCreationRefusedError", "reserved_location"],
      [join(parent, "checkout", "ana"), "ana", "HomeCreationRefusedError", "inside_repository"],
      [join(parent, "checkout", "docs", "ana"), "ana", "HomeCreationRefusedError", "inside_repository"],
      ["relative/home", "ana", "HomeCreationRefusedError", "invalid_home_path"],
      [`${join(parent, "real")}/../sneaky`, "ana", "HomeCreationRefusedError", "invalid_home_path"],
      [`${join(parent, "zed")}/`, "zed", "HomeCreationRefusedError", "invalid_home_path"],
      [join(parent, "missing", "home"), "ana", "HomeCreationRefusedError", "invalid_home_path"],
      [join(parent, "linked", "home"), "ana", "HomeCreationRefusedError", "invalid_home_path"],
      [join(parent, "ana"), "ana", "HomeCreationRefusedError", "home_exists"],
      [join(parent, "bia"), "Bia Souza", "CreateHomeRejectedError", "invalid_user_name"],
    ];
    for (const [homePath, userName, name, reason] of refusals) {
      expect(await host.send({ id: 3, method: "createMarkedHome", params: { request: { homePath, userName } } }))
        .toMatchObject({ id: 3, ok: false, error: { name, reason } });
    }
    expect(readdirSync(parent).sort()).toEqual([".mirror-minds", "ana", "checkout", "linked", "real"]);
    expect(readdirSync(join(parent, "checkout")).sort()).toEqual([".git", "docs"]);
    expect(readdirSync(join(parent, "checkout", "docs"))).toEqual([]);
    expect(readdirSync(join(parent, ".mirror-minds"))).toEqual([]);
    expect(readdirSync(join(parent, "real"))).toEqual([]);
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("leaves nothing behind when the marker or the rename fails after the core created the home", () => {
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "mirror-host-staging-")));
    // A core whose home already holds a file where the marker's folder goes: the marker fails.
    const blocking = { createHome: ({ homePath }) => { mkdirSync(homePath); writeFileSync(join(homePath, ".mirror-desktop"), ""); return { homePath, seeded: {} }; } };
    expect(() => createMarkedHome(blocking, { homePath: join(parent, "ana"), userName: "ana" })).toThrow();
    expect(readdirSync(parent)).toEqual([]);
    // Someone else's folder appears at the target while the home is made: theirs is kept, ours removed.
    const racing = { createHome: ({ homePath }) => { mkdirSync(homePath); mkdirSync(join(parent, "bia")); writeFileSync(join(parent, "bia", "theirs"), "x"); return { homePath, seeded: {} }; } };
    expect(() => createMarkedHome(racing, { homePath: join(parent, "bia"), userName: "bia" })).toThrow(/already exists/);
    expect(readdirSync(parent)).toEqual(["bia"]);
    expect(readdirSync(join(parent, "bia"))).toEqual(["theirs"]);
  });

  it("is laid out with its core and a receipt, never from the repository's node_modules", () => {
    const receipt = JSON.parse(readFileSync(join(hostDir, "pin-receipt.json"), "utf8"));
    expect(receipt.core.commit).toBe(readPin(root).core.commit);
    expect(receipt.host.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(readFileSync(join(hostDir, "node_modules", "mirror-mind", "package.json"), "utf8")).toContain('"version": "0.37.0"');
  });
});
