# Plan — CV-002.DS-002.TS-5

## Objective

Implement CV-002.DS-002.TS-5 by projecting live Mirror runtime activity in Nautilus while preserving the final chat answer. Characterize current event flow: Tauri emits started/stdout/stderr/error/cancelled/done, piProcessStream maps stdout to raw_output and App accumulates rawLiveOutput until normalization. Add a live activity model in the app that records observable process events during a run: started diagnostics, stderr warnings, stdout chunks or parsed lines, truncation/log notices, skill/command-looking lines, and Ariad/Mirror surface blocks when present. Render this activity above or within the assistant message using safe React components, reusing ImportedActivity/LinkifiedText/conversationPresentation helpers where practical. Visually separate runtime activity from final answer, with collapsible or clearly bounded sections, and keep it inert: no executable buttons, no dangerouslySetInnerHTML, no chain-of-thought invented by Harness. Preserve existing final response normalization and imported historical activity rendering. Add tests for mapping/classifying live runtime activity, rendering Mirror/Ariad surface blocks and command/log-like lines inertly, and ensuring final answer remains present. Validate with npm test, npm run build, cd src-tauri && cargo check, plus Navigator comparison: run a Mirror prompt that emits skill loading/command output/surfaces in terminal and Harness; confirm Harness shows the observable activity stream before/alongside the final answer and nothing is executable.

## Scope

- Deliver Mirror Runtime Activity Stream Rendering as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not implement sibling roadmap item: Mirror Runtime Invocation Boundary.
- Do not implement sibling roadmap item: Mirror Conversation Logging Bridge.
- Do not implement sibling roadmap item: Mirror-mediated Invocation Guardrails.
- Do not implement sibling roadmap item: Terminal Mirror Runtime Bridge.
- Do not implement sibling roadmap item: Mirror-mediated Invocation Model.
- Do not implement sibling roadmap item: Mirror-mediated Pi Invocation.

## Acceptance Behavior

```text
Given the starting state needed for Mirror Runtime Activity Stream Rendering
When the Navigator exercises Mirror Runtime Activity Stream Rendering
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `CV-002.DS-002.TS-5`.
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
