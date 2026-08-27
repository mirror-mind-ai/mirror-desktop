# Delivery Story Plan — CV-003.DS-004

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Strategic Realization and Value

## Objective

Deliver Strategic Realization and Value so the existing Strategic tab becomes a semantically reliable published reading of the selected Journey, showing realizations, observed impacts and pragmatic and integrative value lenses grounded in Tactical and Operational evidence, with source traceability, stale and unavailable states, and no score-like reduction of value.

## Child Work Packages

- CV-003.DS-004.TS-1
- CV-003.DS-004.US-1
- CV-003.DS-004.US-2
- CV-003.DS-004.US-3
- CV-003.DS-004.TS-2
- CV-003.DS-004.TS-3

## Scope

This Delivery Story delivers the Strategic view as a reliable published reading over the selected Journey's Tactical and Operational evidence.

The implementation scope includes:

- a typed Strategic projection read model that preserves realizations, impacts, pragmatic value, integrative value, source references and source availability;
- Strategic workspace rendering that distinguishes published Strategic truth from unavailable, invalid or stale content;
- realization-to-impact relationships that remain visible and internally validated;
- pragmatic and integrative value lenses presented as complementary readings of the same realization;
- source traceability affordances for impacts, realizations and value lenses;
- stale, missing, invalid and relationally inconsistent projection states that remain visible instead of being repaired or hidden;
- validation fixtures covering complete, stale, missing, invalid and relationally inconsistent Strategic projections.

## Non-Goals

This Delivery Story does not deliver:

- Strategic synthesis generation by the Harness;
- autonomous Pi or Mirror invocation from the Strategic tab;
- editing realizations, impacts, values or source references in the Strategic view;
- scoring, ranking or reducing integrative value to a metric;
- executive dashboard behavior;
- durable correction checkpoint semantics, which remain owned by CV-003.DS-005;
- Tactical synthesis work beyond consuming its published ancestry;
- unrestricted source crawling or broad filesystem authority.

## Acceptance Behavior

```text
Given a selected Journey with published Operational, Tactical and Strategic projections
When the Navigator opens Strategic
Then the view renders realizations, impacts and pragmatic and integrative value lenses as a published strategic reading grounded in source evidence
```

```text
Given a realization relates to one or more impacts
When the Navigator inspects the realization
Then the UI shows the related impacts and preserves both pragmatic and integrative value readings as complementary, non-scored lenses
```

```text
Given a Strategic item has source references
When the Navigator inspects that item
Then the UI shows the supporting Tactical or Operational sources without treating the item as manually editable form data
```

```text
Given the Strategic projection is missing, invalid, stale or relationally inconsistent
When the Navigator opens Strategic
Then the view shows a bounded unavailable, invalid, stale or inconsistent state instead of inventing content or silently falling back to fixtures
```

## Validation Route

Aggregate validation requires automated checks and a desktop Navigator review.

Automated validation should cover complete Strategic projections, impact relationship validation, value-lens rendering, source traceability, stale ancestry, missing projections, invalid projections and relationally inconsistent projections. Desktop validation should open a Journey with published Strategic projection, inspect realizations, impacts and both value lenses, verify source grounding, and confirm that unavailable or stale data is reported honestly.

E2E is required if implementation changes desktop navigation, Tauri projection loading or user interaction flows. If work remains isolated to TypeScript projection normalization and React rendering, E2E may be waived with component/integration tests plus manual desktop smoke review.

## Implementation Contract

Use TDD for behavior changes. Keep the Harness as a consumer of published Strategic projections, not a synthesis authority. Preserve the distinction between pragmatic and integrative value; do not collapse value into score, priority or status. Keep changes scoped to Strategic Realization and Value and do not absorb Derived Meaning Checkpoints, Tactical synthesis generation, Ariad Observatory, Journey mutation, or provider invocation work. Any source ambiguity or relational inconsistency should become visible UI state or a separate refinement, not silent repair.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
