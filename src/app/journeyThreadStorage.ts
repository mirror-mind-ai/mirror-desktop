import { invoke } from "@tauri-apps/api/core";
import {
  createPersistedNautilusJourneyThread,
  parsePersistedNautilusJourneyThread,
} from "../domain/persistedNautilusJourneyThread";
import type { NautilusJourneyThread } from "../domain/nautilusJourneyThread";

export async function loadNautilusJourneyThread(journeyId: string): Promise<NautilusJourneyThread | undefined> {
  const payload = await invoke<string | null>("load_journey_thread", { journeyId });
  if (!payload) return undefined;
  try {
    const persisted = parsePersistedNautilusJourneyThread(JSON.parse(payload), journeyId);
    if (!persisted) throw new Error("Stored Journey thread authority is invalid.");
    return persisted.thread;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Stored Journey thread authority is invalid.");
  }
}

export async function saveNautilusJourneyThread(thread: NautilusJourneyThread): Promise<void> {
  await invoke("save_journey_thread", {
    journeyId: thread.journeyId,
    payload: JSON.stringify(createPersistedNautilusJourneyThread(thread)),
  });
}
