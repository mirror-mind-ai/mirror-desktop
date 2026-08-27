[< Parent](../index.md)

# CV-004.DS-003.TS-2 — Active Pair Turn Commit

**Status:** 🟠 Implemented — awaiting aggregate validation  
**Type:** Technical Story

## Outcome

One complete native Pi turn advances Harness projection and the dedicated Mirror conversation exactly once through monotonic bounded checkpoints.

## Acceptance Behavior

```text
Given the exact Pi session proves a complete correlated native turn
When settlement is committed
Then context, Pi, Harness and Mirror checkpoints advance monotonically
And duplicate evidence is idempotent
And contradictory or incomplete evidence fails closed
```

## Scope

- Bounded turn ledger with no message bodies.
- Native Pi user, assistant, leaf and ancestry evidence.
- Idempotent Harness projection checkpoint.
- Idempotent exact-conversation Mirror recording receipt.
- Atomic persistence and restart-safe monotonic transitions.

## Out of Scope

- Reimplementing Pi transcript, compaction, usage or branch semantics.
- External conversation reconciliation.
- UI recovery actions; US-2.

## Validation

Pure transition tests, Rust persistence tests and Python Mirror logger idempotency characterization.
