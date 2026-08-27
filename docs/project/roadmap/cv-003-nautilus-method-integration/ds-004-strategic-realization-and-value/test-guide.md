[< Story](index.md)

# Test Guide — CV-003.DS-004

## Aggregate Validation

Validate Strategic Realization and Value across published projection normalization, Strategic workspace rendering, realization-impact relationships, pragmatic and integrative value lenses, source traceability, unavailable states, stale states and no-mutation boundaries.

Recommended automated checks:

- complete Strategic projection renders realizations, impacts and both value lenses;
- realization impact references are validated and visible;
- pragmatic and integrative value are rendered as complementary readings, not scores;
- impact, realization and value source references are preserved and exposed by the read model or UI;
- stale ancestry against Operational or Tactical projections is visible in the Strategic workspace;
- missing Strategic projection renders an honest empty or unavailable state;
- invalid or relationally inconsistent Strategic projection fails normalization and surfaces bounded error state through the projection loader;
- Strategic interactions do not write projection, roadmap, Tactical, Operational, Mirror or Journey source data.

## Child Work Packages

- CV-003.DS-004.TS-1
- CV-003.DS-004.US-1
- CV-003.DS-004.US-2
- CV-003.DS-004.US-3
- CV-003.DS-004.TS-2
- CV-003.DS-004.TS-3

## Navigator Validation

Navigator route:

```text
Open the Harness with a Journey that has published Operational, Tactical and Strategic projections.
Select the Journey.
Open Strategic.
Inspect realizations, impacts and pragmatic and integrative value lenses.
Inspect source grounding for at least one impact, one realization and one value lens.
Repeat or simulate with a missing or stale Strategic projection.
Confirm that Strategic remains read-only and does not become an executive dashboard, scorecard or manual form surface.
```

Expected observation:

```text
Strategic displays realizations, impacts and value lenses as a published reading. The view shows source grounding and published projection boundaries. Pragmatic and integrative value remain complementary readings of the same realization. Missing, stale, invalid or relationally inconsistent projection states are visible. No editing or synthesis action is offered from the Strategic tab.
```

Pass condition:

```text
The Navigator can explain what realizations and impacts the Strategic reading currently sees, how pragmatic and integrative value differ, where that reading is grounded, and whether the reading is current or bounded by missing, stale or invalid sources.
```

Fail condition:

```text
Strategic shows representative or invented content as if it were real, hides missing or stale data, drops source references, breaks realization-impact relationships, reduces value to a score, invokes synthesis implicitly, or mutates source data during inspection.
```

## Validation Evidence

Pending implementation and validation.
