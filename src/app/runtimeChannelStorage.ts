import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

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
  /** CV-010.DS-005 slice 3b: on a validated home, whether the app's own Pi is installed. */
  piInstalled?: boolean;
};

const ALLOWED_KEYS = [
  "channel", "productName", "bundleIdentifier", "appDataRoot", "mirrorRoot",
  "mirrorHome", "mirrorUser", "dbPath", "status", "message", "piInstalled",
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
  if (diagnostic.piInstalled !== undefined
    && (typeof diagnostic.piInstalled !== "boolean" || diagnostic.status !== "validated")) {
    throw new Error("Runtime channel diagnostic reports Pi outside a validated home.");
  }
  return diagnostic as RuntimeChannelDiagnostic;
}

export async function inspectRuntimeChannel(): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("inspect_runtime_channel"));
}

/**
 * CV-010.DS-005 slice 2f-2: the 0.3 line asks for a Mirror home, and since slice 3a for the folder
 * a new one is created in.
 */
export async function chooseRuntimeDirectory(kind: "mirrorHome" | "homeFolder"): Promise<string | undefined> {
  return (await invoke<string | null>("choose_runtime_directory", { kind })) ?? undefined;
}

/** CV-010.DS-005 slice 2d-1: bind this app to a Mirror home made for Mirror Desktop TS. */
export async function bindMirrorHome(homePath: string): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("bind_mirror_home", { homePath }));
}

/** CV-010.DS-005 slice 3a: create a 0.3 home for `userName` in `folder` (or `~/Mirror Homes`) and bind it. */
export async function createMirrorHome(userName: string, folder?: string): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("create_mirror_home", { userName, folder: folder ?? null }));
}

export type PiInstallProgress = { phase: "download" | "unpack" | "check"; done: number; total: number };

/**
 * CV-010.DS-005 slice 3b: install the app's own Pi, reporting each step to `onProgress`. Resolves
 * once Pi is installed and resolvable; rejects with a sentence that says what to do.
 */
export async function installPi(onProgress: (step: PiInstallProgress) => void): Promise<void> {
  const unlisten: UnlistenFn = await listen<PiInstallProgress>("pi-install-progress", (event) => onProgress(event.payload));
  try {
    await invoke("install_pi");
  } finally {
    unlisten();
  }
}
