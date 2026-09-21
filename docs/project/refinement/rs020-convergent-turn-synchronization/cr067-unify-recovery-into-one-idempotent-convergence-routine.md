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

## Reopened (2026-09-21)

CR068 homologation recorded `mirror_append_item_missing`: a convergence pass raced a completing delivery and failed loudly on a vanished outbox item although final durable state was fully settled. Convergence must treat a natively-missing item whose journal record is settled (or whose exact messages already exist in Mirror) as an already-converged no-op, and the coordinator must stop emitting `durable_evidence_changed` mid-transaction at enqueue time. Status returns to `in_progress`.

## Reopening Correction (2026-09-21)

Convergence now treats an already-settled exact journal record as an immediate no-op before touching the journal or outbox, and a natively vanished item (`mirror_append_item_missing`) whose record is settled as already converged, clearing any stale exact error. The coordinator also stopped emitting `durable_evidence_changed` mid-transaction at enqueue time; evidence events fire only at terminal outcomes. The CR064 contract gained the scene "treats a vanished outbox item with a settled journal as already converged", exercising a stale reconcile snapshot racing an out-of-band completion. Delivered on `refinement/rs020-cr068-release-shaped-acceptance`.

## Reopening Correction 2 (2026-09-21)

The repeated CR068 homologation, run in the Desktop Conversation `RS020 Validation`, exposed a convergence authority gap: `mirror_append_complete_durable_projection_missing` for `turn-agent-run-2026-09-21T03:02:00.677Z`. Read-only inspection showed the true frontier: both exact messages already delivered to Mirror Conversation `f308e82c`, journal retained at `outbox_enqueued`, outbox item retained — only acknowledgement and settlement missing. Convergence failed before reaching them because `ConvergenceDeps.loadThread` resolved only the Journey's dedicated Nautilus thread, while this item belongs to a `desktop-thread-*` Conversation.

Correction: thread authority lookup is now scoped by `(journeyId, threadId)` and wired to `loadConversationThreadAuthority`, which resolves dedicated and Desktop Conversation threads alike. The world fixture now refuses thread lookups for foreign threadIds, pinning the scoped contract. The retained production turn is expected to converge automatically on the corrected candidate's hydration, through the idempotent existing-message receipt.

## Reopening Correction 3 (2026-09-21)

Convergence entry now also refuses fresh-runtime activity through `journeyRuntimeStateRef` before calling the native reconcile, and the native `mirror_append_pi_recovery_active_lease` refusal is classified as deferral rather than failure. The world fixture mirrors the native active-lease refusal, and the CR064 race scenes were corrected to the true semantics: repair defers during an active successor and converges after it settles.

## Closure

Closed on 2026-09-21. The three reopening corrections (deferral classification, already-converged tolerance and Desktop Conversation thread authority) were validated by the passed fifth homologation, including the retained production turn converging automatically on hydration. Proportionality and debt review: `no_action`.
