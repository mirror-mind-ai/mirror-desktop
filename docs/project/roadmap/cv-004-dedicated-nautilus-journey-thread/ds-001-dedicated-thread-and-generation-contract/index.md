[< CV-004](../index.md)

# CV-004.DS-001 - Dedicated Thread and Generation Contract

**Status:** ✅ Done

## Outcome

Harness can represent one durable Nautilus thread per Journey, append-only conversational generations and exactly one active dedicated Pi/Mirror pair without adopting conversations created under the parity model or in another environment.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-001.TS-1 | Dedicated Thread Authority Grammar | Technical Story | Define thread, generation, dedicated native pair, lifecycle state and active-generation authority as distinct persisted coordinates | ✅ Done |
| CV-004.DS-001.TS-2 | Generation Persistence and Invariants | Technical Story | Persist monotonic generations while rejecting duplicate active generations, native-ID reuse, cross-Journey pairs and partial-ready state | ✅ Done |
| CV-004.DS-001.TS-3 | Legacy Parity Quarantine | Technical Story | Classify existing mappings, imported transcripts and reconciliation checkpoints as non-authoritative legacy state without deleting them | ✅ Done |
| CV-004.DS-001.US-1 | Recognize Whether a Journey Has Started | User Story | Navigator sees a Journey as ready only when a dedicated generation is proven; otherwise the desktop presents a clear start state | ✅ Done |

## Contract Direction

```text
Journey 1 -> Nautilus thread 1
Nautilus thread 1 -> generations 1..n
generation n -> Pi session 1 + Mirror conversation 1
active generations per thread <= 1
```

Thread identity survives restart. Native pair identity does not. Legacy conversation association is not evidence of a dedicated pair.

## Done Condition

This story is done when domain types, persistence and migrations enforce the lifecycle contract; malformed, reused, cross-Journey and multiple-active relationships fail closed; parity-era state remains readable but cannot enable the composer; a Journey with no dedicated generation resolves deterministically to `absent`; and inspection requires no provider invocation, transcript comparison or latest-session selection.

## Boundary

This story establishes identity, persistence and migration semantics only. It does not provision native pairs, change live transcript rendering, remove old UI or expose restart.
