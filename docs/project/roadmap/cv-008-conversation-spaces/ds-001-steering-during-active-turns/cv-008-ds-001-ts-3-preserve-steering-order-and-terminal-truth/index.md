[< Parent](../index.md)

# CV-008.DS-001-TS-3 - Preserve Steering Order and Terminal Truth

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to keep Steering trustworthy after the live moment passes,
as the conversation and settlement boundary,
I want ordered durable Steering evidence and honest terminal reconciliation,
so that restart, cancellation and provider failure never fabricate application or lose accepted intent.

## Outcome

Every Steering request has stable FIFO identity and an evidence-backed terminal interpretation. Applied user entries and assistant continuations reconcile into one logical Mirror Desktop run, while accepted messages without application proof become terminally unconsumed.

## Acceptance Behavior

```text
Given multiple Steering requests belong to one active run
When Pi applies, rejects or leaves them unconsumed
Then their sequence and evidence remain deterministic through settlement
And duplicate text remains separately attributable
And restart restores only what durable authority proves

Given terminal transcript reconciliation completes
When Mirror Desktop commits the logical turn
Then the initial prompt, applied Steering entries and final assistant answer retain exact Pi entry evidence
And Mirror append does not duplicate or omit the settled turn
```

## Scope

- FIFO ledger and duplicate-text identity.
- Applied evidence from authoritative Pi message or session entries.
- Additive persisted-conversation and turn-journal compatibility.
- Multi-entry transcript reconciliation within one logical run.
- Cancellation, process death, provider failure, settlement and restart resolution.
- Mirror append and historical conversation integrity.

## Out Of Scope

- Resuming an in-memory Pi queue after process death.
- Claiming application from final prose or queue disappearance alone.
- Multiple conversations, persona spaces or expanded concurrency.

## Validation

Property-style ordering tests, persistence compatibility tests, terminal race tests, settlement and Mirror append integration tests, restart probes and aggregate Navigator validation.
