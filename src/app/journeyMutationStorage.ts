import { invoke } from "@tauri-apps/api/core";
import { parseJourneyDeletionPreview, type JourneyDeletionPreview } from "../domain/journeyDeletion";
import type { JourneyMutationRequest, JourneyMutationResult } from "../domain/journeyMutation";

export async function chooseProjectDirectory(): Promise<string | undefined> {
  return (await invoke<string | null>("choose_project_directory")) ?? undefined;
}

export async function mutateJourneyRegistry(activeJourneyId: string, request: JourneyMutationRequest, replacementJourneyId?: string): Promise<JourneyMutationResult> {
  const payload = await invoke<string>("mutate_journey_registry", {
    activeJourneyId,
    requestJson: JSON.stringify(request),
    replacementJourneyId,
  });
  return JSON.parse(payload) as JourneyMutationResult;
}

/** RS028 / CR204: what deleting the Journey takes, from Mirror and from Nautilus. Writes nothing. */
export async function previewJourneyDeletion(journeyId: string): Promise<JourneyDeletionPreview> {
  return parseJourneyDeletionPreview(await invoke<string>("preview_journey_deletion", { journeyId }));
}
