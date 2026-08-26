import {
  parseNautilusJourneyThread,
  type NautilusJourneyThread,
} from "./nautilusJourneyThread";

export type PersistedNautilusJourneyThread = {
  schemaVersion: "1.0.0";
  thread: NautilusJourneyThread;
  savedAt: string;
};

export function createPersistedNautilusJourneyThread(
  thread: NautilusJourneyThread,
  now: Date = new Date(),
): PersistedNautilusJourneyThread {
  return { schemaVersion: "1.0.0", thread, savedAt: now.toISOString() };
}

export function parsePersistedNautilusJourneyThread(
  value: unknown,
  expectedJourneyId: string,
): PersistedNautilusJourneyThread | undefined {
  if (!value || typeof value !== "object") return undefined;
  const envelope = value as Record<string, unknown>;
  if (envelope.schemaVersion !== "1.0.0" || typeof envelope.savedAt !== "string") return undefined;
  const thread = parseNautilusJourneyThread(envelope.thread);
  if (!thread || thread.journeyId !== expectedJourneyId) return undefined;
  const generations = [...thread.generations].sort((a, b) => a.generation - b.generation);
  const sequenceValid = generations.every((generation, index) => generation.generation === index + 1);
  const activeExists = generations.some((generation) => generation.generation === thread.activeGeneration);
  const piIds = new Set(generations.map((generation) => generation.piSessionId));
  const mirrorIds = new Set(generations.map((generation) => generation.mirrorConversationId));
  if (!sequenceValid || !activeExists || piIds.size !== generations.length || mirrorIds.size !== generations.length) return undefined;
  return { schemaVersion: "1.0.0", thread, savedAt: envelope.savedAt };
}
