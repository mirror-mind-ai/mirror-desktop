// CV-010.DS-005 phase 2, slice 2b: the Mirror host.
//
// Mirror Desktop TS runs the TypeScript core in this process, under the pinned Node, and talks to
// it over stdio. The protocol is one JSON object per line:
//
//   - The host's first line is a handshake:
//     `{type: "ready", hostProtocol, desktopApiVersion, coreVersion, node, methods}`.
//     The supervisor (`src-tauri/src/mirror_host.rs`) refuses a host whose versions it does not
//     expect.
//   - Each request is `{id, method, params}`, where `id` is a non-negative integer and `params` an
//     object. Each response is `{id, ok: true, result}` or
//     `{id, ok: false, error: {name, reason, message}}`, in request order.
//
// The methods are the library's calls and nothing else, named in `HOST_METHODS`. A refusal from
// the core is a response, not a crash: the host keeps serving. A line the host cannot read as a
// request is answered with `id: null`.
//
// The host reads no environment variable, and stdout carries the protocol alone. `console.log` is
// sent to stderr, and Node's ExperimentalWarning for `node:sqlite` is dropped. The host exits 0
// when stdin closes.
//
// This file lives beside the core's `node_modules` in a laid-out runtime
// (`scripts/mirror_host_pin.mjs`), which is how `mirror-mind/desktop` resolves.

import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export const HOST_PROTOCOL_VERSION = 1;
/** Four times the core's append payload bound, for the envelope around it. */
export const MAX_REQUEST_BYTES = 1_048_576;
const MAX_MESSAGE_CHARS = 1_000;

/** Each method: how its params become the library call's arguments. */
const CALLS = {
  inspectMigrationState: (d, p) => d.inspectMigrationState(p.dbPath),
  migrateHome: (d, p) => d.migrateHome(p.dbPath, p.request),
  createHome: (d, p) => d.createHome(p.request),
  ensureConversation: (d, p) => d.ensureConversation(p.dbPath, p.request),
  appendConversationMessages: (d, p) => d.appendConversationMessages(p.dbPath, p.request),
  renameConversation: (d, p) => d.renameConversation(p.dbPath, p.request),
  rebindConversationJourney: (d, p) => d.rebindConversationJourney(p.dbPath, p.request),
  readJourneyTree: (d, p) => d.readJourneyTree(p.dbPath),
  listJourneyConversations: (d, p) => d.listJourneyConversations(p.dbPath, p.request),
  inspectConversation: (d, p) => d.inspectConversation(p.dbPath, p.request),
};
export const HOST_METHODS = Object.keys(CALLS);

const REFUSALS = [
  ["DatabaseNotCurrentError", (error) => error.state],
  ["ConversationCallRejectedError", (error) => error.reason],
  ["CreateHomeRejectedError", (error) => error.reason],
  ["MigrateHomeRejectedError", (error) => error.reason],
];

function failure(id, name, reason, message) {
  return { id, ok: false, error: { name, reason, message: String(message).slice(0, MAX_MESSAGE_CHARS) } };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Answer one request line. Exported for the supervisor's tests to share the shape. */
export function answer(desktop, line) {
  if (Buffer.byteLength(line, "utf8") > MAX_REQUEST_BYTES) {
    return failure(null, "HostProtocolError", "limit_exceeded", `request exceeds ${MAX_REQUEST_BYTES} bytes`);
  }
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return failure(null, "HostProtocolError", "malformed_request", "request is not JSON");
  }
  if (!isRecord(request) || !Number.isSafeInteger(request.id) || request.id < 0) {
    return failure(null, "HostProtocolError", "malformed_request", "request has no integer id");
  }
  const { id, method, params } = request;
  if (typeof method !== "string" || !Object.hasOwn(CALLS, method)) {
    return failure(id, "HostProtocolError", "unknown_method", `unknown method: ${method}`);
  }
  if (!isRecord(params)) return failure(id, "HostProtocolError", "malformed_request", "params is not an object");
  try {
    return { id, ok: true, result: CALLS[method](desktop, params) };
  } catch (error) {
    for (const [name, reasonOf] of REFUSALS) {
      if (error instanceof desktop[name]) return failure(id, name, reasonOf(error), error.message);
    }
    return failure(id, "Error", "internal", error instanceof Error ? error.message : error);
  }
}

async function main() {
  process.removeAllListeners("warning");
  process.on("warning", (warning) => {
    if (warning.name !== "ExperimentalWarning") process.stderr.write(`${warning.name}: ${warning.message}\n`);
  });
  console.log = (...args) => console.error(...args);
  const desktop = await import("mirror-mind/desktop");
  const core = createRequire(import.meta.url)("mirror-mind/package.json");
  const write = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
  write({
    type: "ready",
    hostProtocol: HOST_PROTOCOL_VERSION,
    desktopApiVersion: desktop.DESKTOP_API_VERSION,
    coreVersion: core.version,
    node: process.version,
    methods: HOST_METHODS,
  });
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY })) {
    write(answer(desktop, line));
  }
}

// The entry check compares real paths: Node resolves the main module through symlinks, and
// macOS reaches its temp folder through one.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  await main();
}
