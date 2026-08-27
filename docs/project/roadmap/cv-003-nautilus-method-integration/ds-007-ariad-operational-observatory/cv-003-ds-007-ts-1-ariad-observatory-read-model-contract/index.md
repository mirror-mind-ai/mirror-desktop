[< Parent](../index.md)

# CV-003.DS-007.TS-1 - Ariad Observatory Read Model Contract

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to render Ariad as an operational observatory,
As the Harness frontend and local projection layer,
I want one read-only read model for Ariad state, Delivery, Refinement and Exploration,
So that UI components can display method structure without becoming method authority.

## Outcome

Harness has a typed read model that separates source data, derived display state, source availability, selected matter and read-only boundary metadata for the Ariad observatory.

## Acceptance Behavior

```text
Given a selected Journey with Ariad roadmap artifacts, runtime resume state, Refinement data and Exploration handoff/story artifacts
When the Ariad observatory read model is composed
Then it exposes Ariad state, next safe movement, Delivery field, Refinement field, Exploration field and selected matter without mutating any source
```

```text
Given one or more Ariad source surfaces are unavailable
When the read model is composed
Then the missing source is represented as bounded unavailable data instead of inferred or silently hidden truth
```

## Scope

- Define the Ariad observatory read model shape in TypeScript.
- Represent source availability and read-only boundary messages explicitly.
- Include Ariad method state, active item, checkpoint, pending confirmation and allowed next actions when available.
- Include Delivery, Refinement and Exploration field summaries and selected matter data.
- Keep source parsing and projection deterministic and local.

## Out Of Scope

- Direct roadmap mutation.
- Direct Builder runtime lifecycle actions.
- Direct Explorer story mutation.
- Full Markdown editing or authoring.
- Tactical or Strategic synthesis generation.

## Validation

Automated tests compose the read model from representative fixtures covering complete data, missing runtime state, missing Refinement field and missing Exploration field.
