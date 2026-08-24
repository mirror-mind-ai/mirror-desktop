# Plan — DS-006.US-4

## Objective

Implement DS-006.US-4 by adding runtime-only Journey list ordering controls to the sidebar. Add a compact order selector below the search input with three modes: Recent, A-Z, and Tree. Recent keeps the current cockpit behavior: active Journey always visible, recents updated only on meaningful movement such as sending a message, and selection alone does not reorder. A-Z shows all registry Journeys sorted alphabetically by display name while preserving breadcrumb context in subtitles. Tree shows all registry Journeys in hierarchical/breadcrumb order with depth-aware visual context using existing breadcrumb/depth data, without replacing the registry source with a flattened model. Search remains across the full registry and should apply the selected order to results where sensible; clicking search results clears search and changes active Journey without invoking Pi or mutating Mirror/workspace. Ordering is session/runtime-only; do not persist sort order in this story, because persistence belongs to DS-006.TS-3. Do not implement pins in this story; pinning belongs to DS-006.US-5. Add domain tests for ordering behavior, active Journey visibility in Recent, A-Z full-list ordering, Tree hierarchy ordering, and search interaction. Validate with npm test, npm run build, cargo check, plus visual Navigator checks switching Recent/A-Z/Tree over the imported real Journey registry.

## Scope

- Deliver DS-006.US-4 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.US-4
When the Navigator exercises DS-006.US-4
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `DS-006.US-4`.
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
