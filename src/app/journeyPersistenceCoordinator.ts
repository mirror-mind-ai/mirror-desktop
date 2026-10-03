import type { JourneySettlementAuthority } from "./journeySettlement";
import { runBoundedOperation, type BoundTimer } from "./boundedPersistenceOperation";

export type JourneyPersistencePhase = "pre_frontier" | "post_frontier" | "interrupted" | "rollback";

export type JourneyPersistenceCoordinator = {
  run<T>(
    authority: JourneySettlementAuthority,
    phase: JourneyPersistencePhase,
    operation: () => Promise<T>,
  ): Promise<T>;
  inspect(): ReadonlyArray<{ journeyId: string; runId: string; turnId: string; phase: JourneyPersistencePhase }>;
};

export type JourneyPersistenceCoordinatorOptions = {
  boundMs?: number;
  timer?: BoundTimer;
  onAbandon?: (journeyId: string, phase: JourneyPersistencePhase, reason: string) => void;
};

export function createJourneyPersistenceCoordinator(
  options: JourneyPersistenceCoordinatorOptions = {},
): JourneyPersistenceCoordinator {
  const tails = new Map<string, Promise<void>>();
  const inFlight = new Map<string, Promise<unknown>>();
  const visible = new Map<string, { journeyId: string; runId: string; turnId: string; phase: JourneyPersistencePhase }>();

  function run<T>(
    authority: JourneySettlementAuthority,
    phase: JourneyPersistencePhase,
    operation: () => Promise<T>,
  ): Promise<T> {
    const exactKey = `${authority.journeyId}\u0000${authority.runId}\u0000${authority.turnId}\u0000${phase}`;
    const duplicate = inFlight.get(exactKey);
    if (duplicate) return duplicate as Promise<T>;

    const prior = tails.get(authority.journeyId) ?? Promise.resolve();
    // CR116: `prior.catch()` already let the chain survive a rejected predecessor. The bound is
    // what lets it survive one that never settles: on expiry this task rejects, so `tail` settles
    // and every successor for this Journey runs instead of waiting forever.
    const task = prior.catch(() => undefined).then(() => runBoundedOperation(operation, {
      label: phase,
      boundMs: options.boundMs,
      timer: options.timer,
      onAbandon: (reason) => options.onAbandon?.(authority.journeyId, phase, reason),
    }));
    const tail = task.then(() => undefined, () => undefined);
    inFlight.set(exactKey, task);
    visible.set(exactKey, {
      journeyId: authority.journeyId,
      runId: authority.runId,
      turnId: authority.turnId,
      phase,
    });
    tails.set(authority.journeyId, tail);

    const cleanup = () => {
      if (inFlight.get(exactKey) === task) {
        inFlight.delete(exactKey);
        visible.delete(exactKey);
      }
      if (tails.get(authority.journeyId) === tail) tails.delete(authority.journeyId);
    };
    void task.then(cleanup, cleanup);
    return task;
  }

  return {
    run,
    inspect: () => [...visible.values()].sort((left, right) => (
      left.journeyId.localeCompare(right.journeyId)
      || left.runId.localeCompare(right.runId)
      || left.phase.localeCompare(right.phase)
    )),
  };
}

export const journeyPersistenceCoordinator = createJourneyPersistenceCoordinator();
