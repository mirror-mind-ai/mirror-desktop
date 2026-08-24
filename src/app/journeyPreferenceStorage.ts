import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedJourneyPreferences,
  parsePersistedJourneyPreferences,
  type JourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";

export async function loadJourneyPreferences(): Promise<JourneyPreferenceState | undefined> {
  const payload = await invoke<string | null>("load_journey_preferences");
  if (!payload) {
    return undefined;
  }

  try {
    return parsePersistedJourneyPreferences(JSON.parse(payload))?.preferences;
  } catch {
    return undefined;
  }
}

export async function saveJourneyPreferences(preferences: JourneyPreferenceState): Promise<void> {
  await invoke("save_journey_preferences", {
    payload: JSON.stringify(createPersistedJourneyPreferences(preferences), null, 2),
  });
}
