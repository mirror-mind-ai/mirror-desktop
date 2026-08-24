# Plan — DS-006.US-2

## Objective

Implement Search Journeys for the registry-derived sidebar. Add a controlled search input in the sidebar that searches across all nodes of fixtureJourneyRegistry using flattened registry data, matching Journey name, description, id, and breadcrumb text. When the query is empty, keep the current sidebar derivation from JourneyPreferences: pinned/active/recent/fallback visibility rules. When the query is non-empty, show search results from the full hierarchy with breadcrumb context, preserve visual selection for the active Journey when it appears, allow clicking a result to select that Journey and clear or retain search according to the simplest usable behavior, and do not reorder the baseline sidebar just because a Journey is clicked. Keep pin UI, sort UI, Mirror import, workspace scanning, and Journey mutation out of scope. Search must be local, deterministic, case-insensitive, non-mutating, and must not invoke Pi/Mirror automatically.

## Scope

- Deliver DS-006.US-2 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.US-2
When the Navigator exercises DS-006.US-2
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `DS-006.US-2`.
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
