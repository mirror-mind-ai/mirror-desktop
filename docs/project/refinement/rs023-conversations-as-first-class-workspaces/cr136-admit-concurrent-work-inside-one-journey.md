[< RS023](index.md)

# CR136: Admit Concurrent Work Inside One Journey

**Status:** captured
**Driver:** —
**Delivery:** —

**Gate:** not started before CR133, CR134 and CR135 are in the field.

## Friction

When a conversation is working, the Navigator cannot send work to the Journey that owns it. Distinct workspaces are treated as one busy owner.

This is not a presentation defect. Three layers serialize work by Journey, deliberately:

- `register` quarantines a second run for the same Journey as `serial_capacity_rejected` (`journeyRuntimeState.ts:104`–`:107`);
- the occupancy filter refuses on `entry.authority.journeyId === journeyId`, returning `same_journey_occupied` (`piInvocationOccupancy.ts:289`–`:291`);
- **the native registry's `entries` map is keyed by `journey_id`** inside `reserve` (`pi_process_registry.rs:263`–`:292`), with capacity accounting and `retire_finalizing_journey` attached to that key.

A trap to avoid re-entering: `PiInvocationAuthorityInspection` carries `threadId`, `generation`, `piSessionId` and `mirrorConversationId`, which makes it look as though native authority were already per-workspace. The authority *inspection* carries workspace coordinates; the registry *index* is the Journey.

## Outcome

Work in a Journey workspace can be admitted while a conversation inside it works, where native process capacity and exact authority permit it. Where they do not, the refusal names its real constraint instead of a generic global busy state.

## First Investigation

This CR changes authority, so it characterises before it changes anything.

1. Establish whether two Pi sessions in one Journey can run concurrently at all: process capacity, provider limits, and whether `JourneyProvisioningLease` (per `journey_id`) or `JourneyProjectionPersistenceState.stripe(journey_id, generation)` serialize anything that two conversations would contend for. Two conversations may or may not differ in generation; that is a fact to establish, not assume.
2. Determine the correct key. `RunTarget` already pairs `journey_id` with `run_id`; establish whether the registry key becomes the run, the thread, the conversation or the generation, and what each choice means for capacity accounting and for retiring a finalizing entry.
3. Enumerate every invariant that currently depends on one run per Journey and decide its fate explicitly: `hasActiveNativeExecution`, `derivePiInvocationAdmission`, `isActivePiInvocationLease`, the CR115 and CR116 post-terminal recovery guard, CR132's settlement abandonment offer, and the `serial_capacity_rejected` quarantine. Each must be re-validated, not assumed to survive.
4. Establish what the turn journal, outbox, settlement and segment projections do when two settlements in one Journey overlap, and whether any durable artifact is keyed per Journey in a way that would make two concurrent turns collide.
5. Decide whether the honest answer is partial: for example admitting the Journey workspace alongside one conversation, but not arbitrary conversation pairs.

If this investigation shows the work to be Story-sized, this CR is promoted in turn.

## Acceptance

- Work in a Journey workspace is admitted while a child conversation works, wherever native admission and exact authority permit it.
- A genuine shared constraint names itself precisely — capacity, same workspace, generation or process authority — rather than a generic global busy state.
- Every invariant listed in investigation item 3 is re-validated with guard-level tests, and none of CR115, CR116 or CR132's behaviour regresses.
- No durable artifact is corrupted or interleaved by two concurrent turns in one Journey; the settlement model's guarantees hold per turn.
- Where concurrency is refused, the refusal is visible and explained on the surface rather than silent — this CR must not widen the gap CR132 named.
- If concurrency proves unsafe, that conclusion is recorded with its evidence and the refusal is made legible instead.

## Boundaries

No fabricated concurrency: distinct visual workspaces may run together only where native process capacity and exact Journey, thread and generation authority admit them. No change to transcript authority or Mirror Core. The Rust registry and the TypeScript reducer change together or neither changes. Capacity limits remain the Navigator's configured limits and are not raised to manufacture parallelism.
