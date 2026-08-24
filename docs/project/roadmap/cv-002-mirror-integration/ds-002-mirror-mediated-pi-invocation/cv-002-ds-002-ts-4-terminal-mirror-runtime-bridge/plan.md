# Plan — CV-002.DS-002.TS-4

## Objective

Implement CV-002.DS-002.TS-4 by first characterizing the real terminal Mirror runtime path, then changing Harness Mirror-mediated invocation to use that same path or honestly relabeling any remaining non-parity. Inspect Pi/Mirror terminal behavior and local Mirror integration hooks: how Pi activates Mirror skills/context, which command/env/session ids are used, how Journey context is resolved, and how stdout surfaces are emitted. Replace the current Harness-authored createPiInvocationPrompt path for Mirror mode with a terminal-equivalent bridge: pass the user's natural message to the same Mirror runtime/skill entrypoint used from terminal, set the active Journey/session context, run from the Mirror runtime root, preserve stdout/stderr streaming and cancellation, and allow Mirror to own prompt assembly, language, persona/routing and Ariad surfaces. Keep raw local Pi mode as explicit fallback/debug path using the old Harness prompt. Update provider labels so Mirror runtime mode is distinct from Mirror-logged fallback. Remove or narrow duplicate manual logging if the Mirror runtime already logs; avoid double-writing conversations. Add characterization tests for command construction, mode labels, active Journey/session propagation, no Harness prompt injection in Mirror runtime mode, fallback raw prompt still available, and no auto-run/secret persistence. Validate with npm test, npm run build, cd src-tauri && cargo check, plus a Navigator comparison route: ask the same pt-BR question in Pi terminal with Mirror active and in Harness Mirror runtime mode for the same Journey, compare routing/voice/language/surfaces, confirm Mirror records exactly one Harness runtime conversation, and confirm cancellation remains bounded.

## Scope

- Deliver Terminal Mirror Runtime Bridge as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Non-Goals

- Do not implement sibling roadmap item: Mirror Runtime Invocation Boundary.
- Do not implement sibling roadmap item: Mirror Conversation Logging Bridge.
- Do not implement sibling roadmap item: Mirror-mediated Invocation Guardrails.
- Do not implement sibling roadmap item: Mirror-mediated Invocation Model.
- Do not implement sibling roadmap item: Mirror-mediated Pi Invocation.

## Acceptance Behavior

```text
Given the starting state needed for Terminal Mirror Runtime Bridge
When the Navigator exercises Terminal Mirror Runtime Bridge
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Validation Route

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

E2E decision: required unless Navigator explicitly accepts a narrower fixture-level validation route

## Implementation Contract

- Use TDD or characterization tests for behavior changes when testable.
- Keep changes scoped to `CV-002.DS-002.TS-4`.
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
