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
// Condition (b) of the 0.3 line: the host opens only a marked 0.3 home. Every method that names a
// database (all but `createMarkedHome`) is refused, before the core is called, unless `dbPath` is
// `<home>/memory.db` for a home that is a real directory (no symlink anywhere in its path) holding
// `.mirror-desktop/home.json` with exactly `{line: "0.3", homeId, createdAt}`. The production
// Python home carries no marker, so it is never opened. The supervisor checks the same marker.
//
// The host also never makes an unmarked home (slice 3a). `createMarkedHome` has the core create the
// home under a hidden name beside the target, writes the marker inside it, and renames it into
// place, so a home appears marked or not at all. It refuses a target that exists, a parent reached
// through a symlink, any path with a `.mirror-minds` component, where the Python homes live, and any
// folder inside a git repository: a Mirror checkout is one, and macOS folds case, so `~/Mirror` can
// be the production checkout `~/mirror`.
//
// The host reads no environment variable, and stdout carries the protocol alone. `console.log` is
// sent to stderr, and Node's ExperimentalWarning for `node:sqlite` is dropped. The host exits 0
// when stdin closes.
//
// This file lives beside the core's `node_modules` in a laid-out runtime
// (`scripts/mirror_host_pin.mjs`), which is how `mirror-mind/desktop` resolves.

import { randomBytes, randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
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
  createMarkedHome: (d, p) => createMarkedHome(d, p.request),
  ensureConversation: (d, p) => d.ensureConversation(p.dbPath, p.request),
  appendConversationMessages: (d, p) => d.appendConversationMessages(p.dbPath, p.request),
  renameConversation: (d, p) => d.renameConversation(p.dbPath, p.request),
  rebindConversationJourney: (d, p) => d.rebindConversationJourney(p.dbPath, p.request),
  readJourneyTree: (d, p) => d.readJourneyTree(p.dbPath),
  listJourneyConversations: (d, p) => d.listJourneyConversations(p.dbPath, p.request),
  inspectConversation: (d, p) => d.inspectConversation(p.dbPath, p.request),
};
export const HOST_METHODS = Object.keys(CALLS);

export const HOME_LINE = "0.3";
const MARKER_KEYS = ["createdAt", "homeId", "line"];
const HOME_ID = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;
const MAX_MARKER_BYTES = 4_096;

class HomeNotMarkedError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

/** Throw unless `dbPath` is `<home>/memory.db` of a marked 0.3 home. */
export function assertMarkedHome(dbPath) {
  if (typeof dbPath !== "string" || !isAbsolute(dbPath) || basename(dbPath) !== "memory.db") {
    throw new HomeNotMarkedError("invalid_home", "dbPath must be <home>/memory.db, absolute");
  }
  const home = dirname(dbPath);
  let real;
  try {
    real = realpathSync(home);
  } catch {
    throw new HomeNotMarkedError("unmarked", `no home at ${home}`);
  }
  if (real !== home) throw new HomeNotMarkedError("invalid_home", "the home path passes through a symlink");
  const markerPath = `${home}/.mirror-desktop/home.json`;
  let marker;
  try {
    const stat = lstatSync(markerPath);
    if (!stat.isFile() || stat.size > MAX_MARKER_BYTES) throw new Error("not a small regular file");
    marker = JSON.parse(readFileSync(markerPath, "utf8"));
  } catch {
    throw new HomeNotMarkedError("unmarked", `${home} is not a marked 0.3 home`);
  }
  const valid = isRecord(marker)
    && Object.keys(marker).sort().join(",") === MARKER_KEYS.join(",")
    && marker.line === HOME_LINE
    && typeof marker.homeId === "string" && HOME_ID.test(marker.homeId)
    && typeof marker.createdAt === "string" && marker.createdAt.length > 0;
  if (!valid) throw new HomeNotMarkedError("unmarked", `${home} carries a marker that is not a 0.3 home's`);
}

/** Write the 0.3 marker into `homePath`, which has none; returns its homeId. */
export function writeMarker(homePath) {
  const homeId = `home-${randomUUID()}`;
  mkdirSync(join(homePath, ".mirror-desktop"), { mode: 0o700 });
  writeFileSync(
    join(homePath, ".mirror-desktop", "home.json"),
    `${JSON.stringify({ line: HOME_LINE, homeId, createdAt: new Date().toISOString() })}\n`,
    { flag: "wx", mode: 0o600 },
  );
  return homeId;
}

class HomeCreationRefusedError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

function occupied(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Create a seeded, marked 0.3 home at `request.homePath`, or nothing at all. */
export function createMarkedHome(desktop, request) {
  const homePath = request?.homePath;
  if (typeof homePath !== "string" || !isAbsolute(homePath) || resolve(homePath) !== homePath) {
    throw new HomeCreationRefusedError("invalid_home_path", "the home path must be absolute and normalized");
  }
  if (homePath.split(sep).some((part) => part.toLowerCase() === ".mirror-minds")) {
    throw new HomeCreationRefusedError("reserved_location", `${homePath} is under .mirror-minds, where the Python homes live`);
  }
  const parent = dirname(homePath);
  let realParent;
  try {
    realParent = realpathSync(parent);
  } catch {
    throw new HomeCreationRefusedError("invalid_home_path", `the folder ${parent} does not exist`);
  }
  if (realParent !== parent) throw new HomeCreationRefusedError("invalid_home_path", `the folder ${parent} passes through a symlink`);
  if (!statSync(parent).isDirectory()) throw new HomeCreationRefusedError("invalid_home_path", `${parent} is not a folder`);
  for (let folder = parent; ; folder = dirname(folder)) {
    if (occupied(join(folder, ".git"))) {
      throw new HomeCreationRefusedError("inside_repository", `${parent} is inside the repository ${folder}`);
    }
    if (dirname(folder) === folder) break;
  }
  if (occupied(homePath)) throw new HomeCreationRefusedError("home_exists", `${homePath} already exists`);

  const staging = join(parent, `.${basename(homePath)}.marking-${randomBytes(6).toString("hex")}`);
  try {
    const created = desktop.createHome({ homePath: staging, userName: request.userName });
    const homeId = writeMarker(created.homePath);
    // The last check; the race left between it and the rename is the one the core's own accepts.
    if (occupied(homePath)) throw new HomeCreationRefusedError("home_exists", `${homePath} already exists`);
    renameSync(staging, homePath);
    return { homePath, dbPath: join(homePath, "memory.db"), homeId, seeded: created.seeded };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

const REFUSALS = [
  ["HomeNotMarkedError", (error) => error.reason, HomeNotMarkedError],
  ["HomeCreationRefusedError", (error) => error.reason, HomeCreationRefusedError],
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
    if (method !== "createMarkedHome") assertMarkedHome(params.dbPath);
    return { id, ok: true, result: CALLS[method](desktop, params) };
  } catch (error) {
    for (const [name, reasonOf, ownClass] of REFUSALS) {
      if (error instanceof (ownClass ?? desktop[name])) return failure(id, name, reasonOf(error), error.message);
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
