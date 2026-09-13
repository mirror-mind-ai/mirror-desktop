[< Parent](../index.md)

# CV-008.DS-001-TS-1 - Characterize Native Pi Steering Semantics

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to build Steering without invented lifecycle semantics,
as the native process boundary,
I want an executable characterization of Pi's RPC Steering contract,
so that later child stories can rely on observed acceptance, queue, application and settlement boundaries.

## Outcome

The supported Pi runtime has a repeatable contract covering `prompt`, `steer`, response correlation, `queue_update`, one-at-a-time delivery, message events, `agent_end`, `agent_settled`, rejection and process closure.

## Acceptance Behavior

```text
Given the supported Pi runtime is available
When the Steering contract probe and focused tests run
Then they distinguish accepted, queued, applied and settled evidence
And document any behavior that Pi does not prove
And production behavior remains unchanged
```

## Scope

- LF-delimited JSONL framing and correlated command responses.
- Steering delivery after current assistant tool calls and before the next model call.
- FIFO and duplicate-text behavior under `one-at-a-time` mode.
- Queue, message, agent and settlement event semantics.
- Rejection and process-close behavior.

## Out Of Scope

- Production transport changes.
- Mirror Desktop composer or conversation UI.
- Persistence design beyond evidence requirements discovered by the probe.

## Validation

Focused parser and contract tests plus a bounded probe against the installed Pi runtime. Record exact Pi version and observations in the Delivery Story evidence.
