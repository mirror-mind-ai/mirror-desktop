[< CV-008](../index.md)

# CV-008.DS-002 - Expanded Concurrent Journey Turns

**Status:** 🟡 Planned

## Outcome

Mirror Desktop can run more simultaneous turns across different Journeys than the current fixed capacity permits, using a bounded observable admission policy while preserving independent execution, projection, cancellation, persistence and settlement.

## Why This Matters

The baseline proved Journey-keyed concurrency and isolation at a deliberately small capacity. Real use now asks the cockpit to keep more work in motion without turning capacity into an invisible global refusal or weakening the authority of each run.

## Candidate Scope

- Measure frontend, native process, Pi, Mirror and host-resource behavior under increasing concurrent load.
- Choose an explicit supported capacity or bounded configurable policy from evidence.
- Keep each Journey's active state visible and make full-capacity refusal explicit without adding a global process counter or exposing unrelated Journey content.
- Preserve fair admission so one Journey or repeated sender cannot starve others.
- Retain exact targeted cancellation and independent terminal adoption.
- Exercise app restart and partial provider failure while sibling Journeys continue safely.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-008.DS-002-TS-1 | Characterize Expanded Concurrent Load | Technical Story | Reproducible evidence measures frontend, Pi processes, Mirror, persistence and host resources under increasing concurrent load and establishes the safe envelope for expansion. | 🟡 Planned |
| CV-008.DS-002-TS-2 | Establish Bounded Admission and Fairness Policy | Technical Story | One explicit policy governs capacity, reserved, running and finalizing leases, overflow, fair admission and Steering impact without allowing unlimited concurrency. | 🟡 Planned |
| CV-008.DS-002-US-1 | Operate More Independent Journey Turns | User Story | Navigator can start the approved number of turns in distinct Journeys, navigate among their owner-specific states and receive a recoverable refusal only when the bound is reached. | 🟡 Planned |
| CV-008.DS-002-TS-3 | Preserve Authority Under Expanded Concurrency | Technical Story | Events, Steering, cancellation, provider failure, settlement, persistence and restart recovery remain bound to the exact Journey and run under expanded capacity. | 🟡 Planned |

## Acceptance Direction

The Navigator can start the approved number of turns in distinct Journeys, continue navigating among them and observe each settle independently. Capacity overflow is explicit and recoverable. Events, comments, tool evidence, cancellation and persisted outcomes never cross Journey or run authority.

## Open Questions

- What measured capacity should be supported on the current macOS alpha hardware range?
- Should excess turns queue, refuse immediately or use a configurable policy?
- Which limits belong to the app, provider, model or host resource budget?
- How does Steering affect capacity and fairness while a run remains occupied?

## Boundary

This story does not promise unlimited parallelism, concurrent turns inside the same conversation, background execution without explicit send, or weaker isolation to gain throughput. Child stories follow measured characterization after this Delivery Story is pulled.
