// CV-010.DS-005 slice 3c-1: connect a model provider through the app's own Pi.
//
//   node pi-auth.mjs status --pi <package dir>
//   node pi-auth.mjs login --pi <package dir> --provider <id> --type oauth|api_key --device-id-file <path>
//   node pi-auth.mjs logout --pi <package dir> --provider <id>
//
// Run by the app with the Node it carries, against the Pi it installed (`--pi` is that package's
// folder). Pi keeps the credentials, in its own `~/.pi/agent/auth.json`; this script never prints
// one, and Mirror Desktop keeps none (decision 3).
//
// `status` prints one JSON line: every provider Pi knows, how it can be signed in to, and whether it
// is ready. Readiness is Pi's own check over a read-only view of its credentials, the one
// `pi auth check --no-refresh` uses, so nothing is refreshed or written. `stored` says whether Pi
// holds a sign-in for it; a provider ready only through the environment is not stored.
//
// `login` runs Pi's own login and speaks JSON lines. Out, on stdout: `select`, `prompt` (text,
// secret or manual_code) and `prompt_closed` with an id, `auth_url`, `device_code`, `info`,
// `progress`, then `done` with the provider's readiness or `failed` with a reason. In, on stdin:
// `{"answer":{"id":…,"value":…}}` or `{"cancel":true}`. A secret answer is handed to Pi and never
// written anywhere by this script. Pi does not open a browser; the app opens `auth_url`.
//
// `logout` (slice 3c-2) removes the sign-in Pi stored for a provider, with Pi's own logout, and says
// `disconnected` with the provider's readiness afterwards: still ready if the environment provides it.

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUS_CHECK_TIMEOUT_MS = 5_000;

export class PiAuthError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

/** Pi's SDK, from the package folder of the app's Pi. */
export async function loadPi(packageDir) {
  const index = join(packageDir, "dist", "index.js");
  const storage = join(packageDir, "dist", "core", "auth-storage.js");
  if (!existsSync(index) || !existsSync(storage)) throw new PiAuthError("pi_unavailable", "the app's Pi is not where it was installed");
  const { ModelRuntime } = await import(pathToFileURL(index).href);
  const { ReadOnlyAuthStorage } = await import(pathToFileURL(storage).href);
  return { ModelRuntime, ReadOnlyAuthStorage };
}

function describeProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    apiKey: Boolean(provider.auth?.apiKey?.login),
    oauth: Boolean(provider.auth?.oauth),
    ...(provider.auth?.oauth?.name ? { oauthName: provider.auth.oauth.name } : {}),
  };
}

/** Readiness as `{type, source}`, without the credential; null when not ready. */
function readiness(check) {
  if (!check || (check.type !== "api_key" && check.type !== "oauth")) return null;
  return { type: check.type, ...(typeof check.source === "string" ? { source: check.source } : {}) };
}

export async function providerStatus(pi) {
  const runtime = await pi.ModelRuntime.create({ credentials: new pi.ReadOnlyAuthStorage(), modelsPath: null, refreshOnCreate: false });
  const stored = await storedProviders(runtime);
  const providers = [];
  for (const provider of runtime.getProviders()) {
    const check = await runtime.checkAuth(provider.id, { signal: AbortSignal.timeout(STATUS_CHECK_TIMEOUT_MS) }).catch(() => undefined);
    providers.push({ ...describeProvider(provider), stored: stored.has(provider.id), ready: readiness(check) });
  }
  return { providers };
}

/** The providers Pi holds a sign-in for. */
async function storedProviders(runtime) {
  const credentials = await runtime.listCredentials().catch(() => []);
  return new Set(credentials.map((credential) => credential.providerId));
}

/** Remove the sign-in Pi stored for `providerId`; resolves with its readiness afterwards. */
export async function disconnect({ pi, providerId }) {
  const runtime = await pi.ModelRuntime.create({ modelsPath: null, refreshOnCreate: false });
  const provider = runtime.getProvider(providerId);
  if (!provider) throw new PiAuthError("unknown_provider", `Pi has no provider ${providerId}`);
  if (!(await storedProviders(runtime)).has(providerId)) throw new PiAuthError("not_stored", `Pi holds no sign-in for ${provider.name}`);
  try {
    await runtime.logout(providerId);
  } catch (error) {
    throw new PiAuthError("logout_failed", error instanceof Error ? error.message : String(error));
  }
  const check = await runtime.checkAuth(providerId).catch(() => undefined);
  return readiness(check);
}

/** The app installation's stable id, made on first use; OpenAI's sign-in asks for one. */
export function deviceId(file) {
  if (existsSync(file)) {
    const id = readFileSync(file, "utf8").trim();
    if (DEVICE_ID.test(id)) return id;
  }
  const id = randomUUID();
  writeFileSync(file, `${id}\n`, { mode: 0o600 });
  return id;
}

/**
 * Run Pi's login for `providerId`. `say(event)` sends an event out; `answers` is an async iterable of
 * parsed input lines. Resolves with the provider's readiness afterwards.
 */
