[< RS020](index.md)

# CR067: Unify Recovery into One Idempotent Convergence Routine

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Five overlapping repair entry points exist: live-run finalization error handling, the manual repair action, automatic hydration repair, zero-outbox post-terminal recovery (CR062) and legacy timestamp-compatibility repair (CR061). Each grew for one incident; together they form new synchronization surface, and their interleaving is untested.

The pipeline is idempotent end to end: Pi JSONL is immutable, message IDs are append identity, re-append is harmless. This property supports replacing choreographed repairs with convergence: compare desired state (settled turns in Pi JSONL and the journal) with observed state (Mirror messages, outbox, projection files) and converge the difference.

## Expected Behavior

One convergence routine per Journey, owned by the CR066 coordinator, invoked identically from hydration, the manual repair action and post-terminal completion. Given known-inactive occupancy it inspects durable evidence, reconstructs any missing frontier exactly (projection, outbox, append, acknowledgement, settlement), publishes atomically and stops. Running it on a synchronized Journey is a no-op. Running it twice concurrently is impossible by serialization. The four superseded repair paths are deleted; CR061 legacy-timestamp normalization survives as a bounded step inside the routine, not a separate path.

## Acceptance Horizon

- CR064 fault-injection scenarios (append failure, acknowledgement failure, missing outbox, stale projection, delayed older-run convergence) all recover through the single routine.
- No-op proof: converging a settled Journey performs zero writes.
- The deleted paths have no remaining callers or dead exports.
- Unknown occupancy and active execution remain fail-closed for convergence.

## Boundaries

Model-free, exact, generation-scoped, serialized. No provider retry or substitution. No Mirror Core change.
