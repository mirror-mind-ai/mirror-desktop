[< Story](index.md)

# Implementation — CV-003.DS-004

## Summary

Implemented Strategic Realization and Value improvements over the existing Strategic tab so published Strategic projections are more explicitly source-grounded and preserve pragmatic and integrative value as complementary, non-scored lenses.

## Delivered Behavior

- Strategic realization now exposes source references.
- Related impacts expose source references while unrelated impacts remain hidden from the selected realization.
- Pragmatic and integrative value lenses expose their own source references.
- Strategic source references render in expandable source sections with readable wrapping.
- Strategic remains a read-only consumer of published projections and does not introduce forms, mutation controls, scoring, dashboards or implicit synthesis invocation.
- Existing projection normalization continues to validate realization-impact relationships and stale ancestry remains visible through the existing stale notice.

## Changed Files

- `src/app/StrategicJourneyWorkspace.tsx`
- `src/styles/app.css`
- `src/tests/strategicJourneyWorkspace.test.tsx`

## Checks

- `npm test`
- `npm run build`

## Boundary

The Harness still consumes published Strategic projections. It does not generate Strategic synthesis, edit Strategic content, mutate sources, invoke Pi or Mirror from Strategic, score value, or implement Derived Meaning Checkpoints.
