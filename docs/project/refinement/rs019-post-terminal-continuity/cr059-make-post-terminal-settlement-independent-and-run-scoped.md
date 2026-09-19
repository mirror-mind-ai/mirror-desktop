[< RS019](index.md)

# CR059: Make Post-Terminal Settlement Independent and Run-Scoped

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Releasing occupancy immediately after terminalization allows a successor to start while an older run still has projection, journal, outbox, Mirror or acknowledgement work pending. Existing finalization code frequently reloads or publishes the active generation projection and may assume that no newer run exists.

Without explicit run-scoped idempotency, late completion for an older run could overwrite newer presentation state, release the wrong lease, misclassify the current runtime or acknowledge the wrong delivery item.

## Expected Behavior

Every post-terminal operation is keyed to immutable run, turn, generation and Pi entry authority. It may finish after a successor begins, but can mutate only its own projection metadata, outbox item, journal record and receipt. Stale work becomes a bounded diagnostic rather than affecting the successor.

## Proposed Scope

- Inventory post-terminal async continuations and active-generation assumptions.
- Make projection publication merge/rebuild from Pi-backed authority instead of replacing newer transcript state.
- Make outbox creation and acknowledgement independent of the current selected run.
- Ensure late callbacks cannot clear successor busy state, lease state, notices or Composer data.
- Preserve exact idempotency across relaunch and repeated completion attempts.
- Expose unresolved settlement as visible debt without changing availability.

## Acceptance

- An older run can complete projection/outbox/Mirror work after a successor starts.
- Late cleanup cannot release or alter the successor.
- Projection and acknowledgement writes are monotonic and exact-run scoped.
- Missing Desktop projection degrades metadata/presentation but not transcript continuity.
- Mirror outage remains durable non-blocking debt.
- No provider is rerun implicitly.

## Boundaries

- Depends on CR057 and CR058.
- Does not change Mirror Core schema or queue ownership.
- Does not mutate production data or silently discard legacy debt.
- Push, publication and release remain separate decisions.
