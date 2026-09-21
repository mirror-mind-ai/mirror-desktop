[< RS020](index.md)

# CR066: Extract a Serialized Turn Finalization Coordinator from the Renderer

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs020-cr066-finalization-coordinator`

## Problem

`App.tsx` executes the post-terminal transaction (projection → outbox → append → acknowledgement → settlement → publication) inside a React component, using refs to escape stale closures and competing effects as scheduling. Render timing is part of the persistence protocol. Publication updates base state and the runtime snapshot through different code at different times, which produced the CR063 recurrence: automatic repair updated base state while the runtime snapshot kept presenting a pre-repair replica.

## Expected Behavior

A renderer-independent module owns turn finalization:

- one queue per Journey, serialized, single writer;
- it consumes terminal evidence and executes the existing domain steps (reusing `executeCompletedSettlement`, journal, outbox and receipt code unchanged where possible);
- it publishes one atomic presentation state per Journey generation; base state and runtime snapshot stop existing as independently written replicas of the same conversation;
- committed never regresses to pending for the same exact turn (monotonic publication);
- late convergence for an older run publishes only into its exact generation and never touches a successor;
- React subscribes and renders; it does not orchestrate.

## Acceptance Horizon

- The full CR064 contract passes, including mid-sequence navigation and restart.
- The finalization code paths inside `App.tsx` are removed, not wrapped.
- CR063's grep-the-source tests are deleted together with the code they inspected.
- `App.tsx` no longer contains outbox, append, acknowledgement or settlement calls.
- All existing domain-level tests keep passing without weakened assertions.

## Boundaries

Refactor, not rewrite: durable schemas, domain modules and validation semantics are preserved. No provider or model route. No Mirror Core change.

## Implementation Outcome

New module `src/app/turnFinalizationCoordinator.ts` with production storage wiring in `src/app/turnFinalizationPorts.ts`:

- `createTurnFinalizationCoordinator()` owns a serialized per-Journey queue, `finalizeCompletedTurn(...)` (journal-completed validation, exact evidence application, harness commit, decoration, `executeCompletedSettlement`) and `finalizeInterruptedTurn(...)`;
- publication is atomic and monotonic: every presentation event passes through `upgradeMirrorCommitments(...)`, so a committed exact turn can never regress to pending for the same generation, and late older-run publications upgrade instead of replace;
- storage effects flow through an injectable `TurnFinalizationPorts`, letting the CR064 contract drive the real coordinator with deterministic in-memory stores;
- `enqueueProjectionOutbox`, `appendAndAcknowledgeProjection` and `validateExactOutboxSummary` moved out of the renderer and are shared by the remaining repair paths.

In `App.tsx`:

- the completed-turn settlement transaction and the interrupted settlement call were replaced by coordinator calls;
- one subscription applies each publication to the runtime snapshot (exact identity) and the base conversation in the same tick; a publication that does not contain the base's current turn upgrades it monotonically instead of replacing it;
- `publishSettledProjectionIfCurrent`, `validateExactOutboxSummary`, `enqueueExactProjectionOutbox` and `appendAndAcknowledgeExactProjection` were deleted; repair paths now publish through `turnFinalizationCoordinator.publishSettled(...)`;
- outbox and journal presentation state refresh through coordinator `durable_evidence_changed` events.

The CR064 world fixture now executes the real coordinator with full journal-record authority, proving the extraction against the acceptance contract. The CR063 grep assertions were deleted; the remaining source-inspection tests were repointed at the coordinator module.

Repair orchestration (`retryMirrorAppendSummary`, `repairPiBackedMirrorDeliveryDebt`, `retryPendingMirrorCommit`, `resumeProjectedMirrorSynchronization`, `recoverPostTerminalPersistence`) intentionally remains in `App.tsx`: deleting and unifying those five entry points is exactly CR067's scope.

## Validation

- CR064 contract: 8 scenarios green through the real coordinator.
- Complete frontend suite: 161 files, 915 tests.
- TypeScript/Vite build passed; roadmap consistency `READY`; `git diff --check` clean.

## Closure

Closed on 2026-09-21 with explicit Navigator authorization.

Proportionality and debt review: `no_action` beyond captured scope. The remaining repair-path orchestration inside `App.tsx` and the surviving source-inspection tests are exactly CR067's deletion scope, not new debt.

## Post-Closure Correction (2026-09-21)

CR068 homologation traced the historical per-turn synchronization flash to a latent ordering defect that CR066 had preserved verbatim from the pre-RS020 renderer: `appendAndAcknowledgeProjection` acknowledged the outbox item before advancing the journal to `settled`, while the CR062-era native `transition_turn_journal` requires the exact item to still exist for that transition. Every live turn therefore failed its final journal advance with `mirror_append_item_missing`, leaving `outbox_enqueued` debt that convergence re-materialized and settled seconds later — the visible flash since the CR063 era. The coordinator now settles the journal before acknowledging, matching the native contract and the CR062 recovery ordering.
