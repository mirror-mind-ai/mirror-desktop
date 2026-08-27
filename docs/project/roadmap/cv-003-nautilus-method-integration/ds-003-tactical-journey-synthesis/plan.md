# Delivery Story Plan — CV-003.DS-003

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Tactical Journey Synthesis

## Objective

Deliver Tactical Journey Synthesis so the existing Tactical tab becomes a semantically reliable derived reading of the selected Journey, showing mission, evidence and deliverables from bounded published Tactical projections with source traceability, ambiguity preservation, stale and unavailable states, and no parallel manual form state.

## Child Work Packages

- CV-003.DS-003.TS-1
- CV-003.DS-003.US-1
- CV-003.DS-003.US-2
- CV-003.DS-003.TS-2
- CV-003.DS-003.TS-3

## Scope

This Delivery Story delivers the Tactical view as a reliable derived reading over the selected Journey's operational life.

The implementation scope includes:

- a typed Tactical projection read model that preserves mission, evidence, deliverables, source references and source availability;
- Tactical workspace rendering that distinguishes published Tactical truth from representative or unavailable content;
- source traceability affordances for mission, evidence and deliverable items;
- stale, missing, invalid and ambiguous projection states that remain visible instead of being repaired or hidden;
- validation fixtures covering complete, stale, missing, invalid and ambiguous Tactical projections;
- tests that prove Tactical does not create or maintain parallel manual form state.

## Non-Goals

This Delivery Story does not deliver:

- Tactical synthesis generation by the Harness;
- autonomous Pi or Mirror invocation from the Tactical tab;
- editing mission, evidence, deliverables or source references in the Tactical view;
- durable correction checkpoint semantics, which remain owned by CV-003.DS-005;
- Strategic realization, impact or value readings, which remain owned by CV-003.DS-004;
- unrestricted source crawling or broad filesystem authority;
- replacement of Ariad Operational Observatory or Operational artifacts.

## Acceptance Behavior

```text
Given a selected Journey with a published Tactical projection
When the Navigator opens Tactical
Then the view renders mission, evidence and deliverables as a derived reading with visible source grounding
```

```text
Given a Tactical item has source references
When the Navigator inspects that item
Then the UI shows the supporting operational sources without treating the item as manually editable form data
```

```text
Given the Tactical projection is missing, invalid, stale or ambiguous
When the Navigator opens Tactical
Then the view shows a bounded unavailable, invalid, stale or ambiguous state instead of inventing content or silently falling back to fixtures
```

```text
Given the Navigator interacts with Tactical
When navigation or inspection completes
Then no Tactical projection, Operational source, roadmap artifact, Mirror state or Journey document is mutated
```

## Validation Route

Aggregate validation requires automated checks and a desktop Navigator review.

Automated validation should cover complete Tactical projections, source traceability, stale ancestry, missing projections, invalid projections and explicit ambiguous readings. Desktop validation should open a Journey with a published Tactical projection, inspect the Tactical tab, verify mission, evidence and deliverables, inspect source grounding, and confirm that unavailable or stale data is reported honestly.

E2E is required if implementation changes desktop navigation, Tauri projection loading or user interaction flows. If work remains isolated to TypeScript projection normalization and React rendering, E2E may be waived with component/integration tests plus manual desktop smoke review.

## Implementation Contract

Use TDD for behavior changes. Keep the Harness as a consumer of published Tactical projections, not a synthesis authority. Preserve source references and uncertainty rather than flattening them into certainty. Keep changes scoped to Tactical Journey Synthesis and do not absorb Strategic, Derived Meaning Checkpoints, Ariad Observatory, Journey mutation, or provider invocation work. Any source ambiguity should become visible UI state or a separate refinement, not silent repair.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
