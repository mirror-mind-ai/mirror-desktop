import { invoke } from "@tauri-apps/api/core";

export type RuntimeChannelDiagnostic = {
  channel: "user" | "development";
  productName: string;
  bundleIdentifier: string;
  appDataRoot: string;
  mirrorRoot: string;
  mirrorHome: string;
  mirrorUser: string;
  dbPath: string;
  status: "validated";
};

const ALLOWED_KEYS = [
  "channel",
  "productName",
  "bundleIdentifier",
  "appDataRoot",
  "mirrorRoot",
  "mirrorHome",
  "mirrorUser",
  "dbPath",
  "status",
] as const;

export function parseRuntimeChannelDiagnostic(value: unknown): RuntimeChannelDiagnostic {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Runtime channel diagnostic is invalid.");
  }
  const diagnostic = value as Record<string, unknown>;
  if (Object.keys(diagnostic).some((key) => !ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number]))) {
    throw new Error("Runtime channel diagnostic contains unsupported fields.");
  }
  if (!Object.values(diagnostic).every((field) => typeof field === "string" && field.length > 0)) {
    throw new Error("Runtime channel diagnostic contains invalid coordinates.");
  }
  if (!['user', 'development'].includes(diagnostic.channel as string) || diagnostic.status !== "validated") {
    throw new Error("Runtime channel diagnostic contains an unsupported identity.");
  }
  const expectedIdentifier = diagnostic.channel === "development"
    ? "ai.mirrormind.desktop.dev"
    : "ai.mirrormind.desktop";
  if (diagnostic.bundleIdentifier !== expectedIdentifier) {
    throw new Error("Runtime channel diagnostic diverges from its bundle identity.");
  }
  return diagnostic as RuntimeChannelDiagnostic;
}

export async function inspectRuntimeChannel(): Promise<RuntimeChannelDiagnostic> {
  return parseRuntimeChannelDiagnostic(await invoke<unknown>("inspect_runtime_channel"));
}
