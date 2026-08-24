# Plan — CV-002.DS-003.TS-2

## Objective

Implement stateful ordered Pi runtime projection from the TS-1 contract. Extend the Nautilus stream boundary with structured run-status and tool-operation lifecycle events carrying toolCallId, name, arguments, output and state. Parse Pi toolcall_end and tool_execution_start/update/end without emitting one diagnostic per toolcall_delta; upsert operations by toolCallId in stable execution order; keep text_delta exclusively in the assistant response; discard thinking events; replace the rotating runtime-history source of truth with one live status plus ordered inert operations; and settle all live behavior on completion, cancellation or failure. Add characterization/reducer/component tests using TS-1 event shapes. Do not implement context-window percentage, compaction policy, conversation continuity, Mirror mode routing, unrelated Pi features, or direct Pi class integration.

## Scope

- Deliver CV-002.DS-003.TS-2 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for CV-002.DS-003.TS-2
When the Navigator exercises CV-002.DS-003.TS-2
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `CV-002.DS-003.TS-2`.
- Use uv run for Python commands and tests.
- Do not use git add .; commit only story-scoped files.
- Use descriptive English commit messages explaining why.

## Stop Conditions

- scope_change_detected
- plan_rule_conflict
- failing_required_check_without_clear_fix
- navigator_decision_needed

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until Navigator approval.
