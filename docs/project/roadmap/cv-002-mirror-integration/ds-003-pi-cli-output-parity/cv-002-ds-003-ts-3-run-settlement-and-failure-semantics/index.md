[< Parent](../index.md)

# CV-002.DS-003.TS-3 — Run Settlement and Failure Semantics

**Status:** ✅ Done
**Type:** Technical Story

---

## Outcome

Define and verify one deterministic terminal-state contract across Pi process events, runtime projection, agent-run state, and visible UI: terminal precedence must preserve failure/cancellation against late completion; any preparing/running operation must settle when the run terminates; completed, cancelled, and failed outcomes must be visibly distinct even with no tool operations or assistant text; cancellation must tolerate the Rust Cancelled→Done sequence and duplicate local/stream cancellation; process spawn, stream, non-zero exit, and assistant-stream errors must settle without residual Working animation. Implement with TDD in the narrow existing stream/reducer/component boundaries, add event-sequence characterization and component tests for success/cancel/failure, validate live success and cancellation plus a deterministic failure route, and exclude conversation continuity, context-window/compaction, mode routing, unrelated Pi features, and direct Pi class integration.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Run Settlement and Failure Semantics,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given a live run that completes, is cancelled, or fails
When terminal and late Pi/process events arrive
Then the first terminal outcome remains authoritative
And no operation remains preparing or running
And no late event reopens or rewrites the settled projection
And Completed, Cancelled, or Failed is visible even without tool activity or assistant text
And only active runs contain live animation
And the assistant response remains separate from runtime outcome and operation output
```

## Scope

- Establish first-terminal-wins precedence across runtime projection and agent-run state.
- Settle unresolved operations on completion, cancellation, and failure.
- Make terminal outcomes visible and inert, including empty-output runs.
- Handle thrown provider errors and local cancellation success/failure deterministically.
- Characterize the Rust `Cancelled → Done` sequence without changing Rust unless evidence requires it.

## Out Of Scope

- Conversation/context continuity, compaction, Mirror mode routing, unrelated Pi features, direct Pi class integration, and historical imported activity.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
