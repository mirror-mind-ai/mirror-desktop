[< Story](index.md)

# Delivery Story Plan — DS-012 Durable Turn Lifecycle

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story
**Plan state:** pending Navigator approval

## Objective

Replace distributed lifecycle inference with a Harness-owned durable turn journal, restore reliable serial messaging first, then restore DS-009 capacity two as composition of independent journal-owned turns.

## Mandatory Execution Order

1. `DS-012.TS-1 — Canonical Turn Journal and Transition Contract`
2. `DS-012.TS-2 — Durable Native Terminal Adoption`
3. `DS-012.US-1 — Reliable Sequential Turn Settlement`
4. `DS-012.US-2 — Deterministic Turn Recovery After Restart`
5. `DS-012.TS-3 — Retire Distributed Lifecycle Authority`
6. `DS-012.US-3 — Restore Bounded Concurrent Journey Turns`

Capacity remains one through TS-3. Capacity two returns only in US-3 after the serial and recovery acceptance gates pass.

## Scope

### Canonical durable record

Introduce a versioned, bounded Harness turn journal under channel-specific application data. Each record owns one immutable exact run authority and separates these dimensions:

- monotonic execution phase;
- terminal outcome;
- cancellation intent;
- local projection checkpoint;
- Mirror outbox and acknowledgement checkpoints;
- recovery disposition;
- idempotency receipts for every side effect.

The journal transition boundary validates expected current phase, exact authority, generation, run and idempotency key under one native per-Journey serialization boundary. Duplicate exact transitions converge. Divergent reuse, stale authority and out-of-order future transitions reject without mutation.

Terminal records and active records must remain bounded through an explicit retention policy authored in TS-1. No eviction may remove the only recovery evidence for a non-terminal turn.

### Responsibility boundaries

React may request admission, cancellation and retry, and render a journal projection. It may not infer terminal state from stream completion, selected Journey, route presence, local runtime flags or lease snapshots.

The central dispatcher validates and transports exact-authority events. It may maintain bounded transport diagnostics, but its route lifecycle cannot decide durable turn lifecycle.

The native process registry reserves and controls exact child ownership under the configured capacity. Registry inspection is operational evidence consumed by the coordinator, not a second canonical state machine.

The dedicated local conversation remains the visible Harness projection. Projection writes are idempotent side effects checkpointed by the journal. Authority-free lifecycle saves may not bypass journal state or regress committed evidence.

The bounded Mirror append outbox remains the durable external-delivery adapter. Enqueue, append, receipt projection and acknowledgement continue to use exact generation-owned IDs, but the journal records which checkpoint belongs to the turn.

### Terminal durability frontier

Native execution must durably adopt bounded final output and exact terminal authority before emitting the lifecycle-closing `done` consequence, retiring observation or authorizing Journey lease release. Streaming remains presentation evidence; the durable terminal payload becomes recovery evidence.

If the frontend disappears after Pi completes, cold-start recovery reads the exact journal terminal evidence and resumes projection/outbox settlement. It does not reconstruct destination, message identity or authority from Pi JSONL.

Cancellation, process death, spawn failure and completion races must each produce one immutable terminal outcome according to an explicit phase rule. Events arriving after a durable terminal outcome are bounded audit evidence and cannot mutate the outcome.

### Incremental migration

TS-1 introduces the journal in shadow mode at capacity one and compares journal-derived state with the existing path without controlling admission or settlement. Divergence fails DEV validation and becomes design evidence; it does not silently select one state.

TS-2 moves terminal adoption behind the durable frontier while preserving existing user-visible streaming.

US-1 moves admission, local projection, outbox enqueue and successor-send eligibility to journal checkpoints. This is the earliest usable serial cutover.

US-2 makes startup recovery journal-driven for each supported non-terminal frontier.

TS-3 removes or demotes React reconciliation effects, dispatcher route tombstones and retained-lease/projection heuristics that currently act as lifecycle authorities. Compatibility adapters may remain only when their source is the journal.