export async function login({ pi, providerId, type, deviceIdFile, say, answers }) {
  if (type !== "oauth" && type !== "api_key") throw new PiAuthError("invalid_request", "the sign-in type is not oauth or api_key");
  const runtime = await pi.ModelRuntime.create({ modelsPath: null, refreshOnCreate: false });
  const provider = runtime.getProvider(providerId);
  if (!provider) throw new PiAuthError("unknown_provider", `Pi has no provider ${providerId}`);
  if (type === "oauth" ? !provider.auth?.oauth : !provider.auth?.apiKey?.login) {
    throw new PiAuthError("unsupported_login", `${provider.name} has no ${type === "oauth" ? "sign-in" : "API key"} login`);
  }

  const controller = new AbortController();
  const pending = new Map();
  let next = 0;
  const reader = (async () => {
    for await (const message of answers) {
      if (message?.cancel === true) {
        controller.abort();
        break;
      }
      const answer = message?.answer;
      const waiting = typeof answer?.id === "string" ? pending.get(answer.id) : undefined;
      if (waiting && typeof answer.value === "string") {
        pending.delete(answer.id);
        waiting.resolve(answer.value);
      }
    }
    // Input closed: the app is gone, so nobody can answer.
    if (!controller.signal.aborted) controller.abort();
  })();

  const interaction = {
    signal: controller.signal,
    prompt(prompt) {
      const id = `p${++next}`;
      return new Promise((resolve, reject) => {
        const close = () => {
          if (!pending.has(id)) return;
          pending.delete(id);
          say({ event: "prompt_closed", id });
          reject(new Error("prompt closed"));
        };
        pending.set(id, { resolve });
        prompt.signal?.addEventListener("abort", close, { once: true });
        controller.signal.addEventListener("abort", close, { once: true });
        if (prompt.type === "select") {
          say({ event: "select", id, message: prompt.message, options: prompt.options.map(({ id: value, label, description }) => ({ id: value, label, ...(description ? { description } : {}) })) });
        } else {
          say({ event: "prompt", id, kind: prompt.type, message: prompt.message, ...(prompt.placeholder ? { placeholder: prompt.placeholder } : {}) });
        }
      });
    },
    notify(event) {
      if (event.type === "auth_url") say({ event: "auth_url", url: event.url, ...(event.instructions ? { instructions: event.instructions } : {}) });
      else if (event.type === "device_code") say({ event: "device_code", userCode: event.userCode, verificationUri: event.verificationUri });
      else if (event.type === "info" || event.type === "progress") say({ event: event.type, message: event.message });
    },
  };
  try {
    await runtime.login(providerId, type, interaction, { agentName: "Mirror Desktop", getDeviceId: () => deviceId(deviceIdFile) });
  } catch (error) {
    if (controller.signal.aborted) throw new PiAuthError("cancelled", "the sign-in was cancelled");
    throw new PiAuthError("login_failed", error instanceof Error ? error.message : String(error));
  } finally {
    // The reader waits on input that may never close; once the login settles nobody answers it.
    controller.abort();
    reader.catch(() => {});
  }
  const check = await runtime.checkAuth(providerId).catch(() => undefined);
  return readiness(check);
}

function argument(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

async function* jsonLines(stream) {
  for await (const line of createInterface({ input: stream })) {
    try {
      yield JSON.parse(line);
    } catch {
      // Not a message.
    }
  }
}

async function main(argv) {
  const say = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);
  const [command] = argv;
  const packageDir = argument(argv, "--pi");
  try {
    if (!packageDir) throw new PiAuthError("usage", "usage: pi-auth.mjs status|login|logout --pi <package dir>");
    const pi = await loadPi(packageDir);
    if (command === "status") {
      say({ event: "status", ...(await providerStatus(pi)) });
      return 0;
    }
    if (command === "login") {
      const [providerId, type, deviceIdFile] = ["--provider", "--type", "--device-id-file"].map((name) => argument(argv, name));
      if (!providerId || !type || !deviceIdFile) throw new PiAuthError("usage", "login needs --provider, --type and --device-id-file");
      const ready = await login({ pi, providerId, type, deviceIdFile, say, answers: jsonLines(process.stdin) });
      say({ event: "done", provider: providerId, ready });
      return 0;
    }
    if (command === "logout") {
      const providerId = argument(argv, "--provider");
      if (!providerId) throw new PiAuthError("usage", "logout needs --provider");
      say({ event: "disconnected", provider: providerId, ready: await disconnect({ pi, providerId }) });
      return 0;
    }
    throw new PiAuthError("usage", "usage: pi-auth.mjs status|login|logout --pi <package dir>");
  } catch (error) {
    say({ event: "failed", reason: error.reason ?? "failed", message: error.message });
    return 1;
  }
}

/** Whether this file is the script Node was asked to run; real paths on both sides (see pi-install.mjs). */
function isEntryPoint() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  process.exitCode = await main(process.argv.slice(2));
  // Pi's login may leave a callback server open after it settles; the outcome is already said.
  process.exit();
}
