import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  createPersistedNautilusJourneyThread,
  parsePersistedNautilusJourneyThread,
} from "../domain/persistedNautilusJourneyThread";
import {
  classifyNautilusJourneyThread,
  parseNautilusJourneyThread,
  type NautilusJourneyThread,
} from "../domain/nautilusJourneyThread";

export type LegacyParityRetirementSummary = { retired: number; retained: number; alreadyRetired: number };

export async function retireLegacyParityState(): Promise<LegacyParityRetirementSummary> {
  return invoke<LegacyParityRetirementSummary>("retire_legacy_parity_state");
}

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

export type DedicatedPiTranscriptTurn = {
  userEntryId: string;
  assistantEntryId: string;
  userText: string;
  assistantText: string;
  entryCount: number;
  startedAt: string;
  committedAt: string;
};

export async function loadDedicatedPiTranscript(
  journeyId: string,
  sessionId: string,
  sessionFile: string,
): Promise<DedicatedPiTranscriptTurn[]> {
  return invoke<DedicatedPiTranscriptTurn[]>("load_dedicated_pi_transcript", { journeyId, sessionId, sessionFile });
}

type JourneyProvisioningEvent = { journeyId: string; phase: string };

export async function provisionNautilusJourneyThread(
  journeyId: string,
  journeyName: string,
  onProgress?: (phase: string) => void,
): Promise<NautilusJourneyThread> {
  const unlisten = await listen<JourneyProvisioningEvent>("nautilus-journey-provisioning", (event) => {
    if (event.payload.journeyId === journeyId) onProgress?.(event.payload.phase);
  });
  try {
    const value = await invoke<unknown>("provision_journey_thread", { journeyId, journeyName });
    const thread = parseNautilusJourneyThread(value);
    if (!thread || classifyNautilusJourneyThread(thread, journeyId).kind !== "ready") {
      throw new Error("Provisioned Journey thread authority is invalid.");
    }
    return thread;
  } finally {
    unlisten();
  }
}

export async function restartNautilusJourneyThread(
  journeyId: string,
  journeyName: string,
  onProgress?: (phase: string) => void,
): Promise<NautilusJourneyThread> {
  const unlisten = await listen<JourneyProvisioningEvent>("nautilus-journey-restart", (event) => {
    if (event.payload.journeyId === journeyId) onProgress?.(event.payload.phase);
  });
  try {
    const value = await invoke<unknown>("restart_journey_thread", { journeyId, journeyName });
    const thread = parseNautilusJourneyThread(value);
    if (!thread || classifyNautilusJourneyThread(thread, journeyId).kind !== "ready") {
      throw new Error("Restarted Journey thread authority is invalid.");
    }
    return thread;
  } finally {
    unlisten();
  }
}

export async function saveNautilusJourneyThread(thread: NautilusJourneyThread): Promise<void> {
  await invoke("save_journey_thread", {
    journeyId: thread.journeyId,
    payload: JSON.stringify(createPersistedNautilusJourneyThread(thread)),
  });
}
