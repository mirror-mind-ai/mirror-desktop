[< Parent](../index.md)

# CV-002.DS-003.TS-2 — Ordered Runtime Projection

**Status:** ✅ Done
**Type:** Technical Story

---

## Outcome

Implement stateful ordered Pi runtime projection from the TS-1 contract. Extend the Nautilus stream boundary with structured run-status and tool-operation lifecycle events carrying toolCallId, name, arguments, output and state. Parse Pi toolcall_end and tool_execution_start/update/end without emitting one diagnostic per toolcall_delta; upsert operations by toolCallId in stable execution order; keep text_delta exclusively in the assistant response; discard thinking events; replace the rotating runtime-history source of truth with one live status plus ordered inert operations; and settle all live behavior on completion, cancellation or failure. Add characterization/reducer/component tests using TS-1 event shapes. Do not implement context-window percentage, compaction policy, conversation continuity, Mirror mode routing, unrelated Pi features, or direct Pi class integration.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Ordered Runtime Projection,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given a Pi/Mirror run that streams tool arguments, executes multiple tools and then returns assistant text
When Nautilus consumes the Pi JSON event stream
Then each toolCallId appears as one operation in execution order
And argument/output/status updates mutate that operation instead of appending diagnostic history
And text deltas appear only in the assistant response
And private thinking events never enter projection state
And Working activity stops on completion, cancellation or failure
And completed operations remain static and inert without a rotating history
```

## Scope

- Deliver CV-002.DS-003.TS-2 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not silently absorb adjacent roadmap work.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [TS-1 Minimal Event Contract](../cv-002-ds-003-ts-1-reference-run-and-minimal-event-contract/minimal-event-contract.md)
