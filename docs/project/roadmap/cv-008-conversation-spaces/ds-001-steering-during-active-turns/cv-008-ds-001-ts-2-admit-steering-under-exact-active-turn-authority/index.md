[< Parent](../index.md)

# CV-008.DS-001-TS-2 - Admit Steering Under Exact Active-Turn Authority

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to steer only the work the Navigator is viewing,
as the native invocation boundary,
I want correlated Steering admission under exact active-turn authority,
so that no message can leak into a stale, settled, replaced or cross-Journey process.

## Outcome

A Mirror-mediated run retains a bounded writable Pi RPC channel and accepts Steering only when Journey, thread, conversation, generation, run and turn match the registered live process.

## Acceptance Behavior

```text
Given an exact Mirror-mediated run is active
When a bounded correlated Steering request matches all authority coordinates
Then it is written once to that run's Pi RPC channel
And its response is correlated without holding the global registry lock

Given any authority coordinate is stale or divergent
When Steering admission is attempted
Then no process bytes are written
And the active run is neither cancelled nor retargeted
```

## Scope

- Process-per-run RPC launch and initial correlated prompt.
- Writable child-channel ownership separate from global registry locking.
- Bounded Steering request, sequence and response identity.
- Exact registry and durable turn-authority checks.
- Fail-closed malformed, duplicate, unknown and write-failure handling.

## Out Of Scope

- Composer presentation.
- Durable multi-message transcript reconciliation.
- Raw provider and user-configured non-Mirror process Steering.

## Validation

Rust concurrency and authority tests, TypeScript transport tests, focused process-stream integration tests and unchanged invocation-capacity behavior.
