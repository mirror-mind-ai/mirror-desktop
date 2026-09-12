[< CV-008](../index.md)

# CV-008.DS-001 - Steering During Active Turns

**Status:** 🟡 Planned

## Outcome

While one exact Mirror Desktop turn is still running, the Navigator can submit an additional message that Pi accepts as steering for that turn, allowing course correction without cancellation and silent restart.

## Why This Matters

Long agent operations expose new information and sometimes begin from an imperfect direction. Waiting for completion wastes time, while cancel-and-retry discards useful progress and falsifies what happened. Steering should make correction part of the visible turn lifecycle.

## Candidate Scope

- Characterize Pi's native Steering behavior and transport contract before designing the desktop projection.
- Bind every steering message to exact Journey, conversation, generation, run and turn authority.
- Show whether a steering message is pending, accepted, applied, rejected or terminally unconsumed.
- Preserve deterministic ordering when more than one steering message is submitted.
- Persist enough evidence for restart and settlement to remain honest.
- Keep composer and runtime feedback usable while the original turn continues.

## Acceptance Direction

A Navigator starts a long-running turn, submits a corrective message while it is active, observes explicit acceptance and receives a final answer shaped by the steering message. Wrong-run, stale-turn, settled-turn and unsupported-provider attempts fail closed without cancelling, duplicating or retargeting work.

## Open Questions

- Does Pi accept queued messages at defined tool boundaries or at any stream boundary?
- Can more than one steering message be pending, and what ordering guarantee exists?
- What durable evidence proves acceptance versus actual consumption?
- How should steering interact with cancellation, provider failure, compaction and app restart?

## Boundary

This story does not emulate Steering by terminating and replaying a turn, create a second assistant turn, let one Journey steer another, or infer consumption from final prose. Child User and Technical Stories are authored only after this Delivery Story is pulled and the Pi contract is inspected.
