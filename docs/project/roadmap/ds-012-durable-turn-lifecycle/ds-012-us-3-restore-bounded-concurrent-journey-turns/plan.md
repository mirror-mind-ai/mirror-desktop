[< Story](index.md)

# Implementation Plan — DS-012.US-3 Restore Bounded Concurrent Journey Turns

## Objective

Restore the single internal process-capacity constant from one to exactly two and prove that two different Journey journals compose independently through execution, terminal adoption, projection, outbox settlement, cancellation and restart.

## Preconditions

- TS-1 through TS-3 and US-1/US-2 are complete at capacity one.
- The revised `terminal_durable → restart → projection/outbox` DEV frontier passed.
- The journal is the sole lifecycle authority; registry occupancy remains exact live-execution evidence.
- Production, commit, push, release and stable promotion remain excluded.

## Work Packages

1. **Restore the fixed bound**
   - Change `PRODUCTION_PI_PROCESS_LIMIT` from one to exactly two.
   - Keep `MAX_BOUNDED_CHILD_CONTROLS` at two for shutdown compatibility.
   - Preserve validation rejection for zero and values greater than two.
   - Do not add an environment override.

2. **Prove independent journal composition**
   - Interleave Journey A and B admissions and transitions in independent journal files.
   - Prove A running while B reaches outbox durability/settlement.
   - Prove cancellation or failure in A cannot alter B bytes, phase, outcome or receipt.
   - Prove stale A authority cannot address B.

3. **Retain DS-009 execution isolation**
   - Run capacity-two registry, directed cancellation, stale callback, first-terminal, cleanup and bounded-shutdown tests.
   - Confirm exact `journeyId + runId` remains mandatory.
   - Confirm one Journey still admits at most one unsettled journal turn.

4. **Retain projection/outbox isolation**
   - Run Journey-keyed runtime, persistence coordinator, settlement, outbox and dispatcher characterization.
   - Confirm selected Journey remains presentation-only.
   - Confirm one Journey may settle while its sibling remains live.

5. **Validate the desktop boundary**
   - Run full frontend/native suites and builds first.
   - Build the DEV bundle.
   - Announce and run one final batched capacity-two DEV smoke using two isolated Journeys.
   - Verify simultaneous children, independent completion, exact projections/outbox ownership and zero residual DEV children/items.

## Invariants

- Capacity is exactly two, never configurable and never greater than two.
- Same-Journey duplicate execution still rejects atomically.
- Each journal remains per-Journey, bounded, idempotent and exact-authority owned.
- Cancellation, cleanup and terminal adoption cannot target a sibling.
- Mirror remains a generic explicit append destination.
- Stable and production remain untouched.

## Stop Conditions

Stop on journal cross-mutation, sibling projection/outbox mutation, capacity above two, unexplained route/lease resurrection, production identity, need for a Mirror change, or any failed deterministic isolation gate.
