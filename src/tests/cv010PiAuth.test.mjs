import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deviceId, disconnect, login, providerStatus } from "../../mirror-host/pi-auth.mjs";

// CV-010.DS-005 slice 3c-1: the sign-in helper speaks for Pi's own SDK. Readiness comes from a
// read-only view of Pi's credentials; a sign-in's prompts go out and answers come in as JSON lines,
// and no credential is ever said.

function scratch() {
  return realpathSync(mkdtempSync(join(tmpdir(), "pi-auth-")));
}

/** A Pi SDK stand-in: two providers, a store, and a login that asks what each provider asks. */
function fakePi({ stored = {}, environment = {}, onLogin } = {}) {
  const store = { ...stored };
  const providers = [
    { id: "anthropic", name: "Anthropic", auth: { apiKey: { login: () => {} }, oauth: { name: "Anthropic (Claude Pro/Max)" } } },
    { id: "deepseek", name: "DeepSeek", auth: { apiKey: { login: () => {} } } },
    { id: "ambient", name: "Ambient", auth: { apiKey: {} } },
  ];
  const created = [];
  class ReadOnlyAuthStorage { readOnly = true; }
  const ModelRuntime = {
    async create(options) {
      created.push(options);
      return {
        getProviders: () => providers,
        getProvider: (id) => providers.find((provider) => provider.id === id),
        async checkAuth(id) {
          if (store[id]) return { type: store[id].type, source: "stored credential", key: store[id].key };
          return environment[id] ? { type: "api_key", source: environment[id] } : undefined;
        },
        async listCredentials() {
          return Object.entries(store).map(([providerId, credential]) => ({ providerId, type: credential.type }));
        },
        async logout(id) {
          delete store[id];
        },
        async login(id, type, interaction, options) {
          const credential = await onLogin({ id, type, interaction, options });
          store[id] = credential;
          return credential;
        },
      };
    },
  };
  return { pi: { ModelRuntime, ReadOnlyAuthStorage }, store, created };
}

/** Answers as an async iterable the test feeds. */
function channel() {
  const queue = [];
  let wake;
  let closed = false;
  return {
    push(message) { queue.push(message); wake?.(); },
    close() { closed = true; wake?.(); },
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (queue.length > 0) { yield queue.shift(); continue; }
        if (closed) return;
        await new Promise((resolve) => { wake = resolve; });
        wake = undefined;
      }
    },
  };
}

describe("provider status", () => {
  it("lists every provider with its ways to sign in and readiness, read-only and without a credential", async () => {
    const { pi, created } = fakePi({ stored: { deepseek: { type: "api_key", key: "sk-SECRET" } } });
    const status = await providerStatus(pi);
    expect(status.providers).toEqual([
      { id: "anthropic", name: "Anthropic", apiKey: true, oauth: true, oauthName: "Anthropic (Claude Pro/Max)", stored: false, ready: null },
      { id: "deepseek", name: "DeepSeek", apiKey: true, oauth: false, stored: true, ready: { type: "api_key", source: "stored credential" } },
      { id: "ambient", name: "Ambient", apiKey: false, oauth: false, stored: false, ready: null },
    ]);
    expect(created[0].credentials).toBeInstanceOf(pi.ReadOnlyAuthStorage);
    expect(created[0].refreshOnCreate).toBe(false);
    expect(JSON.stringify(status)).not.toContain("SECRET");
  });
});

