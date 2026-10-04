/**
 * CR119: `Finishing` lasted up to thirty minutes in production and nothing recorded which step
 * took the time. Measured across 569 settled production turns, duration tracks Pi session size
 * strongly between Journeys and not at all within one, where it still swings from five seconds to
 * thirty minutes. Four candidate causes were eliminated with the data that existed — including
 * the strongest, a full-session read at settlement, which the code disproves. The remaining
 * variance cannot be attributed without timing each phase.
 *
 * This module accumulates that timing in memory and hands back one record when the turn settles.
 * It never writes. That is deliberate: CR116's strand was caused by per-event persistence traffic
 * on the settlement path, and a measurement that added more of it would be the defect it exists
 * to explain. The one write per turn happens elsewhere, after the record is complete, and a
 * failure to make it must never fail a settlement.
 *
 * The timings also do not go in the turn journal. That record is serde-strict and its revision,
 * phase and receipt fields gate the recovery guards CR116 depends on; coupling a diagnostic to the
 * structure that governs recovery is not worth the tidier location.
 */
import type { TurnFinalizationPorts } from "./turnFinalizationCoordinator";

export type SettlementTimingAuthority = Readonly<{
  journeyId: string;
  runId: string;
  turnId: string;
  generation: number;
}>;

export type SettlementPhaseOutcome = "completed" | "failed";
export type SettlementOutcome = "settled" | "failed";

export type SettlementPhaseTiming = Readonly<{
  phase: string;
  /** 0 for a phase the coordinator runs directly; deeper for steps inside it. Only depth 0
   * phases partition the window; deeper ones explain where a depth 0 phase spent its time. */
  depth: number;
  startedAt: string;
  elapsedMs: number;
  outcome: SettlementPhaseOutcome;
}>;

export type SettlementTimingRecord = Readonly<{
  schemaVersion: "0.1.0";
  journeyId: string;
  runId: string;
  turnId: string;
  generation: number;
  startedAt: string;
  finishedAt: string;
  totalMs: number;
  outcome: SettlementOutcome;
  phases: readonly SettlementPhaseTiming[];
}>;

export type SettlementTimingClock = {
  now(): number;
  iso(): string;
};

export const systemSettlementTimingClock: SettlementTimingClock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

export type SettlementTimingCollector = {
  readonly authority: SettlementTimingAuthority;
  time<T>(phase: string, operation: () => Promise<T>): Promise<T>;
  /** The innermost phase running now, which is the one a reader should see named. */
  currentPhase(): string | undefined;
  subscribe(listener: (phase: string | undefined) => void): () => void;
  finish(outcome: SettlementOutcome): SettlementTimingRecord;
};

export function createSettlementTimingCollector(
  authority: SettlementTimingAuthority,
  clock: SettlementTimingClock = systemSettlementTimingClock,
): SettlementTimingCollector {
  const startedAtMs = clock.now();
  const startedAt = clock.iso();
  const phases: SettlementPhaseTiming[] = [];
  const stack: string[] = [];
  const listeners = new Set<(phase: string | undefined) => void>();

  function announce(): void {
    const current = stack[stack.length - 1];
    for (const listener of [...listeners]) listener(current);
  }

  return {
    authority,
    async time(phase, operation) {
      const began = clock.now();
      const beganAt = clock.iso();
      const depth = stack.length;
      // The slot is reserved at start so phases read in the order they began: an outer phase
      // first, then the steps inside it that explain where its time went.
      const slot = phases.length;
      phases.push({ phase, depth, startedAt: beganAt, elapsedMs: 0, outcome: "failed" });
      stack.push(phase);
      announce();
      let outcome: SettlementPhaseOutcome = "completed";
      try {
        return await operation();
      } catch (error) {
        outcome = "failed";
        throw error;
      } finally {
        stack.pop();
        phases[slot] = { phase, depth, startedAt: beganAt, elapsedMs: clock.now() - began, outcome };
        announce();
      }
    },
    currentPhase: () => stack[stack.length - 1],
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    finish(outcome) {
      const finishedMs = clock.now();
      return {
        schemaVersion: "0.1.0",
        ...authority,
        startedAt,
        finishedAt: clock.iso(),
        totalMs: finishedMs - startedAtMs,
        outcome,
        phases: [...phases],
      };
    },
  };
}

/**
 * One collector per Journey. Finalization is serialized per Journey by the coordinator, so the
 * Journey id is enough to find the turn being settled, and ports that only receive a Journey id
 * can still attribute their time.
 */
