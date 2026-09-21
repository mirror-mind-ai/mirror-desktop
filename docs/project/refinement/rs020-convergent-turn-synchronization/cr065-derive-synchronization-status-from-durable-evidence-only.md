[< RS020](index.md)

# CR065: Derive Synchronization Status from Durable Evidence Only

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs020-cr065-durable-sync-status`

## Problem

`pendingMirrorTurnRepair(...)` derives synchronization debt from whichever in-memory projection the renderer currently holds. Both recorded false positives had identical shape: journal settled, outbox empty, Mirror committed, yet a stale renderer replica still classified the turn as pending and surfaced `Repair Mirror synchronization`. Fail-closed presentation punishes the user for internal replica disagreement.

## Expected Behavior

The synchronization notice, its classification and the repair affordance derive exclusively from durable evidence: turn journal phase, exact Journey outbox items and known native occupancy. In-memory projections may inform rendering of messages but can never create user-visible synchronization debt.

Concretely: a turn whose journal record is `settled` with `terminalOutcome: completed` and no matching outbox item is synchronized, regardless of any renderer replica state. A turn with an exact outbox item or a journal phase before `settled` after known-inactive occupancy is genuine debt and remains actionable exactly as today.

## Acceptance Horizon

- The CR064 contract's false-positive scenarios pass: no notice while durable stores agree the turn is settled.
- Genuine-debt scenarios still surface the actionable notice and the existing exact repair route.
- Divergence between durable stores (journal says settled, outbox still holds the exact item) remains fail-closed and visible.
- No mutation path changes; this CR only changes what feeds presentation.

## Boundaries

No change to journal, outbox, settlement or repair execution. No provider or model route. No Mirror Core change.

## Implementation Outcome

New domain module `src/domain/durableSynchronizationStatus.ts` with `deriveDurableSynchronizationDebt(...)`: a retained exact outbox item is debt; otherwise a journal record with `terminalOutcome: completed` in `projected` or `outbox_enqueued` is post-projection debt; settled records are synchronized. Outbox authority wins over a journal that already claims settled, keeping durable-store divergence visible and fail-closed.

In `App.tsx`:

- new `journeyTurnJournalRecords` state hydrated by the journal effect, cleared on Journey switch and refreshed by `refreshTurnJournalEvidence(...)` after live settlement, post-terminal recovery and manual retry;
- `durableSyncDebt` derives from that journal state plus `mirrorOutboxItems`, both filtered to the selected Journey;
- the synchronization notice, Composer turn status and recovery-route synchronization input now take `Boolean(durableSyncDebt)` instead of the renderer-projection `pendingMirrorRepair`;
- `legacyMirrorGap` requires durable debt, so a stale replica can no longer open the recovery notice on a healthy Conversation;
- `pendingMirrorRepair` remains only as exact repair authority for the existing recovery routes.

The CR064 world fixture mirrors the new derivation, and both red scenarios were flipped from `it.fails` to `it`.

## Validation

- CR064 contract: all 8 scenarios green, including repair racing an active successor and post-restart cleanliness.
- New unit coverage: `src/tests/durableSynchronizationStatus.test.ts` (5 cases, including the settled-journal-with-retained-outbox divergence).
- Complete frontend suite: 161 files, 915 tests.
- TypeScript/Vite build passed; roadmap consistency `READY`; `git diff --check` clean.

Eval homologation of the visible behavior remains for CR068's release-shaped validation.

## Closure

Closed on 2026-09-21 with explicit Navigator authorization after the CR064 contract flipped fully green.

Proportionality and debt review: `no_action`. The change replaces the presentation input with existing durable evidence and adds one bounded state hydration; no schema, mutation-path or Mirror Core change.