describe("signing in", () => {
  it("asks for an API key, hands the answer to Pi, and says only the readiness", async () => {
    const { pi, store } = fakePi({
      onLogin: async ({ interaction }) => ({ type: "api_key", key: await interaction.prompt({ type: "secret", message: "Enter DeepSeek API key" }) }),
    });
    const said = [];
    const answers = channel();
    const done = login({ pi, providerId: "deepseek", type: "api_key", deviceIdFile: join(scratch(), "id"), say: (event) => {
      said.push(event);
      if (event.event === "prompt") answers.push({ answer: { id: event.id, value: "sk-TYPED-SECRET" } });
    }, answers });
    await expect(done).resolves.toEqual({ type: "api_key", source: "stored credential" });
    expect(said).toEqual([{ event: "prompt", id: "p1", kind: "secret", message: "Enter DeepSeek API key" }]);
    expect(store.deepseek.key).toBe("sk-TYPED-SECRET");
    expect(JSON.stringify(said)).not.toContain("SECRET");
  });

  it("forwards a choice, the page to open, and closes a prompt Pi stops waiting for", async () => {
    const { pi } = fakePi({
      onLogin: async ({ interaction, options }) => {
        const method = await interaction.prompt({ type: "select", message: "Select Anthropic login method:", options: [{ id: "browser", label: "Browser login (default)" }, { id: "copy_code", label: "Copy code login" }] });
        expect(method).toBe("browser");
        expect(options.agentName).toBe("Mirror Desktop");
        interaction.notify({ type: "auth_url", url: "https://claude.ai/oauth/authorize", instructions: "Complete login in your browser." });
        const callback = new AbortController();
        const manual = interaction.prompt({ type: "manual_code", message: "Or paste the code", signal: callback.signal }).catch(() => "closed");
        callback.abort();
        expect(await manual).toBe("closed");
        return { type: "oauth" };
      },
    });
    const said = [];
    const answers = channel();
    const ready = await login({ pi, providerId: "anthropic", type: "oauth", deviceIdFile: join(scratch(), "id"), say: (event) => {
      said.push(event);
      if (event.event === "select") answers.push({ answer: { id: event.id, value: "browser" } });
    }, answers });
    expect(ready).toEqual({ type: "oauth", source: "stored credential" });
    expect(said.map((event) => event.event)).toEqual(["select", "auth_url", "prompt", "prompt_closed"]);
    expect(said[0].options).toEqual([{ id: "browser", label: "Browser login (default)" }, { id: "copy_code", label: "Copy code login" }]);
    expect(said[3]).toEqual({ event: "prompt_closed", id: said[2].id });
  });

  it("ignores an answer to another prompt, and a cancel ends the sign-in as cancelled", async () => {
    const { pi, store } = fakePi({ onLogin: async ({ interaction }) => ({ type: "api_key", key: await interaction.prompt({ type: "secret", message: "key" }) }) });
    const answers = channel();
    const done = login({ pi, providerId: "deepseek", type: "api_key", deviceIdFile: join(scratch(), "id"), say: (event) => {
      if (event.event === "prompt") {
        answers.push({ answer: { id: "p9", value: "wrong prompt" } });
        answers.push({ cancel: true });
      }
    }, answers });
    await expect(done).rejects.toMatchObject({ reason: "cancelled" });
    expect(store.deepseek).toBeUndefined();
  });

  it("ends as cancelled when the app's input closes", async () => {
    const { pi } = fakePi({ onLogin: async ({ interaction }) => ({ type: "api_key", key: await interaction.prompt({ type: "secret", message: "key" }) }) });
    const answers = channel();
    const done = login({ pi, providerId: "deepseek", type: "api_key", deviceIdFile: join(scratch(), "id"), say: () => answers.close(), answers });
    await expect(done).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("refuses an unknown provider, a sign-in it does not offer, and an unknown type, before Pi runs", async () => {
    let ran = false;
    const { pi } = fakePi({ onLogin: async () => { ran = true; return { type: "api_key" }; } });
    const base = { pi, deviceIdFile: join(scratch(), "id"), say: () => {}, answers: channel() };
    await expect(login({ ...base, providerId: "nowhere", type: "api_key" })).rejects.toMatchObject({ reason: "unknown_provider" });
    await expect(login({ ...base, providerId: "deepseek", type: "oauth" })).rejects.toMatchObject({ reason: "unsupported_login" });
    await expect(login({ ...base, providerId: "ambient", type: "api_key" })).rejects.toMatchObject({ reason: "unsupported_login" });
    await expect(login({ ...base, providerId: "deepseek", type: "cookie" })).rejects.toMatchObject({ reason: "invalid_request" });
    expect(ran).toBe(false);
  });

  it("says Pi's own failure as a failed sign-in", async () => {
    const { pi } = fakePi({ onLogin: async () => { throw new Error("invalid_grant"); } });
    await expect(login({ pi, providerId: "deepseek", type: "api_key", deviceIdFile: join(scratch(), "id"), say: () => {}, answers: channel() }))
      .rejects.toMatchObject({ reason: "login_failed", message: "invalid_grant" });
  });
});

describe("disconnecting", () => {
  it("removes only the sign-in Pi stored, and says the readiness left", async () => {
    const { pi, store } = fakePi({
      stored: { deepseek: { type: "api_key", key: "sk-SECRET" }, anthropic: { type: "oauth" } },
      environment: { anthropic: "ANTHROPIC_API_KEY" },
    });
    await expect(disconnect({ pi, providerId: "deepseek" })).resolves.toBeNull();
    expect(Object.keys(store)).toEqual(["anthropic"]);
    await expect(disconnect({ pi, providerId: "anthropic" })).resolves.toEqual({ type: "api_key", source: "ANTHROPIC_API_KEY" });
    expect(store).toEqual({});
  });

  it("refuses a provider Pi does not know or holds no sign-in for", async () => {
    const { pi } = fakePi({ environment: { ambient: "AMBIENT_KEY" } });
    await expect(disconnect({ pi, providerId: "nowhere" })).rejects.toMatchObject({ reason: "unknown_provider" });
    await expect(disconnect({ pi, providerId: "ambient" })).rejects.toMatchObject({ reason: "not_stored" });
  });
});

describe("the installation's device id", () => {
  it("is made once, owner-only, and kept; a damaged one is replaced", () => {
    const file = join(scratch(), "pi-device-id");
    const first = deviceId(file);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(deviceId(file)).toBe(first);
    writeFileSync(file, "not a uuid");
    expect(deviceId(file)).not.toBe("not a uuid");
  });
});

/** A Pi package folder whose SDK keeps sign-ins in `$HOME/store.json` and reads `FAKE_READY` from the environment. */
function fakePackage() {
  const dir = join(scratch(), "pi");
  mkdirSync(join(dir, "dist", "core"), { recursive: true });
  writeFileSync(join(dir, "dist", "core", "auth-storage.js"), "export class ReadOnlyAuthStorage {}\n");
  writeFileSync(join(dir, "dist", "index.js"), `
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const file = process.env.HOME + "/store.json";
const read = () => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
const providers = [{ id: "deepseek", name: "DeepSeek", auth: { apiKey: { login() {} } } }];
export const ModelRuntime = { async create() { return {
  getProviders: () => providers,
  getProvider: (id) => providers.find((provider) => provider.id === id),
  async listCredentials() { return Object.keys(read()).map((providerId) => ({ providerId, type: "api_key" })); },
  async logout(id) { const store = read(); delete store[id]; writeFileSync(file, JSON.stringify(store)); },
  async checkAuth(id) {
    if (read()[id]) return { type: "api_key", source: "stored credential" };
    return process.env.FAKE_READY ? { type: "api_key", source: process.env.FAKE_READY } : undefined;
  },
}; } };
`);
  return dir;
}

describe("disconnecting as the app runs it", () => {
  it("says the readiness the environment leaves, and refuses a second time", () => {
    const pi = fakePackage();
    const home = scratch();
    writeFileSync(join(home, "store.json"), JSON.stringify({ deepseek: { type: "api_key", key: "sk-SECRET" } }));
    const run = () => {
      try {
        return { status: 0, out: execFileSync(process.execPath, [join(import.meta.dirname, "..", "..", "mirror-host", "pi-auth.mjs"), "logout", "--pi", pi, "--provider", "deepseek"], { encoding: "utf8", env: { HOME: home, FAKE_READY: "DEEPSEEK_API_KEY" } }) };
      } catch (error) {
        return { status: error.status, out: error.stdout };
      }
    };
    const first = run();
    expect(first.status).toBe(0);
    expect(JSON.parse(first.out.trim())).toEqual({ event: "disconnected", provider: "deepseek", ready: { type: "api_key", source: "DEEPSEEK_API_KEY" } });
    expect(readFileSync(join(home, "store.json"), "utf8")).toBe("{}");
    const second = run();
    expect(second.status).toBe(1);
    expect(JSON.parse(second.out.trim())).toMatchObject({ event: "failed", reason: "not_stored" });
  });
});

describe("the helper as the app runs it", () => {
  it("answers in JSON from a folder with spaces, and refuses a Pi that is not there", () => {
    const folder = join(scratch(), "Mirror Desktop TS Dev.app", "Contents", "Resources", "mirror-host");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "pi-auth.mjs"), readFileSync(join(import.meta.dirname, "..", "..", "mirror-host", "pi-auth.mjs")));
    for (const [args, reason] of [[["status"], "usage"], [["status", "--pi", join(folder, "missing")], "pi_unavailable"]]) {
      let stdout = "";
      try {
        execFileSync(process.execPath, [join(folder, "pi-auth.mjs"), ...args], { encoding: "utf8", env: {} });
      } catch (error) {
        stdout = error.stdout;
        expect(error.status).toBe(1);
      }
      expect(JSON.parse(stdout.trim())).toMatchObject({ event: "failed", reason });
    }
    expect(existsSync(join(folder, "missing"))).toBe(false);
  });
});