export type SettlementTimingRegistry = {
  begin(authority: SettlementTimingAuthority): SettlementTimingCollector;
  get(journeyId: string): SettlementTimingCollector | undefined;
  /** Times the work when a collector owns the Journey; otherwise just runs it. */
  time<T>(journeyId: string, phase: string, operation: () => Promise<T>): Promise<T>;
  end(journeyId: string, outcome: SettlementOutcome): SettlementTimingRecord | undefined;
};

export function createSettlementTimingRegistry(
  clock: SettlementTimingClock = systemSettlementTimingClock,
): SettlementTimingRegistry {
  const collectors = new Map<string, SettlementTimingCollector>();
  return {
    begin(authority) {
      const collector = createSettlementTimingCollector(authority, clock);
      collectors.set(authority.journeyId, collector);
      return collector;
    },
    get: (journeyId) => collectors.get(journeyId),
    time(journeyId, phase, operation) {
      const collector = collectors.get(journeyId);
      return collector ? collector.time(phase, operation) : operation();
    },
    end(journeyId, outcome) {
      const collector = collectors.get(journeyId);
      if (!collector) return undefined;
      collectors.delete(journeyId);
      return collector.finish(outcome);
    },
  };
}

/** Every port the finalization coordinator calls, timed under its own name. */
export function timeFinalizationPorts(
  ports: TurnFinalizationPorts,
  registry: SettlementTimingRegistry,
): TurnFinalizationPorts {
  return {
    loadActiveEvidence: (authority) => registry.time(
      authority.journeyId, "load_active_evidence", () => ports.loadActiveEvidence(authority),
    ),
    saveProjection: (projection, authority) => registry.time(
      authority.journeyId, "save_projection", () => ports.saveProjection(projection, authority),
    ),
    cleanupLease: (authority) => registry.time(
      authority.journeyId, "cleanup_lease", () => ports.cleanupLease(authority),
    ),
    loadJournal: (journeyId) => registry.time(
      journeyId, "load_journal", () => ports.loadJournal(journeyId),
    ),
    advanceJournal: (authority, expected, next) => registry.time(
      authority.journeyId, "advance_journal", () => ports.advanceJournal(authority, expected, next),
    ),
    enqueueOutboxItem: (item, authority) => registry.time(
      authority.journeyId, "enqueue_outbox_item", () => ports.enqueueOutboxItem(item, authority),
    ),
    deliverOutboxItem: (itemId, authority) => registry.time(
      authority.journeyId, "deliver_outbox_item", () => ports.deliverOutboxItem(itemId, authority),
    ),
    acknowledgeOutboxItem: (itemId, conversationId, authority) => registry.time(
      authority.journeyId, "acknowledge_outbox_item",
      () => ports.acknowledgeOutboxItem(itemId, conversationId, authority),
    ),
    loadPersistedProjection: (authority) => registry.time(
      authority.journeyId, "load_persisted_projection", () => ports.loadPersistedProjection(authority),
    ),
    savePostFrontierProjection: (projection, authority, summary) => registry.time(
      authority.journeyId, "save_post_frontier_projection",
      () => ports.savePostFrontierProjection(projection, authority, summary),
    ),
  };
}

/**
 * A fast turn must look exactly as it does today. The phase name appears only once a wait has
 * visibly begun; three seconds is past the median settlement (3.9 s across production) by a
 * margin small enough that a slow turn is named early.
 */
export const FINISHING_PHASE_VISIBLE_AFTER_MS = 3_000;

const phaseDescriptions: Record<string, string> = {
  load_journal: "reading the turn record",
  load_active_evidence: "checking the Journey",
  save_projection: "saving the conversation",
  save_durable_projection: "saving the conversation",
  load_segments: "reading chapters",
  refresh_segments: "reading the session",
  publish_segments: "publishing chapters",
  reconcile_catalog: "updating the catalog",
  enqueue_outbox_item: "queueing for Mirror",
  cleanup_lease: "releasing the run",
  deliver_outbox_item: "sending to Mirror",
  load_persisted_projection: "re-reading the conversation",
  save_post_frontier_projection: "saving the receipt",
  advance_journal: "recording the turn",
  acknowledge_outbox_item: "confirming delivery",
};

export function describeSettlementPhase(phase: string): string {
  return phaseDescriptions[phase] ?? phase.replace(/_/g, " ");
}

export function visibleFinishingPhase(input: {
  phase: string | undefined;
  since: number;
  now: number;
}): string | undefined {
  if (!input.phase) return undefined;
  if (input.now - input.since < FINISHING_PHASE_VISIBLE_AFTER_MS) return undefined;
  return describeSettlementPhase(input.phase);
}
