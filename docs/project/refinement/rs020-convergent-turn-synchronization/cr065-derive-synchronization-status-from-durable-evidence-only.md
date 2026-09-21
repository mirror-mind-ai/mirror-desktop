[< RS020](index.md)

# CR065: Derive Synchronization Status from Durable Evidence Only

**Status:** captured
**Driver:** —
**Delivery:** —

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
