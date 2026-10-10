import type { NautilusJourneyThread } from "../../domain/nautilusJourneyThread";
import { createJourneyActivationReceipt } from "../../domain/journeyThreadProvisioning";

/**
 * CR141: `threadId` is optional so a test can build two sibling workspaces in one Journey. When it
 * is given, the Pi session and Mirror conversation derive from the **thread**, as CR139 corrected
 * in the Rust fake for the same reason: a Pi session belongs to a thread, so siblings deriving
 * theirs from the Journey would collide and hide the very crossing a routing test is checking for.
 * All callers passing one argument keep the Journey-derived identity they had.
 */
export function readyThread(journeyId: string, threadId?: string): NautilusJourneyThread {
  const resolvedThreadId = threadId ?? `thread-${journeyId}`;
  // A caller passing one argument keeps the exact identity it had; only an explicit sibling thread
  // derives its own, so adding the parameter cannot move any of the existing callers.
  const identity = threadId ?? journeyId;
  const piSessionId = `pi-${identity}`;
  const mirrorConversationId = `mirror-${identity}`;
  return {
    schemaVersion: "1.0.0",
    threadId: resolvedThreadId,
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
      activationReceipt: createJourneyActivationReceipt({ journeyId, threadId: resolvedThreadId, generation: 1, piSessionId, mirrorConversationId, activatedAt: "2026-08-26T10:00:01.000Z" }),
    }],
  };
}
