[< Parent](../index.md)

# CV-004.DS-003.TS-3 — Internal Recovery Classifier

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

Composer and recovery decisions depend only on unresolved work inside the verified active dedicated pair, never global parity or external advancement.

## Acceptance Behavior

```text
Given bounded active-pair evidence
When readiness is classified
Then checking, running, projection-pending, Mirror-pending, retrying, failed or ready is derived deterministically
And unrelated Pi or Mirror conversations cannot alter the result
```

## Scope

- Pure active-pair classifier and bounded reason codes.
- Fail-closed behavior for incomplete or contradictory evidence.
- Composer eligibility based on unresolved ordered commits.
- Dedicated-flow separation from dormant parity classifiers.

## Out of Scope

- Deleting parity implementation; DS-005.
- Concurrent Journey runs; DS-009.

## Validation

State-table tests covering every checkpoint boundary, stale generation and unrelated external activity.
