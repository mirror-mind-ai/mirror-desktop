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

/**
 * CR202, after the Navigator: open the folder the line shows, in the system file manager. Only the
 * Journey is named, so the native side decides the path exactly as the turn does.
 */
export async function openJourneyWorkspace(journeyId: string): Promise<void> {
  await invoke("open_journey_workspace", { journeyId });
}
