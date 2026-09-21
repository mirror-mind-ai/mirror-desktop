[< RS020](index.md)

# CR066: Extract a Serialized Turn Finalization Coordinator from the Renderer

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

`App.tsx` executes the post-terminal transaction (projection → outbox → append → acknowledgement → settlement → publication) inside a React component, using refs to escape stale closures and competing effects as scheduling. Render timing is part of the persistence protocol. Publication updates base state and the runtime snapshot through different code at different times, which produced the CR063 recurrence: automatic repair updated base state while the runtime snapshot kept presenting a pre-repair replica.

## Expected Behavior

A renderer-independent module owns turn finalization:

- one queue per Journey, serialized, single writer;
- it consumes terminal evidence and executes the existing domain steps (reusing `executeCompletedSettlement`, journal, outbox and receipt code unchanged where possible);
- it publishes one atomic presentation state per Journey generation; base state and runtime snapshot stop existing as independently written replicas of the same conversation;
- committed never regresses to pending for the same exact turn (monotonic publication);
- late convergence for an older run publishes only into its exact generation and never touches a successor;
- React subscribes and renders; it does not orchestrate.

## Acceptance Horizon

- The full CR064 contract passes, including mid-sequence navigation and restart.
- The finalization code paths inside `App.tsx` are removed, not wrapped.
- CR063's grep-the-source tests are deleted together with the code they inspected.
- `App.tsx` no longer contains outbox, append, acknowledgement or settlement calls.
- All existing domain-level tests keep passing without weakened assertions.

## Boundaries

Refactor, not rewrite: durable schemas, domain modules and validation semantics are preserved. No provider or model route. No Mirror Core change.
