[< Story](index.md)

# Test Guide — CV-003.DS-006.US-1

## Domain

- Parse valid Operational, Tactical and Strategic inspections.
- Reject wrong Journey, namespace, projection, versions and broken relationships.
- Classify missing Tactical/Strategic as absent rather than borrowed fixture data.
- Detect Tactical staleness from Operational ancestry.
- Detect Strategic staleness from Operational and optional Tactical ancestry.

## Backend

- Renderer supplies only `journeyId`.
- Inspect only the three fixed namespace/projection coordinates.
- Treat public `projection_not_found` as absence.
- Reject malformed output, divergence and Journey mismatch.
- Never invoke Pi, synthesis or a provider.

## UI

- Published mission/evidence/deliverables render in Tactical.
- Published realization/impacts/value lenses render in Strategic.
- Missing readings render Journey-named empty states.
- Stale readings render one inert notice.
- Journey changes clear previous readings before asynchronous reload.
- Conversation, draft and Operational-area continuity remain unchanged.

## Required checks

```text
npm test
npm run build
cargo test
cargo check
```

## Driver route

Exercise current, absent, stale and cross-Journey race fixtures, then inspect the production `nautilus-harness` Operational coordinate through the installed runtime. No live synthesis is required unless separately requested through an explicit synthesis intent.
