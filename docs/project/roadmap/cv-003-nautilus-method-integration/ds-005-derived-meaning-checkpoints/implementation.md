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

## Publication Boundary Correction

Navigator validation exposed that the Harness read model could display checkpoints but the canonical Agentic Protocol and installed Mirror Extension runtime rejected `meaningCheckpoints` because their content schemas were closed and did not define the field.

The correction now delivers:

- optional backward-compatible `meaningCheckpoints` arrays in Tactical and Strategic Protocol v1;
- required checkpoint identity, title, summary, explicit state and source references;
- optional non-empty correction boundaries;
- supported states: `provisional`, `consolidated`, `contested`, `correction_requested`, and `stale`;
- dependency-free validation of state, fields, sources, duplicate IDs and correction boundaries;
- canonical fixtures for provisional and consolidated checkpoint publication;
- synchronized Mirror Extension runtime validators, schemas and asset manifest;
- extension publication tests proving valid transport, invalid-state rejection, prior-projection preservation and provider-free execution;
- extension skill and command guidance for optional source-grounded checkpoints.

## Cross-body commits

```text
Agentic Protocol  e92aef9 Make derived meaning checkpoints canonically publishable
Mirror Extension  c053096 Publish source-grounded derived meaning checkpoints
```

## Checks

```text
Agentic Protocol: 13 tests passed
Mirror Extension: 14 tests passed; runtime assets current
Harness:          55 Vitest files / 294 tests passed
Harness build:    production TypeScript/Vite build passed
```

## Remaining Authorized Boundary

Code implementation is complete. Before visual validation, the updated Mirror Extension must be installed into the production Mirror home and must publish controlled Tactical and Strategic checkpoints for exact `journey-id=nautilus-harness`. Installation is a local deployment and publication mutates canonical projection coordinates, so both remain behind an explicit final Navigator authorization.

## Boundary

The Harness remains a read-only consumer of published projection data. This implementation does not create checkpoints, generate synthesis, invoke Pi, call providers, edit source evidence, or add workflow mutation controls to Tactical or Strategic readings. Checkpoints enter canonical projections only through explicit extension publication.
