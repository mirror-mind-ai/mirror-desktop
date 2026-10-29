import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { HOST_METHODS, HOST_PROTOCOL_VERSION, MAX_REQUEST_BYTES } from "../../mirror-host/host.mjs";
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
      "inspectMigrationState", "migrateHome", "createHome", "ensureConversation",
      "appendConversationMessages", "renameConversation", "rebindConversationJourney",
      "readJourneyTree", "listJourneyConversations", "inspectConversation",
    ]);
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("serves the library end to end on a scratch home", async () => {
    const host = startHost();
    await host.next();
    const parent = mkdtempSync(join(tmpdir(), "mirror-host-home-"));
    const created = await host.send({ id: 1, method: "createHome", params: { request: { homePath: join(parent, "ana"), userName: "ana" } } });
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
    const parent = mkdtempSync(join(tmpdir(), "mirror-host-refusals-"));
    const missing = join(parent, "nowhere", "memory.db");
    expect(await host.send({ id: 1, method: "readJourneyTree", params: { dbPath: missing } }))
      .toMatchObject({ id: 1, ok: false, error: { name: "DatabaseNotCurrentError", reason: "missing" } });
    expect(await host.send({ id: 2, method: "migrateHome", params: { dbPath: missing, request: { expectedPending: [] } } }))
      .toMatchObject({ id: 2, ok: false, error: { name: "MigrateHomeRejectedError", reason: "not_migratable" } });
    expect(await host.send({ id: 3, method: "createHome", params: { request: { homePath: parent, userName: "ana" } } }))
      .toMatchObject({ id: 3, ok: false, error: { name: "CreateHomeRejectedError", reason: "home_exists" } });
    const created = await host.send({ id: 4, method: "createHome", params: { request: { homePath: join(parent, "ana"), userName: "ana" } } });
    expect(await host.send({ id: 5, method: "inspectConversation", params: { dbPath: created.result.dbPath, request: { conversationId: "conv-none-0001" } } }))
      .toMatchObject({ id: 5, ok: false, error: { name: "ConversationCallRejectedError", reason: "conversation_unavailable" } });
    expect(await host.send({ id: 6, method: "inspectMigrationState", params: { dbPath: missing } })).toMatchObject({ id: 6, ok: true, result: { state: "missing" } });
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
    expect(await host.send({ id: 3, method: "inspectMigrationState", params: { dbPath: "/nonexistent/memory.db" } })).toMatchObject({ id: 3, ok: true });
    host.child.stdin.end();
    expect(await host.exited).toBe(0);
  });

  it("is laid out with its core and a receipt, never from the repository's node_modules", () => {
    const receipt = JSON.parse(readFileSync(join(hostDir, "pin-receipt.json"), "utf8"));
    expect(receipt.core.commit).toBe(readPin(root).core.commit);
    expect(receipt.host.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(readFileSync(join(hostDir, "node_modules", "mirror-mind", "package.json"), "utf8")).toContain('"version": "0.37.0"');
  });
});
