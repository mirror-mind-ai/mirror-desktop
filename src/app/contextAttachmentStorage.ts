import { invoke } from "@tauri-apps/api/core";
import {
  normalizeContextSnapshotResponse,
  type ContextAttachmentSnapshotResponse,
} from "../domain/contextAttachments";

export async function snapshotJourneyContext(
  journeyId: string,
  relativePaths: string[],
): Promise<ContextAttachmentSnapshotResponse> {
  const payload = await invoke<unknown>("snapshot_journey_context", { journeyId, relativePaths });
  return normalizeContextSnapshotResponse(payload, journeyId);
}
