import type { NautilusJourneyThread } from "../../domain/nautilusJourneyThread";
import { createJourneyActivationReceipt } from "../../domain/journeyThreadProvisioning";

export function readyThread(journeyId: string): NautilusJourneyThread {
  const threadId = `thread-${journeyId}`;
  const piSessionId = `pi-${journeyId}`;
  const mirrorConversationId = `mirror-${journeyId}`;
  return {
    schemaVersion: "1.0.0",
    threadId,
    journeyId,
    createdAt: "2026-08-26T10:00:00.000Z",
    activeGeneration: 1,
    generations: [{
      generation: 1,
      status: "ready",
      piSessionId,
      piSessionFile: `/tmp/${piSessionId}.jsonl`,
      mirrorConversationId,
      createdAt: "2026-08-26T10:00:00.000Z",
      activatedAt: "2026-08-26T10:00:01.000Z",
      activationReceipt: createJourneyActivationReceipt({ journeyId, threadId, generation: 1, piSessionId, mirrorConversationId, activatedAt: "2026-08-26T10:00:01.000Z" }),
    }],
  };
}
