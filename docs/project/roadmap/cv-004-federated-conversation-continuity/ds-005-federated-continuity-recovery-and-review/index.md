[< CV-004](../index.md)

# CV-004.DS-005 - Federated Continuity Recovery and Review

**Status:** 🟡 Planned

## Outcome

Interrupted commits, multiple Pi lineages, changed Mirror destinations and migrated parity-era state remain recoverable and understandable without hidden selection, provider reinvocation or synthetic transcript merge.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-005.TS-1 | Federated Recovery Decision Table | Technical Story | Define idempotent recovery for partial Pi projection, pending Mirror recording, stale context receipts, missing native artifacts and interrupted binding transitions | 🟡 Planned |
| CV-004.DS-005.US-1 | Resolve Multiple Pi Lineages | User Story | Navigator can compare bounded lineage metadata and explicitly choose, preserve as a branch or decline candidates without content-based guessing | 🟡 Planned |
| CV-004.DS-005.US-2 | Inspect Conversation Provenance | User Story | Navigator can inspect binding history, correlated turn receipts and unresolved body state without exposing reasoning, secrets or arbitrary environment values | 🟡 Planned |
| CV-004.DS-005.US-3 | Federated Continuity Desktop Review | User Story | Navigator validates normal continuation, independent lifecycle changes, reactivation, failure recovery, migration and ambiguity across Harness, Pi and Mirror | 🟡 Planned |

## Required Review Scenarios

- A unique linked Pi lineage advances outside Harness and refreshes directly.
- Mirror context advances without adding Pi transcript messages.
- Mirror recording fails after Pi completion and retries exactly once without provider invocation.
- `/mm-new` changes the Mirror epoch while preserving the Pi lineage.
- Pi branching changes ancestry while preserving the prior lineage as history.
- Two Pi lineages advance and no candidate is selected silently.
- A binding transition is interrupted and restores the last valid generation.
- Existing parity-era conversations migrate without being declared current from appearance alone.
- Window reactivation and Journey switching discard stale inspection results.

## Done Condition

This story is done when the required scenarios pass automated and Navigator-visible desktop validation; every retry is model-free and idempotent; incomplete turns remain inert; last-valid authority survives interruption; multiple candidates require explicit choice; provenance remains bounded and non-secret; migration preserves useful history without false proof; and the aggregate review demonstrates continuity by native identity and receipts rather than conversation equality.

## Boundary

Recovery repairs relationships and projections only. It never regenerates an answer, invokes synthesis, republishes Journey meaning, merges independent transcripts from text similarity or chooses a latest session on the Navigator's behalf.
