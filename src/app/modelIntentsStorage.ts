import { invoke } from "@tauri-apps/api/core";
import {
  createEmptyModelIntents,
  parseModelIntents,
  serializeModelIntents,
  type ModelIntents,
} from "../domain/modelIntents";

// CR078: an absent store is an empty one. A Navigator who has defined no intents is in a
// valid state, not a failed load.
export async function loadModelIntents(): Promise<ModelIntents> {
  const payload = await invoke<string | null>("load_model_intents");
  if (payload === null) return createEmptyModelIntents();
  let decoded: unknown;
  try {
    decoded = JSON.parse(payload);
  } catch {
    throw new Error("Model intents contain malformed JSON.");
  }
  return parseModelIntents(decoded);
}

export async function saveModelIntents(intents: ModelIntents): Promise<void> {
  await invoke("save_model_intents", { payload: serializeModelIntents(intents) });
}
