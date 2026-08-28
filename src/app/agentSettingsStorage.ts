import { invoke } from "@tauri-apps/api/core";
import {
  parseAgentSettings,
  serializeAgentSettings,
  type AgentSettings,
} from "../domain/agentProfile";

export type PiModelCatalogEntry = {
  provider: string;
  model: string;
  contextWindow: number;
  maxOutput: number;
  thinking: boolean;
  images: boolean;
};

export async function loadAgentSettings(): Promise<AgentSettings | undefined> {
  const payload = await invoke<string | null>("load_agent_settings");
  if (payload === null) return undefined;
  let decoded: unknown;
  try {
    decoded = JSON.parse(payload);
  } catch {
    throw new Error("Agent settings contain malformed JSON.");
  }
  return parseAgentSettings(decoded);
}

export async function saveAgentSettings(settings: AgentSettings): Promise<void> {
  await invoke("save_agent_settings", { payload: serializeAgentSettings(settings) });
}

export async function listPiModels(): Promise<PiModelCatalogEntry[]> {
  const value = await invoke<unknown>("list_pi_models");
  if (!Array.isArray(value)) throw new Error("Pi model catalog is invalid.");
  return value.map((entry) => parseCatalogEntry(entry));
}

function parseCatalogEntry(value: unknown): PiModelCatalogEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Pi model catalog entry is invalid.");
  const entry = value as Record<string, unknown>;
  const keys = Object.keys(entry);
  if (keys.some((key) => !["provider", "model", "contextWindow", "maxOutput", "thinking", "images"].includes(key))) {
    throw new Error("Pi model catalog entry contains unsupported fields.");
  }
  if (typeof entry.provider !== "string" || typeof entry.model !== "string"
    || !Number.isSafeInteger(entry.contextWindow) || !Number.isSafeInteger(entry.maxOutput)
    || typeof entry.thinking !== "boolean" || typeof entry.images !== "boolean") {
    throw new Error("Pi model catalog entry is invalid.");
  }
  return entry as PiModelCatalogEntry;
}
