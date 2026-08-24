[< Parent](../index.md)

# CV-002.DS-002.TS-4 — Terminal Mirror Runtime Bridge

**Status:** ✅ Done
**Type:** Technical Story

---

## Outcome

Implement CV-002.DS-002.TS-4 by first characterizing the real terminal Mirror runtime path, then changing Harness Mirror-mediated invocation to use that same path or honestly relabeling any remaining non-parity. Inspect Pi/Mirror terminal behavior and local Mirror integration hooks: how Pi activates Mirror skills/context, which command/env/session ids are used, how Journey context is resolved, and how stdout surfaces are emitted. Replace the current Harness-authored createPiInvocationPrompt path for Mirror mode with a terminal-equivalent bridge: pass the user's natural message to the same Mirror runtime/skill entrypoint used from terminal, set the active Journey/session context, run from the Mirror runtime root, preserve stdout/stderr streaming and cancellation, and allow Mirror to own prompt assembly, language, persona/routing and Ariad surfaces. Keep raw local Pi mode as explicit fallback/debug path using the old Harness prompt. Update provider labels so Mirror runtime mode is distinct from Mirror-logged fallback. Remove or narrow duplicate manual logging if the Mirror runtime already logs; avoid double-writing conversations. Add characterization tests for command construction, mode labels, active Journey/session propagation, no Harness prompt injection in Mirror runtime mode, fallback raw prompt still available, and no auto-run/secret persistence. Validate with npm test, npm run build, cd src-tauri && cargo check, plus a Navigator comparison route: ask the same pt-BR question in Pi terminal with Mirror active and in Harness Mirror runtime mode for the same Journey, compare routing/voice/language/surfaces, confirm Mirror records exactly one Harness runtime conversation, and confirm cancellation remains bounded.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Terminal Mirror Runtime Bridge,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given the starting state needed for Terminal Mirror Runtime Bridge
When the Navigator exercises Terminal Mirror Runtime Bridge
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Terminal Mirror Runtime Bridge as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not implement sibling roadmap item: Mirror Runtime Invocation Boundary.
- Do not implement sibling roadmap item: Mirror Conversation Logging Bridge.
- Do not implement sibling roadmap item: Mirror-mediated Invocation Guardrails.
- Do not implement sibling roadmap item: Mirror-mediated Invocation Model.
- Do not implement sibling roadmap item: Mirror-mediated Pi Invocation.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
