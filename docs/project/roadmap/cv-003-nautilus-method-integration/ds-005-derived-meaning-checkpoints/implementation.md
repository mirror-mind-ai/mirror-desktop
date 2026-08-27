[< Story](index.md)

# Implementation — CV-003.DS-005

## Summary

Implemented Derived Meaning Checkpoints as an optional published-projection read model and read-only rendering surface for Tactical and Strategic Journey readings.

## Delivered Behavior

- Tactical and Strategic projection normalization accepts optional `meaningCheckpoints` records.
- Checkpoints carry explicit state: `provisional`, `consolidated`, `contested`, `correction_requested`, or `stale`.
- Invalid checkpoint states are rejected during projection normalization.
- Tactical and Strategic workspaces render a shared Meaning Checkpoints panel when checkpoints are published.
- Provisional interpretations and consolidated checkpoints are visibly distinct by state label and visual treatment.
- Correction boundaries render as explicit text and preserve source evidence instead of implying source rewriting.
- Checkpoint source references are visible in expandable readable sections with long-reference wrapping.
- Existing projections without checkpoints remain valid and render without fabricated checkpoint content.

## Changed Files

- `src/domain/journeyProjections.ts`
- `src/app/DerivedMeaningCheckpointPanel.tsx`
- `src/app/TacticalJourneyWorkspace.tsx`
- `src/app/StrategicJourneyWorkspace.tsx`
- `src/styles/app.css`
- `src/tests/journeyProjections.test.ts`
- `src/tests/tacticalJourneyWorkspace.test.tsx`
- `src/tests/strategicJourneyWorkspace.test.tsx`

## Checks

- `npm test`
- `npm run build`

## Boundary

The Harness remains a read-only consumer of published projection data. This implementation does not create checkpoints, generate synthesis, invoke Pi, call providers, edit source evidence, or add workflow mutation controls to Tactical or Strategic readings.
