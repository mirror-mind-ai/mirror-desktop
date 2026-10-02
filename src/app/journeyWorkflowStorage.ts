import { invoke } from "@tauri-apps/api/core";
import { normalizeJourneyWorkflow, type JourneyWorkflowDeclaration } from "../domain/journeyWorkflow";

/**
 * CR112: reads the Journey-owned Workflow manifest and the facts about every path it declares.
 * The bounded document reader previews only md, markdown and txt, so a dedicated command is
 * required to return the JSON manifest at all.
 */
export async function readJourneyWorkflow(journeyId: string): Promise<JourneyWorkflowDeclaration> {
  const payload = await invoke<unknown>("read_journey_workflow", { journeyId });
  return normalizeJourneyWorkflow(payload);
}
