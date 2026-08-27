[< Story](index.md)

# Implementation — CV-003.DS-003

## Summary

Implemented Tactical Journey Synthesis improvements over the existing Tactical tab so published Tactical projections are more explicitly source-grounded, ambiguity-preserving and read-only.

## Delivered Behavior

- Tactical mission now preserves and can render source references.
- Tactical evidence and deliverables expose source references through expandable source sections.
- Deliverables show their supporting evidence identifiers.
- Tactical projections can carry optional ambiguity records.
- Tactical workspace renders ambiguity records in a dedicated ambiguity-preserved panel.
- Projection normalization still rejects invalid relationships and stale ancestry remains visible through the existing stale notice.
- Tactical remains a read-only consumer of published projections and does not introduce forms, mutation controls or implicit synthesis invocation.

## Changed Files

- `src/domain/journeyProjections.ts`
- `src/app/TacticalJourneyWorkspace.tsx`
- `src/styles/app.css`
- `src/tests/journeyProjections.test.ts`
- `src/tests/tacticalJourneyWorkspace.test.tsx`

## Checks

- `npm test`
- `npm run build`

## Boundary

The Harness still consumes published Tactical projections. It does not generate Tactical synthesis, edit Tactical content, mutate sources, invoke Pi or Mirror from Tactical, or implement Derived Meaning Checkpoints.
