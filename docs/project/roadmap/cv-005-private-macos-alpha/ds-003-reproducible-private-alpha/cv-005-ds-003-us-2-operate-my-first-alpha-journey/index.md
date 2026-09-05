[< Parent](../index.md)

# CV-005.DS-003.US-2 - Operate My First Alpha Journey

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As an authorized alpha collaborator with my own configured Mirror installation,
I want to bind and operate one disposable Journey through restart,
So that I can prove the source-built desktop is usable with my state and preserves continuity.

## Outcome

The collaborator explicitly binds their own runtime, imports their registry, completes one Pi and Mirror turn in a disposable Journey, restarts the app and observes the same continuity without sharing private content.

## Acceptance Behavior

```text
Given my source-built app opens Unbound
When I select my Mirror root and home, enter my user, validate and save
Then only my binding becomes process authority
When I import my registry and complete one disposable Journey turn
And close and reopen the app
Then the completed generation and continuity remain available
And my evidence records statuses and identifiers only, never conversation content
```

## Scope

- First launch and explicit DS-002 binding.
- Personal registry import.
- One disposable Journey and completed Pi/Mirror turn.
- Restart and continuity observation.
- Privacy-safe result evidence.

## Out Of Scope

- Supplying Mirror state or provider credentials.
- General onboarding or Mirror installation.
- Production Journey migration.
- Publishing prompts or responses as evidence.

## Validation

Internal rehearsal confirms the route, but Done requires an authorized external collaborator to repeat it on their own Mac and return the bounded evidence template.
