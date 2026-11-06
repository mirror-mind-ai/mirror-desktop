import { invoke } from "@tauri-apps/api/core";
import type { JourneyWorkspacePreview } from "../domain/journeyWorkingFolder";

/**
 * RS028 group B: the folder the next turn in this Journey would run in. Read-only: the native side
 * resolves it exactly as the turn does but creates nothing (CR202), refreshing the Journey tree from
 * Mirror first when the cached folder is gone (CR197).
 */
export async function previewJourneyWorkspace(journeyId: string): Promise<JourneyWorkspacePreview> {
  return invoke<JourneyWorkspacePreview>("preview_journey_workspace", { journeyId });
}
