// CV-010.DS-001: what the native `discover_existing_mirror` command returns, and the plain sentences
// the first screen builds from it. Discovery finds an existing Mirror the way Core would, without
// changing Core; this module decides only what a person reads and whether one click may connect.

import type { RuntimeBinding } from "../app/runtimeChannelStorage";

export const MIRROR_DISCOVERY_CHECK_IDS = [
  "core_found", "core_version", "mirror_home", "database", "openrouter_key", "uv", "pi_node",
] as const;

export type MirrorDiscoveryCheckId = typeof MIRROR_DISCOVERY_CHECK_IDS[number];

export type MirrorDiscoveryCheck = {
  id: MirrorDiscoveryCheckId;
  found: boolean;
  required: boolean;
  detail?: string;
};

export type MirrorDiscovery = {
  schemaVersion: "1.0.0";
  status: "proposed" | "unresolved" | "not_found";
  checked: string[];
  checkout: string | null;
  reason: string | null;
  binding: RuntimeBinding | null;
  checks: MirrorDiscoveryCheck[];
  connectable: boolean;
  preview: boolean;
  validationMessage: string | null;
};

const KEYS = [
  "schemaVersion", "status", "checked", "checkout", "reason", "binding", "checks",
  "connectable", "preview", "validationMessage",
] as const;

const nullableString = (value: unknown) => value === null || (typeof value === "string" && value.length > 0);

export function parseMirrorDiscovery(
  value: unknown,
  parseBinding: (value: unknown) => RuntimeBinding,
): MirrorDiscovery {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Mirror discovery is invalid.");
  }
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !KEYS.includes(key as typeof KEYS[number]))
    || raw.schemaVersion !== "1.0.0"
    || !["proposed", "unresolved", "not_found"].includes(raw.status as string)
    || !Array.isArray(raw.checked) || !raw.checked.every((path) => typeof path === "string")
    || !nullableString(raw.checkout) || !nullableString(raw.reason) || !nullableString(raw.validationMessage)
    || typeof raw.connectable !== "boolean" || typeof raw.preview !== "boolean"
    || !Array.isArray(raw.checks)) {
    throw new Error("Mirror discovery contains unsupported fields.");
  }
  const checks = raw.checks.map((check): MirrorDiscoveryCheck => {
    if (!check || typeof check !== "object") throw new Error("Mirror discovery check is invalid.");
    const item = check as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["id", "found", "required", "detail"].includes(key))
      || !MIRROR_DISCOVERY_CHECK_IDS.includes(item.id as MirrorDiscoveryCheckId)
      || typeof item.found !== "boolean" || typeof item.required !== "boolean"
      || (item.detail !== undefined && typeof item.detail !== "string")) {
      throw new Error("Mirror discovery check contains unsupported fields.");
    }
    return item as MirrorDiscoveryCheck;
  });
  const binding = raw.binding === null ? null : parseBinding(raw.binding);
  if ((raw.status === "proposed") !== (binding !== null) || (raw.connectable && binding === null)) {
    throw new Error("Mirror discovery status and binding disagree.");
  }
  return { ...(raw as unknown as MirrorDiscovery), checks, binding };
}

export type MirrorDiscoveryRow = { id: MirrorDiscoveryCheckId; found: boolean; required: boolean; text: string };

export type MirrorDiscoveryView = {
  headline: string;
  summary: string;
  rows: MirrorDiscoveryRow[];
  canConnect: boolean;
};

const REASONS: Record<string, string> = {
  checkout_not_found: "No Mirror was found in the usual places. Choose the folder where Mirror is installed, or enter the connection by hand.",
  chosen_not_a_checkout: "That folder is not a Mirror installation: it needs src/memory and Mirror's pyproject.toml.",
  env_unreadable: "Mirror's .env file could not be read, so this screen cannot tell whose Mirror it is.",
  home_not_configured: "Mirror's .env does not say whose Mirror this is: it sets neither MIRROR_USER nor MIRROR_HOME.",
  home_user_conflict: "Mirror's .env sets a MIRROR_HOME whose folder name differs from MIRROR_USER, which Mirror itself refuses.",
  home_without_user: "Mirror's .env sets a MIRROR_HOME this screen cannot name a user for.",
  unsupported_memory_env: "Mirror's .env selects a non-production environment, which this screen does not connect. Enter the connection by hand.",
  unsupported_database_override: "Mirror's .env moves the database away from the Mirror home, which this screen does not connect. Enter the connection by hand.",
};

function rowText(check: MirrorDiscoveryCheck): string {
  const detail = check.detail ? ` ${check.detail}` : "";
  switch (check.id) {
    case "core_found":
      return check.found ? `Mirror found at${detail}.` : "No Mirror installation found.";
    case "core_version":
      return check.found ? `Mirror Core${detail}.` : `Mirror Core${detail} is not supported by this app. Update Mirror, then check again.`;
    case "mirror_home":
      return check.found ? `Mirror home at${detail}.` : `The Mirror home${detail || " Mirror points to"} does not exist.`;
    case "database":
      return check.found ? "Mirror's memory database is in place." : `No memory database at${detail || " the Mirror home"}. Run Mirror once so it creates one.`;
    case "openrouter_key":
      return check.found
        ? "OpenRouter key present in Mirror's .env."
        : "No OpenRouter key in Mirror's .env. Mirror uses it for memories and search; you can connect now and add it later.";
    case "uv":
      return check.found ? `uv at${detail}.` : "uv was not found. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh";
    case "pi_node":
      return check.found ? `Pi at${detail}.` : "Pi was not found next to Node. Install it with: curl -fsSL https://pi.dev/install.sh | sh";
  }
}

export function describeMirrorDiscovery(discovery: MirrorDiscovery): MirrorDiscoveryView {
  const rows = discovery.checks.map((check) => ({
    id: check.id, found: check.found, required: check.required, text: rowText(check),
  }));
  const canConnect = discovery.connectable && !discovery.preview && discovery.binding !== null;
  const who = discovery.binding
    ? `This is ${discovery.binding.mirrorUser}'s Mirror, at ${discovery.binding.mirrorHome}.`
    : "";
  if (discovery.preview) {
    return {
      headline: "Discovery preview",
      summary: `${who} This build never connects a discovered Mirror; use the form to connect it.`.trim(),
      rows,
      canConnect: false,
    };
  }
  if (canConnect) {
    return { headline: "Your Mirror is ready to connect", summary: `${who} Connect to start using it here.`, rows, canConnect };
  }
  const reason = discovery.reason
    ? REASONS[discovery.reason] ?? `Discovery stopped: ${discovery.reason}.`
    : discovery.validationMessage
      ? `Mirror Desktop cannot connect it yet: ${discovery.validationMessage}`
      : "Some requirements are missing. Fix the items marked below, then check again.";
  return { headline: "Your Mirror needs attention", summary: `${who} ${reason}`.trim(), rows, canConnect: false };
}
