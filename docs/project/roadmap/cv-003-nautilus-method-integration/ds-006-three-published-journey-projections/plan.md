# Delivery Story Plan: CV-003.DS-006

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Three Published Journey Projections

## Objective

Aggregate the six completed child stories into one validated production capability: publish and hydrate coordinated Operational, Tactical and Strategic Journey projections under explicit ownership and selected-Journey authority.

## Child Work Packages

- `CV-003.DS-006.TS-1`: Mirror Journey Projection Contract v1 and Return Probe
- `CV-003.DS-006.TS-2`: Repository Baselines and Mirror Compatibility
- `CV-003.DS-006.TS-3`: Nautilus Projection Protocol
- `CV-003.DS-006.TS-4`: Nautilus Method Synthesis Profile
- `CV-003.DS-006.TS-5`: Explicit Synthesis Publication Boundary
- `CV-003.DS-006.US-1`: Published Journey Projection Hydration

## Scope

- Prove `mirror.journey-projections@1.0` and Extension API `1.1` against the installed production Mirror runtime.
- Publish Operational deterministically through Ariad.
- Interpret Tactical and Strategic only through explicit Pi invocation with active selected-Journey Mirror context.
- Validate Tactical and Strategic candidate content through Nautilus Protocol before atomic publication.
- Hydrate Harness only from public, registry-rooted, read-only projection inspection.
- Preserve exact ancestry from Tactical to Operational and from Strategic to Operational plus Tactical.
- Make absence, divergence and stale ancestry visible without implicit repair or provider invocation.
- Prove selected-Journey authority through the complete Harness to Pi to Mirror Extension route.

## Non-Goals

- Automatic synthesis after Journey changes.
- Editable Tactical or Strategic forms, task management, scores, charts or persistence controls.
- Moving Nautilus semantics into Mirror Core.
- Letting Harness derive, validate or publish projection meaning.
- Using private prompts, responses, transcript bodies, raw reasoning or secrets as evidence.
- Closing the later semantic capabilities `CV-003.DS-003`, `CV-003.DS-004` or `CV-003.DS-005`.
- Implementing the dedicated Journey thread capability planned in `CV-004`.

## Acceptance Behavior

```text
Given nautilus-harness is the visibly selected Journey
When the Navigator explicitly requests all Journey syntheses
Then Ariad publishes a new Operational snapshot
And Pi derives Tactical from that exact Operational snapshot
And Pi derives Strategic from the same Operational and new Tactical snapshots
And the extension validates and publishes both derived projections atomically
And final public inspection returns all three exact coordinates
And Harness renders the validated readings without mutation authority
```

```text
Given another Journey is selected or command authority conflicts
When synthesis or publication is attempted
Then the operation fails closed before cross-Journey mutation
And no default, current directory or recent-conversation Journey is substituted
```

```text
Given a projection is missing, stale or divergent
When Harness hydrates the selected Journey
Then the state remains visible and inert
And no provider, publication or repair occurs implicitly
```

## Validation Route

- Run the child test suites and builds recorded in each child validation artifact.
- Inspect installed runtime compatibility and checksum-traceable Protocol and Method assets.
- Execute the complete production route from the Harness:
  - explicit all-syntheses intent;
  - deterministic Operational rebuild;
  - Tactical publication and inspection;
  - Strategic publication and inspection;
  - final coordinate verification.
- Verify exact snapshot ancestry through public `journey-projection inspect` commands.
- Confirm the Navigator can see populated Tactical and Strategic workspaces for `nautilus-harness`.
- Preserve production receipts and bounded coordinates without copying private model material.

## Production Acceptance Coordinates

```text
Operational: op-46c15b20b1f64ff3abe38b88949886e6
Tactical:    ta-5c8dd43ee762419f81b928cccff70d25
Strategic:   st-837f154001e849df91a721e5ebfabc48
```

Tactical cites the exact Operational coordinate. Strategic cites the same Operational coordinate and the exact Tactical coordinate. Public inspection returned `ok` for all three projections, and the Navigator confirmed successful publication and final inspection in Harness.

## Implementation Contract

- Child behavior changes remain TDD-driven and story-scoped.
- Mirror, Harness, Protocol, Method and Mirror Extension ownership boundaries remain explicit.
- Projection publication is atomic, namespace-confined, rollback-safe and last-valid preserving.
- Provider invocation is always explicit and never occurs during browsing, inspection, reconciliation, staleness detection or retry.
- Native Journey and snapshot IDs establish authority; names, text and timestamps do not.
- Existing child review and validation evidence remains authoritative and is aggregated rather than rewritten.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
