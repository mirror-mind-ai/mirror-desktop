[< RS020](index.md)

# CR067: Unify Recovery into One Idempotent Convergence Routine

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs020-cr067-unified-convergence`

## Problem

Five overlapping repair entry points exist: live-run finalization error handling, the manual repair action, automatic hydration repair, zero-outbox post-terminal recovery (CR062) and legacy timestamp-compatibility repair (CR061). Each grew for one incident; together they form new synchronization surface, and their interleaving is untested.

The pipeline is idempotent end to end: Pi JSONL is immutable, message IDs are append identity, re-append is harmless. This property supports replacing choreographed repairs with convergence: compare desired state (settled turns in Pi JSONL and the journal) with observed state (Mirror messages, outbox, projection files) and converge the difference.

## Expected Behavior

One convergence routine per Journey, owned by the CR066 coordinator, invoked identically from hydration, the manual repair action and post-terminal completion. Given known-inactive occupancy it inspects durable evidence, reconstructs any missing frontier exactly (projection, outbox, append, acknowledgement, settlement), publishes atomically and stops. Running it on a synchronized Journey is a no-op. Running it twice concurrently is impossible by serialization. The four superseded repair paths are deleted; CR061 legacy-timestamp normalization survives as a bounded step inside the routine, not a separate path.

## Acceptance Horizon

- CR064 fault-injection scenarios (append failure, acknowledgement failure, missing outbox, stale projection, delayed older-run convergence) all recover through the single routine.
- No-op proof: converging a settled Journey performs zero writes.
- The deleted paths have no remaining callers or dead exports.
- Unknown occupancy and active execution remain fail-closed for convergence.

## Boundaries

Model-free, exact, generation-scoped, serialized. No provider retry or substitution. No Mirror Core change.

## Implementation Outcome

The coordinator gained `convergeDelivery(journeyId, deps)`, one serialized convergence routine composing three exact passes:

1. legacy outbox items (schema `1.0.0`) through `resolvePersistedSettlementRecovery`, journal advancement, retained-lease release and idempotent append/acknowledge;
2. Pi-backed items (schema `1.1.0`) through thread/generation validation, transcript-based reconstruction, surface projection, receipt application, post-frontier save, journal settlement and acknowledgement (CR051/CR061/CR062 semantics preserved verbatim);
3. a `projected` journal-record resume through `executeCompletedSettlement(projectionAlreadyDurable: true)`.

Every pass publishes through the monotonic coordinator publication and reports failures as `synchronization_convergence_partial`. CR061 legacy-timestamp normalization survives inside `reconcileDeliveryDebt` materialization, not as a separate path.

Deleted from `App.tsx`: `retryMirrorAppendSummary`, `repairPiBackedMirrorDeliveryDebt`, `resumeProjectedMirrorSynchronization` and `retryPendingMirrorCommit`. Every entry point now converges through one wrapper, `recoverPostTerminalPersistence` (occupancy-gated, serialized by `postTerminalRecoveryRef`): outbox hydration, journal hydration's projected resume, the blocking-turn recovery route, the manual `retry_mirror_sync` route and the Repair button. The busy-path hydration retry loop was removed: unknown occupancy or an active runtime waits instead of repairing.

`App.tsx` shrank from 5,623 to 5,319 lines; no outbox, append, acknowledgement or settlement execution remains in the renderer.

## Validation

- CR064 contract: 9 scenarios green, with `repairDeliveryDebt` now executing the real `convergeDelivery` routine through world deps.
- New no-op proof: converging an already synchronized Conversation performs zero writes (journal, Mirror, projection reference and base reference unchanged).
- Source-inspection guardrails repointed at the coordinator; `App.tsx` is asserted to contain none of the four deleted paths.
- Complete frontend suite: 161 files, 916 tests.
- TypeScript/Vite build passed; roadmap consistency `READY`; `git diff --check` clean.

## Closure

Closed on 2026-09-21 with explicit Navigator authorization.

Proportionality and debt review: `no_action`. The routine reuses the existing exact recovery semantics unchanged and deletes more code than it adds to the renderer; release-shaped and manual validation belong to CR068.
