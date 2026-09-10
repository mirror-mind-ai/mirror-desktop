import { invoke } from "@tauri-apps/api/core";
import {
  normalizeDocumentationContent,
  normalizeDocumentationTree,
  type DocumentationContent,
  type DocumentationTree,
} from "../domain/journeyDocumentation";

export async function listJourneyDocumentation(journeyId: string, relativePath?: string): Promise<DocumentationTree> {
  const payload = await invoke<unknown>("list_journey_documentation", { journeyId, relativePath });
  return normalizeDocumentationTree(payload);
}

export async function readJourneyDocument(
  journeyId: string,
  relativePath: string,
): Promise<DocumentationContent> {
  const payload = await invoke<unknown>("read_journey_document", { journeyId, relativePath });
  return normalizeDocumentationContent(payload);
}

export async function revealJourneyArtifact(journeyId: string, relativePath: string): Promise<void> {
  await invoke("reveal_journey_artifact", { journeyId, relativePath });
}
