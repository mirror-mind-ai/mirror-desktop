# Delivery Story Plan — CV-003.DS-007

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Ariad Operational Observatory

## Objective

Implement the complete Ariad Operational Observatory as a read-only Operational subview that renders Ariad Home plus Delivery, Refinement and Exploration field observations for the selected Journey without direct mutation paths.

## Child Work Packages

- CV-003.DS-007.TS-1
- CV-003.DS-007.US-1
- CV-003.DS-007.US-2
- CV-003.DS-007.US-3
- CV-003.DS-007.US-4
- CV-003.DS-007.TS-2

## Scope

This Delivery Story delivers the complete read-only Ariad Operational Observatory inside the existing Operational workspace.

The implementation scope includes:

- a typed Ariad observatory read model for the selected Journey;
- an `Ariad` Operational subview beside `Conversation` and `Artifacts`;
- Ariad Home with Ariad State, Next Safe Movement, Field summaries, Structure and Selected Matter;
- Delivery field observation for roadmap hierarchy, active position, status, selected item details, source artifact links and explanatory allowed movement;
- Refinement field observation for active and historical Refinement Stories and Change Requests, including focus, status, evidence, driver and delivery metadata when source-owned;
- Exploration field observation for active and historical Exploratory Stories, including summary, current story, attractors, experiments, handoff artifacts and promotion boundary;
- read-only guardrails that prevent mutation from render, selection or navigation and expose missing, stale or unsupported sources explicitly.

## Non-Goals

This Delivery Story does not deliver:

- roadmap editing;
- Builder lifecycle execution from the Ariad observatory;
- Explorer story opening, thickening, handoff, archive or promotion from the Ariad observatory;
- Refinement capture, selection, planning, validation, terminal transitions or document editing from the Ariad observatory;
- Tactical Journey Synthesis, Strategic Realization or Derived Meaning Checkpoints;
- automatic source repair, background synchronization, file watchers or hidden state mutation;
- a general Markdown editor or replacement for Ariad runtime surfaces.

## Acceptance Behavior

```text
Given a selected Journey with Ariad adopted
When the Navigator opens Operational and selects Ariad
Then Ariad Home shows method state, next safe movement, Delivery, Refinement, Exploration, Structure and Selected Matter as read-only projections
```

```text
Given the Navigator selects Delivery, Refinement or Exploration matter
When Selected Matter or the field-specific view renders
Then the detail preserves that field's regime: Delivery as construction commitment, Refinement as friction care, and Exploration as organized uncertainty
```

```text
Given the Navigator navigates and selects items inside the Ariad observatory
When the interaction completes
Then no roadmap artifact, Builder runtime cursor, Refinement document, Exploration artifact, Mirror state or Journey source is mutated
```

```text
Given a source is missing, stale or structurally unsupported
When the Ariad observatory renders
Then the UI shows a bounded unavailable or unsupported state instead of inferring, repairing or silently hiding the defect
```

## Validation Route

Aggregate validation requires automated checks and a desktop Navigator review.

Automated validation should cover read model composition from representative fixtures, field selection behavior, missing-source states and no-mutation guardrails. Desktop validation should open the Harness on a real Journey, navigate to `Operational > Ariad`, inspect Ariad Home, Delivery, Refinement and Exploration, and confirm that the observatory explains state and boundaries without offering direct mutation.

E2E is required if the implementation introduces or changes desktop navigation, view composition or Tauri data-loading behavior. If all work remains isolated in pure TypeScript view models and unit-rendered components, E2E may be waived with explicit evidence from component or integration tests plus manual desktop smoke review.

## Implementation Contract

Use TDD for behavior changes. Implement the read model before wiring the full UI. Keep Harness as projection authority only; do not move Ariad lifecycle authority into the app. Preserve the existing dedicated Journey thread and Operational workspace boundaries. Do not absorb DS-003 Tactical, DS-004 Strategic, DS-005 Checkpoints, Operable Agent Cockpit DS-007, DS-008, DS-009 or DS-010 scope into this work. Any discovered source ambiguity should become visible bounded state or a separate refinement, not silent repair.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
