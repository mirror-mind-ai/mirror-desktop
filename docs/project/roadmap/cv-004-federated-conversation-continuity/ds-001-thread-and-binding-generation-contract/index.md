[< CV-004](../index.md)

# CV-004.DS-001 - Thread and Binding Generation Contract

**Status:** 🟡 Planned

## Outcome

Harness can represent a durable user-facing thread and its versioned relationships to independent Pi session generations and Mirror conversation epochs without treating any native id as a shared conversation identity.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-001.TS-1 | Federated Conversation Authority Grammar | Technical Story | Define Journey, Nautilus thread, Pi lineage, Mirror conversation epoch, binding generation, turn correlation and body-specific checkpoint as distinct authority coordinates | 🟡 Planned |
| CV-004.DS-001.TS-2 | Binding Generation Persistence and Migration | Technical Story | Persist immutable binding intervals and migrate current reconciliation state without declaring unproven legacy relationships current | 🟡 Planned |
| CV-004.DS-001.TS-3 | Cross-Epoch Turn Transition Receipt | Technical Story | Define bounded causal evidence for a Mirror conversation switch occurring between the user and assistant halves of one complete native Pi turn | 🟡 Planned |
| CV-004.DS-001.US-1 | Inspect Current Conversation Relationships | User Story | Navigator can see the current thread, selected Pi lineage, Mirror context state and recording destination in human terms with native details available on demand | 🟡 Planned |
| CV-004.DS-001.US-2 | Preserve Historical Binding Provenance | User Story | Navigator can inspect when and why a Pi or Mirror relationship changed without rewriting prior correlated turns | 🟡 Planned |

## Contract Direction

```text
Journey
  Nautilus thread
    binding generation 1
      Pi session generation A
      Mirror conversation epoch X
      valid through correlated turn 30
    binding generation 2
      Pi session generation A
      Mirror conversation epoch Y
      valid from correlated turn 31
```

A binding generation identifies relationships for an interval. It does not copy transcript content or infer equality. Its creation requires native ids, an explicit reason and an atomic authority update.

A Mirror epoch may change while a Pi turn is in progress. In that case, Pi owns turn completeness and a causal switch receipt closes the prior binding and opens the next without requiring either Mirror epoch to contain a complete user/assistant pair. See [Mirror Epoch Transition During a Pi Turn](../mirror-epoch-transition-contract.md).

## Done Condition

This story is done when the domain model and persisted schema can represent independent identities and historical binding intervals; invalid cross-Journey, stale-generation and overlapping-current bindings are rejected; current parity-era state migrates fail-closed; native ids never leak into user-facing copy by default; and no provider, Pi invocation, Mirror mutation or transcript import is required to inspect the relationship graph.

## Boundary

This story defines identity and persistence only. It does not change transcript rendering, composer eligibility, lifecycle commands or reconciliation actions.
