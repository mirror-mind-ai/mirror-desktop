[< Story](index.md)

# Test Guide — CV-003.DS-003

## Aggregate Validation

Validate Tactical Journey Synthesis across published projection normalization, Tactical workspace rendering, source traceability, unavailable states, stale states and no-mutation boundaries.

Recommended automated checks:

- complete Tactical projection renders mission, evidence and deliverables;
- mission, evidence and deliverable source references are preserved and exposed by the read model or UI;
- stale ancestry against the Operational projection is visible in the Tactical workspace;
- missing Tactical projection renders an honest empty or unavailable state;
- invalid Tactical projection fails normalization and surfaces bounded error state through the projection loader;
- ambiguous Tactical readings can be represented without being coerced into certainty;
- Tactical interactions do not write projection, roadmap, Operational, Mirror or Journey source data.

## Child Work Packages

- CV-003.DS-003.TS-1
- CV-003.DS-003.US-1
- CV-003.DS-003.US-2
- CV-003.DS-003.TS-2
- CV-003.DS-003.TS-3

## Navigator Validation

Navigator route:

```text
Open the Harness with a Journey that has a published Tactical projection.
Select the Journey.
Open Tactical.
Inspect the mission, evidence and deliverables.
Inspect source grounding for at least one evidence item and one deliverable.
Repeat or simulate with a missing or stale Tactical projection.
Confirm that Tactical remains read-only and does not become a manual form surface.
```

Expected observation:

```text
Tactical displays mission, evidence and deliverables as a derived reading. The view shows source grounding and published projection boundaries. Missing, stale, invalid or ambiguous projection states are visible. No editing or synthesis action is offered from the Tactical tab.
```

Pass condition:

```text
The Navigator can explain what mission, evidence and deliverables the Tactical reading currently sees, where that reading is grounded, and whether the reading is current or bounded by missing, stale or ambiguous sources.
```

Fail condition:

```text
Tactical shows representative or invented content as if it were real, hides missing or stale data, drops source references, presents derived readings as editable manual state, invokes synthesis implicitly, or mutates source data during inspection.
```

## Validation Evidence

Pending implementation and validation.
