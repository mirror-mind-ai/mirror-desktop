[< Parent](../index.md)

# CV-004.DS-002.US-1 — Start This Journey

**Status:** ✅ Done
**Type:** User Story

## User Story

As the Navigator,  
I want one explicit **Start this Journey** action when a Journey has no dedicated Nautilus thread,  
So that I can create its conversation intentionally and understand when it becomes ready.

## Outcome

The current not-started surface becomes actionable and shows model-free creation, activation, verification, failure and retry states without exposing a generic composer prematurely.

## Acceptance Behavior

```text
Given the selected Journey is absent
When its Operational Chat opens
Then one central Start this Journey action is visible
And the composer is not available
```

```text
Given the Navigator starts the Journey
When provisioning progresses
Then creation, activation and verification are visible
And repeated clicks cannot create duplicate operations
```

```text
Given provisioning fails
When the failure settles
Then a bounded recovery reason and retry action remain visible
And no partial state is presented as ready
```

```text
Given the Navigator switches Journeys during provisioning
When the original result arrives
Then it remains bound to the original Journey
And cannot redirect the selected Journey surface
```

## Scope

- Central start action on `JourneyThreadState`.
- Progress and bounded error/retry presentation.
- Per-Journey operation correlation and stale-result guard.
- Composer gating until verified ready.
- Continued access to Journey artifacts and published projections.

## Out Of Scope

- Conversation selector or legacy adoption.
- Cancellation that deletes uncertain native resources.
- Restart/generation history UI.
- Multi-Journey concurrent execution.

## Expected Areas

- `src/app/JourneyThreadState.tsx`
- `src/app/App.tsx`
- provisioning storage bridge
- component and race tests

## Validation

Navigator starts one absent Journey, observes all phases, exercises retry and Journey switching, and confirms no composer, duplicate or provider request appears before ready.
