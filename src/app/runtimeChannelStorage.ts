import { invoke } from "@tauri-apps/api/core";

export type RuntimeChannelDiagnostic = {
  channel: "user" | "development";
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
  if (!["user", "development"].includes(diagnostic.channel as string)
    || !["unbound", "invalid", "validated"].includes(diagnostic.status as string)) {
    throw new Error("Runtime channel diagnostic contains an unsupported identity.");
  }
  const expectedIdentifier = diagnostic.channel === "development"
    ? "ai.mirrormind.desktop.dev"
    : "ai.mirrormind.desktop";
  if (diagnostic.bundleIdentifier !== expectedIdentifier) {
    throw new Error("Runtime channel diagnostic diverges from its bundle identity.");
  }
  const coordinates = COORDINATE_KEYS.map((key) => diagnostic[key]);
  if (diagnostic.status === "validated") {
    if (!coordinates.every((field) => typeof field === "string" && field.length > 0)) {
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
