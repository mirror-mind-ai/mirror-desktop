# Plan — DS-006.TS-1

## Objective

Plan DS-006.TS-1 as a Hierarchical Journey Registry Model. Define TypeScript domain types for a Mirror-sourced hierarchical registry with roots, children, parent references, status/stage/description metadata and a syncedAt/schemaVersion envelope. Keep Nautilus-local preferences separate from Mirror metadata: pinnedJourneyIds, active/lastActive journey and recents are local Harness state, not Mirror Journey fields. Implement pure helpers to validate unique journey ids, flatten the tree for search, derive breadcrumbs, find journeys by id, and derive sidebar items where pinned journeys are always visible and the active journey remains visible even when not pinned. Do not implement Mirror database/CLI import yet, do not scan workspace roots, do not mutate Journey files, and do not implement full search UI or pin UI in this TS. Use a fixture-backed registry so later stories can replace the source with explicit Mirror sync.

## Scope

- Deliver DS-006.TS-1 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.TS-1
When the Navigator exercises DS-006.TS-1
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `DS-006.TS-1`.
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
