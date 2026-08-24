# Plan — DS-006.TS-6

## Objective

Implement DS-006.TS-6 by turning Mirror import into materialization of canonical local Harness state. Replace the runtime mirror-bootstrap source with two local app-data sources: journey-registry.json and journey-conversations/<journey-id>.json. Update scripts/export_mirror_bootstrap.py, likely renaming behavior but not necessarily file name yet, so npm run import:mirror reads Mirror DB read-only and writes journey-registry.json plus one persisted Journey conversation file per imported Journey using the same persistedJourneyConversation schema already used by the Tauri app. Before overwriting an existing conversation file, copy it to a timestamped backup directory under app data, e.g. journey-conversations/backups/<timestamp>/<journey-id>.json. Add/adjust Tauri commands so the frontend can load the registry from app data and conversations from the existing local conversation files. Remove frontend loading of mirror-bootstrap.json and remove the imported-vs-persisted branch; selection should load only the local conversation for the selected Journey, creating the opening conversation only when no local conversation exists. Keep one conversation per Journey, no continuous sync, no Pi invocation, no Mirror mutation, no workspace mutation, and no secrets. Add tests or characterization coverage for local import materialization and backup behavior where practical, and validate by running import twice to confirm backup creation, then npm test, npm run build, and cargo check.

## Scope

- Deliver Materialize Mirror Import as Local Harness State as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not implement sibling roadmap item: Full Mirror Conversation Activity Import.
- Do not implement sibling roadmap item: Render Imported Conversations.

## Acceptance Behavior

```text
Given the starting state needed for Materialize Mirror Import as Local Harness State
When the Navigator exercises Materialize Mirror Import as Local Harness State
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `DS-006.TS-6`.
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
