import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedComposerDrafts,
  parsePersistedComposerDrafts,
  type ComposerDraftMap,
} from "../domain/composerDrafts";

let saveChain: Promise<void> = Promise.resolve();

export async function loadComposerDrafts(): Promise<ComposerDraftMap> {
  const payload = await invoke<string | null>("load_composer_drafts");
  if (payload === null) return {};

  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    throw new Error("Composer draft storage contains malformed JSON.");
  }
  const parsed = parsePersistedComposerDrafts(value);
  if (!parsed) throw new Error("Composer draft storage contains an invalid payload.");
  return parsed.drafts;
}

export function saveComposerDrafts(drafts: ComposerDraftMap): Promise<void> {
  const payload = JSON.stringify(createPersistedComposerDrafts(drafts), null, 2);
  const operation = saveChain
    .catch(() => undefined)
    .then(() => invoke<void>("save_composer_drafts", { payload }));
  saveChain = operation;
  return operation;
}
