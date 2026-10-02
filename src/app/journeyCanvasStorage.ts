import { invoke } from "@tauri-apps/api/core";
import { normalizeJourneyCanvas, type JourneyCanvas } from "../domain/journeyCanvas";

/**
 * CR112: reads the drawing a Journey's agent keeps, plus whether standing instructions exist.
 * A dedicated command is required because the bounded document reader answers per relative path
 * and this surface needs both conventional files resolved against the Journey root at once.
 */
export async function readJourneyCanvas(journeyId: string): Promise<JourneyCanvas> {
  const payload = await invoke<unknown>("read_journey_canvas", { journeyId });
  return normalizeJourneyCanvas(payload);
}
