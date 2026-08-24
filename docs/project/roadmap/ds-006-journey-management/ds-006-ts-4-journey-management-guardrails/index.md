[< Parent](../index.md)

# DS-006.TS-4 — Journey Management Guardrails

**Status:** ✅ Done
**Type:** Technical Story

---

## Outcome

Implement DS-006.TS-4 as a guardrail audit and hardening pass for Journey Management. Document and test the final boundary contract: app startup and Journey selection never auto-import Mirror or invoke Pi; registry, preferences, and conversations are separate local Harness files; preferences contain only non-secret UI state; imported activity is historical/inert and never executable; local reference opening is constrained to allowed roots and rejects URLs/null bytes/outside paths; Mirror registry/conversation import and selected-conversation reload are explicit and do not continuously sync; selected reload affects only the active Journey canonical file after backup; one canonical local conversation file exists per Journey; Mirror DB reads are read-only except the explicit generated-title action, which is user-triggered, conversation-scoped, and uses Mirror's own title service; generated-title double-clicks are guarded; provider settings remain separate and do not persist secrets. Prefer characterization tests for persistence shapes, importer flags/listing/materialization behavior, generated-title command boundaries, open_local_reference path rejection/allowance where practical, and UI/menu guardrails where existing test harness supports it. Add a concise guardrails section to DS-006 docs. Run npm test, npm run build, cd src-tauri && cargo check, plus targeted script checks for list conversations, selected materialization, and generated-title dry route where safe. No new product features; only boundary hardening, tests, and documentation.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Journey Management Guardrails,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given the starting state needed for Journey Management Guardrails
When the Navigator exercises Journey Management Guardrails
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Journey Management Guardrails as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not silently absorb adjacent roadmap work.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
