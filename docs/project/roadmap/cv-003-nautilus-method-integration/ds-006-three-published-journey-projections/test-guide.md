[< Story](index.md)

# Test Guide: CV-003.DS-006

## Aggregate Validation

Validate the six completed child work packages as one production capability. The aggregate proof is not message or title equality. It is exact selected-Journey authority, valid public projection envelopes and snapshot ancestry across Operational, Tactical and Strategic.

## Child Work Packages

- `CV-003.DS-006.TS-1`
- `CV-003.DS-006.TS-2`
- `CV-003.DS-006.TS-3`
- `CV-003.DS-006.TS-4`
- `CV-003.DS-006.TS-5`
- `CV-003.DS-006.US-1`

Each child must retain its own automated validation, review and done evidence. Aggregate validation consumes those artifacts and tests only the cross-package production route that no child can prove alone.

## Automated Validation

- Harness frontend suite and production build pass.
- Harness Rust tests and `cargo check` pass.
- Mirror projection, Journey authority and extension boundary tests pass.
- Nautilus Protocol validates Tactical and Strategic fixtures and rejects invalid candidates.
- Nautilus Method validates the bundled synthesis profile.
- Mirror Extension tests prove checksum-traceable runtime assets, source-snapshot validation, namespace confinement, atomic publication and last-valid preservation.
- Local Markdown links in the Delivery Story package resolve.

## Production Inspection

Inspect the exact public coordinates for Journey `nautilus-harness`:

```text
Operational: op-46c15b20b1f64ff3abe38b88949886e6
Tactical:    ta-5c8dd43ee762419f81b928cccff70d25
Strategic:   st-837f154001e849df91a721e5ebfabc48
```

Expected ancestry:

```text
Tactical
  -> ariad / operational / op-46c15b20b1f64ff3abe38b88949886e6

Strategic
  -> ariad / operational / op-46c15b20b1f64ff3abe38b88949886e6
  -> nautilus-synthesis / tactical / ta-5c8dd43ee762419f81b928cccff70d25
```

All inspections must return `status: ok`. A different Journey ID, namespace, projection or snapshot fails the aggregate check.

## Navigator Validation

1. Select `nautilus-harness` in the desktop.
2. Explicitly send `atualize as sínteses desta jornada`.
3. Observe that execution proceeds in the exact order Operational, Tactical, Strategic.
4. Confirm the final response reports all three bounded coordinates.
5. Open Tactical and confirm the published mission, evidence and deliverables render for the selected Journey.
6. Open Strategic and confirm the published realization and impact reading renders for the same Journey.
7. Confirm no synthesis occurs merely by switching Journey, opening an altitude, focusing the window or inspecting stale data.

Pass condition: publication succeeds, ancestry is exact, populated readings hydrate for `nautilus-harness`, and no implicit provider or cross-Journey mutation occurs.

Fail condition: any coordinate is missing or divergent; Tactical or Strategic cites stale ancestry; another Journey is mutated; Harness derives or publishes meaning itself; or any non-explicit interaction invokes a provider.

## Failure and Safety Routes

- Invalid candidate content fails before publication and preserves the last-valid projection.
- Missing Tactical stops the all-syntheses sequence before Strategic publication.
- Cross-Journey authority conflict stops before mutation.
- Public inspection resolves only registry-confined projection paths.
- Stale or unavailable projections remain visible and inert.
- Retry never regenerates an already completed provider answer.

## Validation Evidence

The Navigator reported successful completion for `nautilus-harness` with the three production coordinates above. Independent model-free inspection confirmed:

```text
Operational: ok
Tactical:    ok, cites exact Operational
Strategic:   ok, cites exact Operational and Tactical
```

This aggregate evidence closes the previously open first-production-publication boundary.
