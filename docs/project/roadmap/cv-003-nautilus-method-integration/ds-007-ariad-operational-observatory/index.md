[< Parent](../index.md)

# CV-003.DS-007 - Ariad Operational Observatory

**Status:** 🟡 Planned

---

## Outcome

Operational gains a read-only Ariad observatory for the selected Journey. The Navigator can open `Operational > Ariad`, see the current method position, inspect the next safe movement, and navigate Delivery, Refinement and Exploration as distinct fields without editing roadmap, runtime state, refinement records or exploratory stories from the view.

## Source Exploration

- [Ariad Operational Observatory](../../../explorations/ariad-operational-observatory/index.md)
- [Product Design Proposal](../../../explorations/ariad-operational-observatory/product-design-proposal.md)

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| [CV-003.DS-007.TS-1](cv-003-ds-007-ts-1-ariad-observatory-read-model-contract/index.md) | Ariad Observatory Read Model Contract | Technical Story | Harness has one read-only projection contract for Ariad state, Delivery, Refinement and Exploration fields | 🟡 Planned |
| [CV-003.DS-007.US-1](cv-003-ds-007-us-1-operational-ariad-home/index.md) | Operational Ariad Home | User Story | Navigator can open `Operational > Ariad` and understand Ariad state, next safe movement, field summaries and selected matter | 🟡 Planned |
| [CV-003.DS-007.US-2](cv-003-ds-007-us-2-delivery-field-observation/index.md) | Delivery Field Observation | User Story | Navigator can inspect the Delivery roadmap field with selected item details and allowed runtime movement without editing it | 🟡 Planned |
| [CV-003.DS-007.US-3](cv-003-ds-007-us-3-refinement-field-workbench/index.md) | Refinement Field Workbench | User Story | Navigator can inspect active and historical Refinement Stories and Change Requests as a workbench for friction | 🟡 Planned |
| [CV-003.DS-007.US-4](cv-003-ds-007-us-4-exploration-field-observation/index.md) | Exploration Field Observation | User Story | Navigator can inspect active and historical Exploratory Stories as organized uncertainty, including attractors, experiments and handoff state | 🟡 Planned |
| [CV-003.DS-007.TS-2](cv-003-ds-007-ts-2-read-only-boundary-guardrails/index.md) | Read-only Boundary Guardrails | Technical Story | The Ariad observatory exposes no direct mutation path and reports missing, stale or unavailable source data safely | 🟡 Planned |

## Done Condition

This delivery story is done when the selected Journey has an Ariad subview inside Operational; Ariad Home renders method state, next safe movement and three field summaries; Delivery, Refinement and Exploration can each be inspected through their own read-only field view; selected matter is legible without opening raw Markdown first; unavailable source data is visibly bounded; and no UI path in the observatory mutates roadmap files, Builder runtime state, Refinement Work or Exploratory Stories.

## Boundary

- This is an observatory, not an editor.
- Ariad remains the method authority. Harness renders read-only projections and explanatory boundaries.
- Delivery, Refinement and Exploration keep distinct regimes: construction commitment, friction care and organized uncertainty.
- Runtime actions such as pull, plan, validate, close, thicken, handoff or promote remain outside this view unless a later story adds an explicit mediated action boundary.
- This story does not replace Tactical Journey Synthesis, Strategic Realization or Derived Meaning Checkpoints.
