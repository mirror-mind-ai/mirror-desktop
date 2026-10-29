import { invoke } from "@tauri-apps/api/core";
import { parseMirrorDiscovery, type MirrorDiscovery } from "../domain/mirrorDiscovery";

export type RuntimeBinding = {
  schemaVersion: "1.0.0";
  channel: "user" | "development";
  mirrorRoot: string;
  mirrorHome: string;
  mirrorUser: string;
  dbPath: string;
};

export type RuntimeChannelDiagnostic = {
  channel: "user" | "development" | "evaluation";
  productName: string;
  bundleIdentifier: string;
  appDataRoot: string;
  mirrorRoot?: string;
  mirrorHome?: string;
  mirrorUser?: string;
  dbPath?: string;
  status: "unbound" | "invalid" | "validated";
  message?: string;
};

const BINDING_KEYS = ["schemaVersion", "channel", "mirrorRoot", "mirrorHome", "mirrorUser", "dbPath"] as const;

export function parseRuntimeBinding(value: unknown): RuntimeBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Runtime binding candidate is invalid.");
  }
  const binding = value as Record<string, unknown>;
  if (Object.keys(binding).length !== BINDING_KEYS.length
    || Object.keys(binding).some((key) => !BINDING_KEYS.includes(key as typeof BINDING_KEYS[number]))
    || !BINDING_KEYS.every((key) => typeof binding[key] === "string" && binding[key].length > 0)
    || binding.schemaVersion !== "1.0.0"
    || !["user", "development"].includes(binding.channel as string)) {
    throw new Error("Runtime binding candidate contains unsupported fields.");
  }
  return binding as RuntimeBinding;
}

const ALLOWED_KEYS = [
  "channel", "productName", "bundleIdentifier", "appDataRoot", "mirrorRoot",
  "mirrorHome", "mirrorUser", "dbPath", "status", "message",
] as const;
const COORDINATE_KEYS = ["mirrorRoot", "mirrorHome", "mirrorUser", "dbPath"] as const;

export function parseRuntimeChannelDiagnostic(value: unknown): RuntimeChannelDiagnostic {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Runtime channel diagnostic is invalid.");
  }
  const diagnostic = value as Record<string, unknown>;
  if (Object.keys(diagnostic).some((key) => !ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number]))) {
    throw new Error("Runtime channel diagnostic contains unsupported fields.");
  }
  for (const key of ["channel", "productName", "bundleIdentifier", "appDataRoot", "status"] as const) {
    if (typeof diagnostic[key] !== "string" || diagnostic[key].length === 0) {
      throw new Error("Runtime channel diagnostic contains invalid identity fields.");
    }
  }
  if (!["user", "development", "evaluation"].includes(diagnostic.channel as string)
    || !["unbound", "invalid", "validated"].includes(diagnostic.status as string)) {
    throw new Error("Runtime channel diagnostic contains an unsupported identity.");
  }
  const expectedIdentifier = diagnostic.channel === "development"
    ? "ai.mirrormind.desktop.ts.dev"
    : "ai.mirrormind.desktop.ts";
  if (diagnostic.bundleIdentifier !== expectedIdentifier) {
    throw new Error("Runtime channel diagnostic diverges from its bundle identity.");
  }
  const coordinates = COORDINATE_KEYS.map((key) => diagnostic[key]);
  if (diagnostic.status === "validated") {
    // CV-010.DS-005 slice 2d-1: a 0.3 diagnostic names its home and database; the Python source
    // tree and user are gone, and present only in diagnostics of the retired Python binding.
    const required = [diagnostic.mirrorHome, diagnostic.dbPath];
    const optional = [diagnostic.mirrorRoot, diagnostic.mirrorUser];
    if (!required.every((field) => typeof field === "string" && field.length > 0)
      || !optional.every((field) => field === undefined || (typeof field === "string" && field.length > 0))) {
      throw new Error("Validated runtime channel diagnostic lacks required coordinates.");
    }
  } else if (coordinates.some((field) => field !== undefined)
    || typeof diagnostic.message !== "string" || diagnostic.message.length === 0) {
    throw new Error("Unavailable runtime channel diagnostic contains invalid details.");
  }
  return diagnostic as RuntimeChannelDiagnostic;
}

export async function inspectRuntimeChannel(): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("inspect_runtime_channel"));
}

export async function inspectRuntimeBindingCandidate(): Promise<RuntimeBinding | undefined> {
  const candidate = await invoke<unknown>("inspect_runtime_binding_candidate");
  return candidate === null ? undefined : parseRuntimeBinding(candidate);
}

export async function chooseRuntimeDirectory(kind: "mirrorRoot" | "mirrorHome"): Promise<string | undefined> {
  return (await invoke<string | null>("choose_runtime_directory", { kind })) ?? undefined;
}

/** CV-010.DS-005 slice 2d-1: bind this app to a Mirror home made for Mirror Desktop TS. */
export async function bindMirrorHome(homePath: string): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("bind_mirror_home", { homePath }));
}

export async function validateRuntimeBinding(binding: RuntimeBinding): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("validate_runtime_binding", { binding }));
}

export async function saveRuntimeBinding(binding: RuntimeBinding): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("save_runtime_binding", { binding }));
}

/** CV-010.DS-001: find an existing Mirror the way Core would. Reads only; nothing is persisted. */
export async function discoverExistingMirror(chosenRoot?: string): Promise<MirrorDiscovery> {
  return parseMirrorDiscovery(
    await invoke<unknown>("discover_existing_mirror", { chosenRoot: chosenRoot ?? null }),
    parseRuntimeBinding,
  );
}
