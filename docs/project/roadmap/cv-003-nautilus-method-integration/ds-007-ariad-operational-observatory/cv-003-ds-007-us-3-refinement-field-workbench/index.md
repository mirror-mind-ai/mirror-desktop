[< Parent](../index.md)

# CV-003.DS-007.US-3 - Refinement Field Workbench

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As a Navigator observing refinement work,
I want to inspect Refinement Stories and Change Requests as a focused workbench,
So that I can understand active friction, evidence and next safe refinement movement without treating it as roadmap delivery.

## Outcome

The Refinement field renders active and historical Refinement Stories and Change Requests with focus, status, driver and delivery metadata when available, problem, expected behavior, evidence, outcome and read-only boundary.

## Acceptance Behavior

```text
Given a Journey has active Refinement Work
When I open the Refinement field
Then I see the active RS, active CR, last refinement event and next safe refinement movement
```

```text
Given I select a Change Request
When its detail renders
Then I see problem, expected behavior, evidence, status, driver, delivery and boundary without any edit or transition control
```

## Scope

- Render Refinement Stories and Change Requests in a workbench layout.
- Distinguish focused RS and focused CR from historical or terminal work.
- Show canonical driver and delivery metadata only when source data provides it.
- Show missing Refinement source as unavailable, not inferred.
- Preserve the distinction between friction care and Delivery commitment.

## Out Of Scope

- Capturing, selecting, planning, validating, parking, rejecting, promoting or closing Refinement Work from this view.
- Inferring driver or delivery from Git state.
- Editing Refinement documents.
- Using legacy SQLite when file-first Refinement exists.

## Validation

Navigator can open the Refinement field and explain which RS or CR is active, what evidence exists, what is still pending and why continuation must happen through Builder runtime rather than direct UI mutation.
