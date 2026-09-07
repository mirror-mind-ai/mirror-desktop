[< Parent](../index.md)

# CV-005.DS-003.US-2 - Operate My First Alpha Journey

**Status:** ✅ Done
**Type:** User Story

## User Story

As an authorized alpha tester with my own configured Mirror installation,
I want to verify, bind and operate one privately delivered bundle through restart,
So that I can prove the desktop is portable, usable with my state and preserves continuity without requiring source access.

## Outcome

The tester verifies the delivered checksum and architecture, explicitly binds their own runtime, imports their registry, completes one Pi and Mirror turn in a disposable Journey, restarts the app and observes the same continuity without sharing private content.

## Acceptance Behavior

```text
Given the privately delivered app matches its announced checksum and host architecture
And it has no valid runtime binding
Then only the three-field Connect your Mirror gate is available
When I select my Mirror root and home, enter my user, and continue
Then only my validated binding becomes process authority
And I choose and persist one model from the Pi-owned catalog
And the app automatically imports my registry without a fabricated Journey
When I complete one disposable Journey turn
And close and reopen the app
Then the completed generation and continuity remain available
And my evidence records statuses and identifiers only, never conversation content
```

## Scope

- First launch and explicit DS-002 binding.
- Required model selection from the validated Pi catalog before the Journey interface opens.
- App-owned automatic personal registry import after the required runtime binding gate.
- One disposable Journey and completed Pi/Mirror turn.
- Restart and continuity observation.
- Privacy-safe result evidence.

## Out Of Scope

- Supplying Mirror state or provider credentials.
- General onboarding or Mirror installation.
- Production Journey migration.
- Publishing prompts or responses as evidence.

## Validation

Internal rehearsal confirms the build route, and private handoff confirms that an authorized tester received a checksum-bound artifact with the bounded operating route. Returned external tester evidence on supported macOS may be recorded later as alpha feedback, but it is not a lifecycle gate for this story.