US-3 restores the single internal capacity constant from one to exactly two and proves DS-009 sibling isolation without introducing a parallel implementation path.

## Non-Goals

- Replacing Mirror's generic explicit conversation append primitive.
- Reconstructing messages or authority from Pi JSONL.
- Redesigning dedicated Journey generations, Pi compaction or provider configuration.
- Supporting more than two concurrent executions, arbitrary capacity environment overrides, remote coordination or multiple users.
- Reworking Journey navigation, sidebar personalization, Artifacts or Nautilus altitude semantics.
- Maintaining distributed lifecycle inference as a permanent fallback.
- Running screenshot-driven desktop E2E after every child story.
- Promoting stable, pushing, releasing or deploying as part of plan approval.

## Acceptance Behavior

```text
Given a Journey completes one turn
When the Navigator immediately submits a successor turn
Then the successor is admitted from the prior turn's durable settled checkpoint
And no stale route, lease snapshot or React effect can block or resurrect the prior authority.
```

```text
Given Pi has produced exact terminal output
When the frontend disappears before local projection or Mirror enqueue
Then terminal authority and bounded output already exist durably
And restart resumes the same turn from terminal adoption
And no destination or message identity is reconstructed from Pi JSONL.
```

```text
Given any lifecycle transition is repeated
When authority and idempotency receipt match
Then the transition converges without duplicate projection, outbox item, Mirror append or lease release.
```

```text
Given a stale, divergent or out-of-order transition arrives
When its exact expected phase, run, Journey or generation does not match
Then it cannot mutate the journal, local conversation, outbox, registry or sibling Journey.
```

```text
Given serial cutover and restart recovery are accepted at capacity one
When capacity returns to two
Then two different Journeys execute and settle independently through the same coordinator
And cancellation, failure, restart or late events in one cannot alter the other.
```

## Test Strategy

Behavior changes use TDD. Pure transition tests and native fault-injection tests carry most lifecycle confidence. Existing DS-009 authority, persistence, cancellation, shutdown and interleaving suites remain characterization gates.

Each child runs only the focused tests for its changed boundary during development. Full frontend and Rust suites plus production builds run at child completion or aggregate checkpoints, not after every edit.

Desktop E2E smoke is deliberately sparse because it occupies the Navigator's computer. No Technical Story requires desktop E2E by default. One scheduled DEV smoke window follows US-2 and validates serial successor sends plus restart recovery together. One scheduled final DEV smoke follows US-3 and validates capacity-two isolation. Screenshots and automated screen interaction are used only when durable files, logs, native inspection and deterministic tests cannot establish the required observation. Before either session, the Driver states the scenarios, estimated duration and whether the screen will be occupied.

The complete route is defined in `test-guide.md`.

## Validation Route

Navigator Validation occurs once at Delivery Story level. Child stories remain traceable Driver work packages and evidence units.

The aggregate route requires automated transition, native registry, persistence, outbox, restart and concurrency checks; successful stable and development builds; two batched DEV desktop smoke sessions at the declared milestones; and an explicit Navigator acceptance after reviewing the final evidence.

Production data, production Mirror coordinates and the installed stable app are excluded from validation. Any stable promotion is a later independent gate.

## Implementation Contract

- Use the handoff documents under `docs/project/explorations/durable-turn-lifecycle/` as design evidence, not runtime authority.
- Keep `RunAuthority`, directed native operations, Journey-keyed state and per-Journey persistence isolation intact.
- Keep capacity one until US-3.
- Do not cross from shadow comparison to controlling authority on unexplained divergence.
- Do not release a Journey lease without the exact durable checkpoint required by the active child contract.
- Do not accumulate compatibility paths after TS-3.
- Stop on scope expansion, journal contract ambiguity, failing checks, data-loss risk or need for a Mirror runtime change.
- Plan approval authorizes local implementation only. Commit, push, release, production promotion and Navigator Validation remain separate boundaries.

## Checkpoint

Implementation must not start until the Navigator approves this Delivery Story plan.
