// CR086: synchronization attention is a presentation gate derived from a per-Journey
// ledger of convergence attempts. A single failed attempt is ordinary self-repair and
// stays internal. Only failure that persists (a second consecutive failure, or one
// failure older than a bounded window) becomes user-visible, and only when durable
// debt exists for the Journey or the durable evidence store itself is unreadable.

import { hasTerminalMirrorAppendRejection } from "./mirrorAppendRejection";

export const SYNCHRONIZATION_FAILURE_PERSISTENCE_MS = 10_000;
export const SYNCHRONIZATION_FAILURE_ATTEMPT_THRESHOLD = 2;

export type SynchronizationAttemptOutcome =
  | { kind: "succeeded"; at: string }
  | { kind: "deferred"; at: string }
  | { kind: "failed"; at: string; reason: string; evidenceUnavailable?: boolean };

export type JourneySynchronizationLedger = Readonly<{
  inFlight: boolean;
  consecutiveFailures: number;
  firstFailureAt?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
  evidenceUnavailable: boolean;
}>;

export type SynchronizationAttention =
  | { attention: false; reevaluateAt?: string }
  | { attention: true; reason: string };

const EMPTY_LEDGER: JourneySynchronizationLedger = {
  inFlight: false,
  consecutiveFailures: 0,
  evidenceUnavailable: false,
};

export function beginSynchronizationAttempt(
  current: JourneySynchronizationLedger | undefined,
): JourneySynchronizationLedger {
  return { ...(current ?? EMPTY_LEDGER), inFlight: true };
}

export function recordSynchronizationAttempt(
  current: JourneySynchronizationLedger | undefined,
  outcome: SynchronizationAttemptOutcome,
): JourneySynchronizationLedger {
  const base = current ?? EMPTY_LEDGER;
  switch (outcome.kind) {
    case "succeeded":
      return { ...EMPTY_LEDGER };
    case "deferred":
      return { ...base, inFlight: false };
    case "failed":
      return {
        inFlight: false,
        consecutiveFailures: base.consecutiveFailures + 1,
        firstFailureAt: base.firstFailureAt ?? outcome.at,
        lastFailureAt: outcome.at,
        lastFailureReason: outcome.reason,
        evidenceUnavailable: outcome.evidenceUnavailable ?? false,
      };
  }
}

export function deriveSynchronizationAttention(input: {
  durableDebt: boolean;
  ledger: JourneySynchronizationLedger | undefined;
  now: string;
}): SynchronizationAttention {
  const ledger = input.ledger;
  if (!ledger || ledger.consecutiveFailures === 0 || !ledger.firstFailureAt || !ledger.lastFailureReason) {
    return { attention: false };
  }
  if (!input.durableDebt && !ledger.evidenceUnavailable) return { attention: false };
  // CR093: patience only makes sense for failures that might self-repair. A bounded contract
  // rejection is a fact about the durable record, so it becomes actionable on first sight.
  if (hasTerminalMirrorAppendRejection(ledger.lastFailureReason)) {
    return { attention: true, reason: ledger.lastFailureReason };
  }
  if (ledger.consecutiveFailures >= SYNCHRONIZATION_FAILURE_ATTEMPT_THRESHOLD) {
    return { attention: true, reason: ledger.lastFailureReason };
  }
  // A single failure becomes attention only by age, and only while nobody is retrying it:
  // an in-flight automatic attempt (for example on Journey hydration) must resolve first.
  if (ledger.inFlight) return { attention: false };
  const deadline = Date.parse(ledger.firstFailureAt) + SYNCHRONIZATION_FAILURE_PERSISTENCE_MS;
  if (Date.parse(input.now) >= deadline) {
    return { attention: true, reason: ledger.lastFailureReason };
  }
  return { attention: false, reevaluateAt: new Date(deadline).toISOString() };
}

export function isSilentSynchronizationDeferral(reason: string): boolean {
  return reason.includes("mirror_append_pi_recovery_active_lease");
}
