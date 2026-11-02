import { invoke } from "@tauri-apps/api/core";

/**
 * CV-010.DS-005 slice 3c-2: the OpenRouter key Mirror's context needs (decision 4). CR180: it is kept
 * in an owner-only file of the app data folder and never comes back to the screen; only whether one is kept and its last check do.
 */
export type OpenRouterKeyCheck = "worked" | "refused" | "unreachable";

export type OpenRouterKeyStatus = {
  configured: boolean;
  lastCheck: { atMs: number; outcome: OpenRouterKeyCheck } | null;
  declined: boolean;
};

export function describeLastCheck(status: OpenRouterKeyStatus, locale?: string): string {
  if (!status.configured) return "No key is kept.";
  if (!status.lastCheck) return "A key is kept on this Mac, readable only by you; it has not been checked yet.";
  const when = new Date(status.lastCheck.atMs).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  switch (status.lastCheck.outcome) {
    case "worked": return `A key is kept on this Mac. It worked on ${when}.`;
    case "refused": return `A key is kept on this Mac, but OpenRouter refused it on ${when}. Replace it.`;
    default: return `A key is kept on this Mac. OpenRouter could not be reached on ${when}.`;
  }
}

export async function loadOpenRouterKeyStatus(): Promise<OpenRouterKeyStatus> {
  return invoke<OpenRouterKeyStatus>("openrouter_key_status");
}

export async function saveOpenRouterKey(key: string): Promise<OpenRouterKeyStatus> {
  return invoke<OpenRouterKeyStatus>("save_openrouter_key", { key });
}

export async function testOpenRouterKey(): Promise<OpenRouterKeyStatus> {
  return invoke<OpenRouterKeyStatus>("test_openrouter_key");
}

export async function removeOpenRouterKey(): Promise<OpenRouterKeyStatus> {
  return invoke<OpenRouterKeyStatus>("remove_openrouter_key");
}

export async function declineOpenRouterKey(): Promise<OpenRouterKeyStatus> {
  return invoke<OpenRouterKeyStatus>("decline_openrouter_key");
}
