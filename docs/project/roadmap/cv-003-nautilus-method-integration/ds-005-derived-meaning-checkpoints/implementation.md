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
Mirror Extension  b2ce2b5 Version checkpoint publication as extension 0.3.0
```

## Checks

```text
Agentic Protocol: 13 tests passed
Mirror Extension: 14 tests passed; runtime assets current
Harness:          55 Vitest files / 294 tests passed
Harness build:    production TypeScript/Vite build passed
```

## Controlled Production Publication

After explicit Navigator authorization, the updated extension was installed into the production Mirror home and the Pi runtime extension catalog was rebuilt without evicting the other installed extensions. A production database backup was created first:

```text
memory_20260827_232610.zip
```

Controlled provider-free publication then produced:

```text
Extension version     0.3.0
Operational ancestry  op-760e46daa3ad48fe810cf0aafacf005d
Tactical              ta-151be9edf03a4e2bb2e3e35a85bff47a
Strategic             st-ae390ae29848417caaa73b13333fc5e6
```

Tactical publishes one consolidated and one provisional checkpoint. Strategic publishes one provisional checkpoint and records the new Tactical snapshot as exact ancestry. Final public inspection confirmed extension producer version `0.3.0` and that both manifest coordinates match their receipts. Temporary candidates were deleted. The first `0.2.0` deployment receipts are retained as explicitly superseded audit evidence; the unsuffixed evidence files are authoritative for visual validation.

## Boundary

The Harness remains a read-only consumer of published projection data. This implementation does not create checkpoints, generate synthesis, invoke Pi, call providers, edit source evidence, or add workflow mutation controls to Tactical or Strategic readings. Checkpoints enter canonical projections only through explicit extension publication.
