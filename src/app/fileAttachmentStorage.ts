import { invoke } from "@tauri-apps/api/core";
import { normalizeFileAttachmentResponse, type FileAttachmentResponse } from "../domain/fileAttachments";

export async function chooseFileAttachments(journeyId: string): Promise<FileAttachmentResponse> {
  const value = await invoke<unknown>("choose_file_attachments", { journeyId });
  return normalizeFileAttachmentResponse(value, journeyId);
}

export async function inspectDroppedFileAttachments(journeyId: string, paths: string[]): Promise<FileAttachmentResponse> {
  const value = await invoke<unknown>("inspect_file_attachments", { journeyId, paths });
  return normalizeFileAttachmentResponse(value, journeyId);
}

export async function openFileAttachment(path: string): Promise<void> {
  await invoke("open_local_reference", { path, basePath: null });
}
