/**
 * CR116: every per-Journey queue in settlement chains the next task onto the previous one and
 * recovers from a *rejected* predecessor by deliberate construction — `prior.catch()` in the
 * persistence coordinator, `previous.then(task, task)` in the finalization coordinator. Neither
 * recovers from a predecessor that never settles, and nothing in either chain was bounded. One
 * pending native command therefore stranded its whole Journey for the life of the process: the
 * turn stayed in `Finishing`, sending stayed blocked, and `convergeDelivery` parked behind the
 * finalization that was supposed to release it.
 *
 * The bound stops the wait, not the work. An operation that exceeds it is abandoned: its caller
 * fails with a named reason, the queue advances, and the operation keeps running detached. That is
 * safe because the durable layers already refuse a late landing — journal transitions carry
 * native revision and phase expectations, and durable projection writes are staged with the
 * previous file preserved on failure. A revived zombie cannot regress a record; it can only lose.
 */

/** A generous ceiling. A real Journey writes multi-megabyte projections and inspects a 55 MB
 * session, so this exists to catch a wait that will never end, not to police slowness. A bound
 * that fired on ordinary work would be a worse defect than the strand it replaces. */
export const PERSISTENCE_OPERATION_BOUND_MS = 120_000;

export type BoundBudget = {
  /** Settles when the bound elapses. After `cancel` it must never settle. */
  expiry: Promise<void>;
  cancel: () => void;
};

export type BoundTimer = (boundMs: number) => BoundBudget;

export type BoundedOperationOptions = {
  /** Names the phase in the failure, so a reader can tell which step stopped. */
  label: string;
  boundMs?: number;
  timer?: BoundTimer;
  onAbandon?: (reason: string) => void;
};

const ABANDONED_PREFIX = "persistence_operation_abandoned";

export function abandonedOperationReason(label: string, boundMs: number): string {
  return `${ABANDONED_PREFIX}:${label}:${boundMs}`;
}

export function isAbandonedOperationReason(reason: string): boolean {
  return reason.includes(ABANDONED_PREFIX);
}

/**
 * What the Navigator should read. `Finishing` forever was the misleading part of this defect, so
 * the replacement has to say plainly that a step stopped, that the answer survived it, and that
 * repair is available.
 */
export function describeAbandonedOperation(reason: string): string | undefined {
  if (!isAbandonedOperationReason(reason)) return undefined;
  return "A step in saving this turn stopped responding and was given up on, so the Journey is "
    + "usable again. The agent's answer is preserved in the Pi session and nothing was discarded. "
    + "Repairing synchronization completes the turn from that evidence.";
}

export const systemBoundTimer: BoundTimer = (boundMs) => {
  let expire: (() => void) | undefined;
  const expiry = new Promise<void>((resolve) => { expire = resolve; });
  const handle = setTimeout(() => expire?.(), boundMs);
  return {
    expiry,
    // Cancelling leaves `expiry` permanently pending, which is exactly right: a bound that did
    // not elapse must never report an abandonment.
    cancel: () => clearTimeout(handle),
  };
};

export function runBoundedOperation<T>(
  operation: () => Promise<T>,
  options: BoundedOperationOptions,
): Promise<T> {
  const boundMs = options.boundMs ?? PERSISTENCE_OPERATION_BOUND_MS;
  const bound = (options.timer ?? systemBoundTimer)(boundMs);
  const work = operation();
  // The abandoned operation stays alive on purpose. Its late outcome belongs to nobody, so it is
  // absorbed here rather than escaping as an unhandled rejection.
  work.then(undefined, () => undefined);

  return new Promise<T>((resolve, reject) => {
    let decided = false;
    const decide = (settle: () => void) => {
      if (decided) return;
      decided = true;
      settle();
    };
    work.then(
      (value) => { bound.cancel(); decide(() => resolve(value)); },
      (error) => { bound.cancel(); decide(() => reject(error)); },
    );
    void bound.expiry.then(() => {
      const reason = abandonedOperationReason(options.label, boundMs);
      decide(() => {
        options.onAbandon?.(reason);
        reject(new Error(reason));
      });
    });
  });
}
