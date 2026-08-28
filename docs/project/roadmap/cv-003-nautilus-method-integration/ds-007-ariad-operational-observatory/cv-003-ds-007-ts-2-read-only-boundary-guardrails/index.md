[< Parent](../index.md)

# CV-003.DS-007.TS-2 - Read-only Boundary Guardrails

**Status:** ✅ Done
**Type:** Technical Story

---

## Technical Story

In order to preserve Ariad authority and avoid accidental mutation,
As the Harness application,
I want guardrails around the Ariad observatory UI and data loading paths,
So that observation cannot silently become editing, lifecycle execution or inferred state repair.

## Outcome

The Ariad observatory has technical guardrails that prevent mutation controls, block unsafe source assumptions, display stale or unavailable data explicitly and keep all action labels explanatory until a separate mediated action story exists.

## Acceptance Behavior

```text
Given the Ariad observatory renders any field
When the user interacts with the view
Then no roadmap, runtime cursor, Refinement Work, Exploration Story, Mirror state or filesystem artifact is mutated
```

```text
Given source data is stale, missing or structurally unsupported
When the Ariad observatory renders
Then it shows a bounded unavailable or unsupported state and does not infer, repair or rewrite source data
```

## Scope

- Assert read-only UI behavior for Ariad observatory interactions.
- Ensure action affordances are labels or explanatory boundaries, not mutation controls.
- Handle missing, stale, unavailable and unsupported data states.
- Add regression tests for no mutation on render and selection.
- Keep error language Navigator-facing and source-specific.

## Out Of Scope

- Adding mediated action execution.
- Automatic source repair.
- Roadmap parsing beyond the contracts needed for this view.
- File watchers, locks, synchronization or background mutation.

## Validation

Automated tests and a desktop smoke review demonstrate that opening, navigating and selecting matter inside the Ariad observatory performs no writes and exposes source defects as bounded read-only states.
