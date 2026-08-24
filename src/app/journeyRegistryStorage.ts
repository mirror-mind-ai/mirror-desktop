import { invoke } from "@tauri-apps/api/core";
import type { JourneyRegistry } from "../domain/journeyRegistry";

export async function loadJourneyRegistry(): Promise<JourneyRegistry | undefined> {
  const payload = await invoke<string | null>("load_journey_registry");
  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(payload) as JourneyRegistry;
  } catch {
    return undefined;
  }
}
