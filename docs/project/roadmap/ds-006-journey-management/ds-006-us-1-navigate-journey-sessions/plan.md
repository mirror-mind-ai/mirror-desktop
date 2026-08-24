# Plan — DS-006.US-1

## Objective

Implement Navigate Journey Sessions using the hierarchical Journey Registry model. Replace the hardcoded sidebar journey array with sidebar items derived from fixtureJourneyRegistry and JourneyPreferences. Allow selecting a visible Journey to update activeJourneyId, update header/sidebar context from registry metadata and breadcrumbs, load that Journey's persisted conversation, and save future conversation changes under that Journey id. Keep pinned/search/sort UI out of scope, but preserve active Journey visibility even when not pinned and use fallback roots when needed. Do not import from Mirror CLI/database, scan workspace roots, mutate Journey files, invoke Pi automatically, or introduce multiple conversations per Journey.

## Scope

- Deliver DS-006.US-1 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.US-1
When the Navigator exercises DS-006.US-1
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `DS-006.US-1`.
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
