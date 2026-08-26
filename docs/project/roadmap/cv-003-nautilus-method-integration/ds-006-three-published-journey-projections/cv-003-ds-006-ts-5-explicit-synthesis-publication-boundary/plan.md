# Plan — CV-003.DS-006.TS-5

## Objective

Deliver the explicit, auditable handoff from Pi interpretation to deterministic Nautilus publication without allowing model-authored envelopes, implicit provider invocation or extension authority over Ariad Operational.

## Design

### Interpretation boundary

The Pi skill recognizes only explicit synthesis requests. Pi, already running with Mirror Journey context, uses public projection inspection and the bundled Method profile to produce a JSON `content` candidate. Candidate content never contains envelope authority, Journey roots, publication paths, producer identity, timestamps or snapshot IDs.

### Publication boundary

The extension registers:

```text
publish-tactical <journey-id> <operational-snapshot-id>
publish-strategic <journey-id> <operational-snapshot-id> [tactical-snapshot-id]
```

Both commands read exactly one JSON object from standard input. They construct the complete `mirror.journey-projections@1.0` envelope, validate it with bundled Protocol v1 JSON Schema and relational validation, and publish through `ExtensionAPI.journey_projections`. They print a bounded JSON receipt and never echo candidate meaning.

### Runtime assets

The extension is independently installable, so it carries immutable runtime copies of:

- Tactical schema v1;
- Strategic schema v1;
- dependency-free Protocol relational validator;
- Method synthesis profile v1.

A manifest records source locations and SHA-256 hashes. A sync/check script makes Protocol and Method the development sources of truth while the installed extension remains self-contained.

### Source causality

- Tactical contains exactly one Ariad Operational source coordinate supplied from explicit public inspection.
- Strategic contains Ariad Operational and optionally current Nautilus Tactical coordinates.
- The publisher computes `sourceRevision` from canonical candidate content and source coordinates.
- Publication does not claim currentness forever; later source advancement remains observable staleness.

## Implementation Steps

1. Add failing tests for command registration, stdin-only content, envelope ownership, Tactical and Strategic ancestry, relationship rejection, last-valid preservation, bounded receipts and absence of provider calls.
2. Add a runtime-asset sync/check script and materialize Protocol/Method assets with checksums.
3. Refactor `extension.py` around a small deterministic envelope/publication boundary while preserving `contract-smoke`.
4. Expand `skill.yaml` with the two publication commands.
5. Rewrite `SKILL.md` with exact Portuguese intents, public inspection steps, candidate constraints, publication commands and no-implicit-invocation rules.
6. Add command and architecture documentation.
7. Validate the extension in an isolated Mirror home and execute synthetic Tactical and Strategic publication round trips.
8. Record implementation, validation, debt review and closure artifacts through Ariad lifecycle.

## Files Expected to Change

### Mirror Extension

- `extension.py`
- `skill.yaml`
- `SKILL.md`
- `runtime/asset-manifest.json`
- `runtime/protocol/*`
- `runtime/method/synthesis-profile.yaml`
- `scripts/sync_runtime_assets.py`
- `tests/test_synthesis_publication.py`
- `tests/test_runtime_assets.py`
- `docs/commands.md`
- `docs/architecture/synthesis-publication.md`

### Harness roadmap

- this TS-5 package;
- DS-006 work-package table and next boundary after acceptance.

No Mirror Core, Harness application, Protocol semantic source or Method semantic source changes are planned.

## Validation Route

### Automated

```bash
cd /Users/alissonvale/mirror
uv run python -m unittest discover \
  -s /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/mirror-extension/tests \
  -p 'test_*.py'

uv run python -m memory extensions validate \
  --mirror-home "$ISOLATED_MIRROR_HOME" \
  --extensions-root /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus \
  --runtime pi
```

### Driver E2E

Using an isolated Mirror home and synthetic registered Journey:

1. publish or provide a synthetic Operational coordinate;
2. publish valid Tactical candidate content through stdin;
3. inspect Tactical and verify envelope/source coordinates;
4. publish valid Strategic candidate content with Operational and Tactical ancestry;
5. inspect Strategic and verify coordinates;
6. submit invalid candidate content and prove last-valid preservation;
7. prove no test double for `api.llm` was called.

This fixture-level E2E is sufficient for the deterministic publication boundary. Live Pi semantic quality belongs to the later end-to-end synthesis validation package.

## Pass Condition

All extension tests, runtime asset checksum checks, manifest validation and isolated publication/inspection checks pass; invalid candidates preserve the last valid projection; no implicit LLM call occurs.

## Fail Condition

Any model-authored envelope authority is accepted, ancestry is missing, invalid relationships publish, candidate content leaks in receipts, provider invocation occurs inside the extension, or the extension imports Mirror internals.

## Stop Conditions

- Extension API 1.1 cannot preserve namespace confinement for the planned publication route.
- Protocol and bundled runtime validation differ.
- Runtime installation cannot resolve self-contained assets.
- Scope expands into Harness hydration, checkpoint semantics or Mirror Core modification.

## Approval

The Journey remains in accelerated cadence. The Navigator's “vamos em frente” authorizes this bounded next story; Driver performs plan and validation checks without a separate Navigator checkpoint.
