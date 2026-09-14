[< Parent](../index.md)

# CV-008.DS-002-TS-3 — Preserve Authority Under Expanded Concurrency

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to expand throughput without weakening conversational truth,
as the Mirror Desktop lifecycle,
I want four-way execution to retain exact owner authority,
so that interleaved Steering, cancellation, failure, settlement and recovery cannot cross Journeys or runs.

## Outcome

The expanded bound reuses the existing immutable `RunAuthority`, one app-level event dispatcher, Journey-keyed frontend reducer, directed native control, per-Journey settlement coordination, turn journal and exact outbox recovery. Four-way interleaving remains owner-specific, and capacity growth changes no authority schema.

## Acceptance Behavior

```text
Given four exact Journey/run authorities are active
When their deltas, Steering, cancellation, failure and terminal work interleave
Then each state transition reaches only its owning Journey and run
And stale or replacement authority is rejected or quarantined
And restart recovery replays no child or prompt
```

## Scope

- Four-way owner-keyed frontend runtime evidence.
- Native first-terminal, exact cancellation, process-death and stale-target contracts under the expanded production bound.
- Steering remaining inside its existing process and slot.
- Finalizing occupancy and exact cleanup/reinspection.
- Bounded four-child shutdown.
- Existing per-Journey settlement, journal and outbox recovery suites as regression authority.

## Out Of Scope

- Reimplementation of Steering or settlement.
- Shared Pi sessions or conversations.
- Persistence migration or prompt replay.
- Production fault injection.

## Evidence

Four-way frontend tests interleave independent terminal and stream outcomes without sibling mutation. Native tests cover exact target control, cancellation races, process death, first-terminal precedence, finalizing leases, replacement protection and four-child shutdown. Complete settlement, Steering and restart suites plus natural `Mirror Desktop Dev` validation remain required before aggregate acceptance.
