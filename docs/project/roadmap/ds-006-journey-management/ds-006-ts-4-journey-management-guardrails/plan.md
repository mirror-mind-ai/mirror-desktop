# Plan — DS-006.TS-4

## Objective

Implement DS-006.TS-4 as a guardrail audit and hardening pass for Journey Management. Document and test the final boundary contract: app startup and Journey selection never auto-import Mirror or invoke Pi; registry, preferences, and conversations are separate local Harness files; preferences contain only non-secret UI state; imported activity is historical/inert and never executable; local reference opening is constrained to allowed roots and rejects URLs/null bytes/outside paths; Mirror registry/conversation import and selected-conversation reload are explicit and do not continuously sync; selected reload affects only the active Journey canonical file after backup; one canonical local conversation file exists per Journey; Mirror DB reads are read-only except the explicit generated-title action, which is user-triggered, conversation-scoped, and uses Mirror's own title service; generated-title double-clicks are guarded; provider settings remain separate and do not persist secrets. Prefer characterization tests for persistence shapes, importer flags/listing/materialization behavior, generated-title command boundaries, open_local_reference path rejection/allowance where practical, and UI/menu guardrails where existing test harness supports it. Add a concise guardrails section to DS-006 docs. Run npm test, npm run build, cd src-tauri && cargo check, plus targeted script checks for list conversations, selected materialization, and generated-title dry route where safe. No new product features; only boundary hardening, tests, and documentation.

## Scope

- Deliver Journey Management Guardrails as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not silently absorb adjacent roadmap work.

## Acceptance Behavior

```text
Given the starting state needed for Journey Management Guardrails
When the Navigator exercises Journey Management Guardrails
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `DS-006.TS-4`.
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
