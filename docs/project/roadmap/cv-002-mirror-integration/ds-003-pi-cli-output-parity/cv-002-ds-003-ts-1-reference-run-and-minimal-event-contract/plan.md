# Plan — CV-002.DS-003.TS-1

## Objective

Produce an evidence-based minimal Pi/Mirror event projection contract before further UI work: select representative prompts, capture the visible Pi/Mirror CLI sequence and corresponding --mode json JSONL, compare them with Nautilus ingestion/rendering, classify each gap as mapping, transport limitation, or context concern, and document the smallest next implementation slice. Do not change application code or UI in this story.

## Scope

- Deliver CV-002.DS-003.TS-1 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for CV-002.DS-003.TS-1
When the Navigator exercises CV-002.DS-003.TS-1
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `CV-002.DS-003.TS-1`.
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
