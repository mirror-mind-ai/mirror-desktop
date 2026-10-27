import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MIRROR_DISCOVERY_CHECK_IDS,
  describeMirrorDiscovery,
  parseMirrorDiscovery,
  type MirrorDiscovery,
} from "../domain/mirrorDiscovery";
import { MirrorDiscoveryCard } from "../app/MirrorDiscoveryCard";
import { parseRuntimeBinding } from "../app/runtimeChannelStorage";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/runtimeChannelStorage.ts?raw";
import nativeSource from "../../src-tauri/src/mirror_discovery.rs?raw";

/**
 * CV-010.DS-001: a person who already uses Mirror opens the Desktop and sees their Mirror found,
 * each requirement checked in plain language, and connects with one confirmation. Discovery is
 * native (`mirror_discovery.rs`); this suite covers the contract it returns, the sentences built
 * from it, the card, and the wiring into the first screen.
 */

const binding = {
  schemaVersion: "1.0.0",
  channel: "user",
  mirrorRoot: "/Users/alice/mirror",
  mirrorHome: "/Users/alice/.mirror-minds/alice",
  mirrorUser: "alice",
  dbPath: "/Users/alice/.mirror-minds/alice/memory.db",
} as const;

function allFound() {
  return [
    { id: "core_found", found: true, required: true, detail: "/Users/alice/mirror" },
    { id: "core_version", found: true, required: true, detail: "0.31.14 (supported: >=0.31.14,<0.32.0)" },
    { id: "mirror_home", found: true, required: true, detail: "/Users/alice/.mirror-minds/alice" },
    { id: "database", found: true, required: true, detail: "/Users/alice/.mirror-minds/alice/memory.db" },
    { id: "openrouter_key", found: true, required: false },
    { id: "uv", found: true, required: true, detail: "/usr/local/bin/uv" },
    { id: "pi_node", found: true, required: true, detail: "/usr/local/bin/pi" },
  ];
}

function wire(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    status: "proposed",
    checked: ["/Users/alice/mirror"],
    checkout: "/Users/alice/mirror",
    reason: null,
    binding: { ...binding },
    checks: allFound(),
    connectable: true,
    preview: false,
    validationMessage: null,
    ...overrides,
  };
}

function parse(value: unknown): MirrorDiscovery {
  return parseMirrorDiscovery(value, parseRuntimeBinding);
}

function withCheck(id: string, change: Record<string, unknown>) {
  return allFound().map((check) => (check.id === id ? { ...check, ...change } : check));
}

