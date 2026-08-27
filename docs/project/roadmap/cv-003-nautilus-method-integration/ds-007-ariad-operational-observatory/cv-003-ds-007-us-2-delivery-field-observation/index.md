[< Parent](../index.md)

# CV-003.DS-007.US-2 - Delivery Field Observation

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As a Navigator observing Ariad Delivery work,
I want to inspect the roadmap field and selected Delivery matter,
So that I can understand construction commitment, active position and allowed movement without editing the roadmap.

## Outcome

The Delivery field renders Capability Values, Delivery Stories and implementable child stories as a read-only structure with status, active item highlighting, selected matter details, source artifact links and allowed runtime movement labels.

## Acceptance Behavior

```text
Given the Ariad Home is open
When I select Delivery
Then I see the roadmap hierarchy with current status and active item highlighting
```

```text
Given a Delivery item is selected
When Selected Matter renders
Then I see its code, title, type, status, outcome, source artifact, evidence summary and allowed movement as read-only information
```

## Scope

- Render CV, DS, User Story and Technical Story hierarchy from authored roadmap artifacts.
- Highlight active item and pending checkpoint when available.
- Show selected Delivery item details and source artifact links.
- Represent allowed actions as explanatory labels, not executable buttons.
- Preserve Expand-compatible authored roadmap table assumptions.

## Out Of Scope

- Editing roadmap Markdown.
- Pulling, planning, approving, validating or closing items from the view.
- Replacing Ariad runtime pull-candidates surfaces.
- Changing roadmap status.

## Validation

Navigator can inspect Delivery from the Ariad observatory and identify what is active, what is planned or done, what source file owns the selected item and what movement Ariad would allow outside the read-only view.
