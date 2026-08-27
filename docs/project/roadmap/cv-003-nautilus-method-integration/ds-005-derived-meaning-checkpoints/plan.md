# Delivery Story Plan — CV-003.DS-005

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Derived Meaning Checkpoints

## Objective

Deliver Derived Meaning Checkpoints so the Harness can distinguish provisional derived interpretations from explicit consolidated checkpoints, expose checkpoint state and source grounding, preserve correction/source evidence boundaries, and avoid implicit synthesis generation, provider invocation, or mutation from the published reading surfaces.

## Child Work Packages

- TS-1
- US-1
- US-2
- US-3
- TS-2
- TS-3

## Scope

- Add a read model for optional derived meaning checkpoints in published Tactical and Strategic projections.
- Render checkpoint state visibly inside published reading surfaces when checkpoints are available.
- Distinguish provisional interpretations from consolidated checkpoints without score-like reduction.
- Expose checkpoint source references and correction boundaries.
- Preserve absence honestly when no checkpoints are published.

## Non-Goals

- No checkpoint creation, editing, approval, correction, or deletion inside the Harness.
- No Pi or provider invocation from Tactical or Strategic published reading surfaces.
- No synthesis generation or repair of missing checkpoint data.
- No mutation of source evidence when a correction boundary is displayed.
- No Derived Meaning workflow beyond read-only projection consumption.

## Acceptance Behavior

Given a published Tactical or Strategic projection with meaning checkpoints, when the Navigator opens the corresponding altitude, then checkpoint state, summary, correction boundary and sources are visible.

Given a checkpoint marked provisional, when it is rendered, then it is visibly distinct from a consolidated checkpoint.

Given an invalid checkpoint state, when the projection is normalized, then the bundle is rejected rather than silently coerced.

Given a projection without checkpoints, when the altitude renders, then no checkpoint content is fabricated.

## Validation Route

- Unit-level projection normalization tests for valid and invalid checkpoint records.
- Static-render component tests for Tactical and Strategic checkpoint visibility.
- Boundary assertions that reading surfaces remain inert and do not introduce forms, invocation controls, or unsafe HTML.
- Aggregate checks: `npm test` and `npm run build`.

## Implementation Contract

Use TDD for behavior changes. Keep implementation scoped to published projection consumption and read-only rendering. Do not absorb checkpoint creation, synthesis generation, source mutation, provider invocation, or broader meaning governance workflow into this Delivery Story.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