describe("parseMirrorDiscovery", () => {
  it("accepts exactly what the native command returns", () => {
    const discovery = parse(wire());
    expect(discovery.binding?.mirrorUser).toBe("alice");
    expect(discovery.checks).toHaveLength(7);
  });

  it("keeps the check vocabulary identical on both sides of the bridge", () => {
    const native = [...nativeSource.matchAll(/check\(\s*"([a-z_]+)"/g)].map((match) => match[1]);
    expect(new Set(native)).toEqual(new Set(MIRROR_DISCOVERY_CHECK_IDS));
    expect(MIRROR_DISCOVERY_CHECK_IDS).toHaveLength(7);
  });

  it("refuses unknown fields, unknown checks and a malformed binding", () => {
    expect(() => parse(wire({ extra: 1 }))).toThrow();
    expect(() => parse(wire({ checks: [{ id: "surprise", found: true, required: true }] }))).toThrow();
    expect(() => parse(wire({ status: "maybe" }))).toThrow();
    expect(() => parse(wire({ binding: { ...binding, mirrorUser: "" } }))).toThrow();
    expect(() => parse(wire({ schemaVersion: "2.0.0" }))).toThrow();
  });

  it("never treats a binding as connectable unless the native side said so", () => {
    expect(parse(wire({ connectable: false })).connectable).toBe(false);
    expect(() => parse(wire({ connectable: true, binding: null, status: "unresolved" }))).toThrow();
  });
});

describe("describeMirrorDiscovery", () => {
  it("offers one confirmation when everything is found", () => {
    const view = describeMirrorDiscovery(parse(wire()));
    expect(view.canConnect).toBe(true);
    expect(view.headline).toBe("Your Mirror is ready to connect");
    expect(view.summary).toContain("alice");
    expect(view.summary).toContain("/Users/alice/.mirror-minds/alice");
    expect(view.rows.every((row) => row.found)).toBe(true);
  });

  it("names each missing requirement with what to do", () => {
    const view = describeMirrorDiscovery(parse(wire({
      connectable: false,
      checks: withCheck("uv", { found: false, detail: undefined }),
    })));
    const uv = view.rows.find((row) => row.id === "uv")!;
    expect(uv.found).toBe(false);
    expect(uv.text).toMatch(/astral\.sh\/uv\/install\.sh/);
    expect(view.canConnect).toBe(false);
    expect(view.headline).toBe("Your Mirror needs attention");
  });

  it("names both versions when Core is out of range", () => {
    const view = describeMirrorDiscovery(parse(wire({
      connectable: false,
      checks: withCheck("core_version", { found: false, detail: "0.30.2 (supported: >=0.31.14,<0.32.0)" }),
    })));
    const row = view.rows.find((candidate) => candidate.id === "core_version")!;
    expect(row.text).toContain("0.30.2");
    expect(row.text).toContain(">=0.31.14,<0.32.0");
  });

  it("reports a missing OpenRouter key without blocking", () => {
    const view = describeMirrorDiscovery(parse(wire({
      checks: withCheck("openrouter_key", { found: false }),
    })));
    const row = view.rows.find((candidate) => candidate.id === "openrouter_key")!;
    expect(row.found).toBe(false);
    expect(row.required).toBe(false);
    expect(view.canConnect).toBe(true);
  });

  it("explains every reason the native side can give", () => {
    const production = nativeSource.slice(0, nativeSource.indexOf("#[cfg(test)]\nmod tests"));
    const literals = [...production.matchAll(/"([a-z]+(?:_[a-z]+)+)"/g)].map((match) => match[1]);
    const statuses = ["not_found"];
    const reasons = [...new Set(literals)]
      .filter((literal) => !MIRROR_DISCOVERY_CHECK_IDS.includes(literal as never) && !statuses.includes(literal));
    expect(new Set(reasons)).toEqual(new Set([
      "checkout_not_found", "chosen_not_a_checkout", "env_unreadable", "home_not_configured",
      "home_user_conflict", "home_without_user", "unsupported_memory_env", "unsupported_database_override",
    ]));
    for (const reason of reasons) {
      const view = describeMirrorDiscovery(parse(wire({
        status: reason.startsWith("checkout") || reason.startsWith("chosen") ? "not_found" : "unresolved",
        binding: null,
        connectable: false,
        reason,
      })));
      expect(view.summary, reason).not.toMatch(/undefined|null/);
      expect(view.summary.length, reason).toBeGreaterThan(20);
    }
  });

  it("says a preview never connects, even when everything is found", () => {
    const view = describeMirrorDiscovery(parse(wire({ connectable: false, preview: true })));
    expect(view.canConnect).toBe(false);
    expect(view.headline).toBe("Discovery preview");
    expect(view.summary).toMatch(/never connects/);
  });

  it("shows the validator's own words when it refuses the proposal", () => {
    const view = describeMirrorDiscovery(parse(wire({
      connectable: false,
      validationMessage: "Mirror user must be a lowercase slug of at most 64 characters.",
    })));
    expect(view.summary).toContain("lowercase slug");
  });
});

describe("MirrorDiscoveryCard", () => {
  const noop = () => undefined;

  it("renders the checklist and an enabled Connect for a ready Mirror", () => {
    const html = renderToStaticMarkup(
      <MirrorDiscoveryCard state={{ kind: "result", discovery: parse(wire()) }} connecting={false}
        onConnect={noop} onChoose={noop} onRetry={noop} onManual={noop} />,
    );
    expect(html).toContain("Your Mirror is ready to connect");
    expect(html.match(/class="readiness-row"/g)).toHaveLength(7);
    expect(html).toMatch(/<button type="button">Connect<\/button>/);
    expect(html).toContain("Use a different Mirror…");
  });

  it("disables Connect when something required is missing", () => {
    const html = renderToStaticMarkup(
      <MirrorDiscoveryCard
        state={{ kind: "result", discovery: parse(wire({ connectable: false, checks: withCheck("database", { found: false }) })) }}
        connecting={false} onConnect={noop} onChoose={noop} onRetry={noop} onManual={noop} />,
    );
    expect(html).toMatch(/<button type="button" disabled="">Connect<\/button>/);
    expect(html).toContain('data-found="false"');
  });

  it("shows checking and failure states without a checklist", () => {
    const checking = renderToStaticMarkup(
      <MirrorDiscoveryCard state={{ kind: "checking" }} connecting={false}
        onConnect={noop} onChoose={noop} onRetry={noop} onManual={noop} />,
    );
    expect(checking).toContain("Looking for your Mirror…");
    const failed = renderToStaticMarkup(
      <MirrorDiscoveryCard state={{ kind: "failed", message: "HOME missing" }} connecting={false}
        onConnect={noop} onChoose={noop} onRetry={noop} onManual={noop} />,
    );
    expect(failed).toContain("HOME missing");
    expect(failed).toContain("Use a different Mirror…");
    expect(failed).not.toContain("readiness-row");
  });

  it("surfaces a connection error from the save", () => {
    const html = renderToStaticMarkup(
      <MirrorDiscoveryCard state={{ kind: "result", discovery: parse(wire()) }} connecting={false}
        error="Mirror database is unavailable." onConnect={noop} onChoose={noop} onRetry={noop} onManual={noop} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Mirror database is unavailable.");
  });
});

describe("CV-010.DS-001 wiring", () => {
  it("exposes discovery through the native command and parses its answer", () => {
    expect(storageSource).toContain('invoke<unknown>("discover_existing_mirror"');
    expect(storageSource).toContain("parseMirrorDiscovery(");
  });

  it("connects through the existing save, never a new write path", () => {
    expect(appSource).toMatch(/async function submitRuntimeBinding\(persist: boolean, binding: RuntimeBinding \| undefined = runtimeBindingDraft\)/);
    expect(appSource).toContain("onConnect={(proposed) => void submitRuntimeBinding(true, proposed)}");
  });

  it("shows discovery first for an unbound channel and keeps the form one step away", () => {
    expect(appSource).toContain('runtimeConnectionView === "discover"');
    expect(appSource).toContain('runtimeChannel?.status === "unbound"');
    expect(appSource).toContain('onManual={() => setRuntimeConnectionView("manual")}');
    expect(appSource).toContain("Find my Mirror automatically");
  });

  it("lets Settings fill the form from discovery without saving", () => {
    const start = appSource.indexOf("async function fillRuntimeBindingFromDiscovery(");
    expect(start).toBeGreaterThan(0);
    const body = appSource.slice(start, appSource.indexOf("\n  }\n", start));
    expect(body).toContain("discoverExistingMirror(");
    expect(body).not.toMatch(/saveRuntimeBinding|submitRuntimeBinding/);
    expect(appSource).toContain("onClick={() => void fillRuntimeBindingFromDiscovery()}");
  });
});
