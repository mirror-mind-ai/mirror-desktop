import { invoke } from "@tauri-apps/api/core";
import {
  normalizeJourneyProjectionBundle,
  type JourneyProjectionBundle,
} from "../domain/journeyProjections";

export async function loadJourneyProjections(journeyId: string): Promise<JourneyProjectionBundle> {
  const payload = await invoke<unknown>("load_journey_projections", { journeyId });
  return normalizeJourneyProjectionBundle(payload, journeyId);
}
