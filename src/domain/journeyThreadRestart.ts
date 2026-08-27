import {
  classifyNautilusJourneyThread,
  validateNautilusThreadTransition,
  type NautilusJourneyThread,
  type NautilusThreadGeneration,
} from "./nautilusJourneyThread";

export type JourneyRestartOperation = {
  schemaVersion: "1.0.0";
  operationId: string;
  journeyId: string;
  threadId: string;
  priorGeneration: number;
  nextGeneration: number;
  status: "reserved" | "provisioning" | "verifying";
};

export function createJourneyRestartOperation(
  thread: NautilusJourneyThread,
  operationId: string,
): JourneyRestartOperation {
  const classified = classifyNautilusJourneyThread(thread, thread.journeyId);
  if (classified.kind !== "ready" || !operationId.trim()) throw new Error("restart_authority_invalid");
  return {
    schemaVersion: "1.0.0",
    operationId,
    journeyId: thread.journeyId,
    threadId: thread.threadId,
    priorGeneration: thread.activeGeneration,
    nextGeneration: thread.activeGeneration + 1,
    status: "reserved",
  };
}

export function publishRestartedGeneration(input: {
  thread: NautilusJourneyThread;
  operation: JourneyRestartOperation;
  generation: NautilusThreadGeneration;
  closedAt: string;
}): NautilusJourneyThread {
  const { thread, operation, generation, closedAt } = input;
  if (
    operation.journeyId !== thread.journeyId
    || operation.threadId !== thread.threadId
    || operation.priorGeneration !== thread.activeGeneration
    || operation.nextGeneration !== thread.activeGeneration + 1
    || generation.generation !== operation.nextGeneration
    || generation.status !== "ready"
  ) throw new Error("restart_authority_invalid");
  const next: NautilusJourneyThread = {
    ...thread,
    activeGeneration: operation.nextGeneration,
    generations: [
      ...thread.generations.map((item) => item.generation === operation.priorGeneration
        ? { ...item, status: "inactive" as const, closedAt }
        : item),
      generation,
    ],
  };
  const transition = validateNautilusThreadTransition(thread, next);
  const readiness = classifyNautilusJourneyThread(next, next.journeyId);
  if (!transition.valid || readiness.kind !== "ready") throw new Error("restart_transition_invalid");
  return next;
}

export function projectGenerationHistory(thread: NautilusJourneyThread) {
  return [...thread.generations]
    .sort((left, right) => right.generation - left.generation)
    .map((generation) => ({
      generation: generation.generation,
      status: generation.generation === thread.activeGeneration ? "active" as const : "inactive" as const,
      piSessionName: generation.piSessionName,
      mirrorConversationName: generation.mirrorConversationName,
      createdAt: generation.createdAt,
      activatedAt: generation.activatedAt,
      closedAt: generation.closedAt,
    }));
}
