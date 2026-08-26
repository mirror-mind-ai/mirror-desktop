# Implementation — CV-003.DS-006.TS-5

## Delivered boundary

The `nautilus-synthesis` extension now separates semantic interpretation from publication authority:

```text
explicit Navigator request
→ Pi with Mirror Journey context inspects source projections
→ Pi authors candidate content only
→ extension constructs authoritative envelope
→ bundled Protocol validates schema and relationships
→ Extension API 1.1 publishes atomically
```

The extension itself has no model, provider, subprocess or Mirror-internal invocation path.

## Commands

```text
publish-tactical <journey-id> <operational-snapshot-id> < candidate.json
publish-strategic <journey-id> <operational-snapshot-id> [tactical-snapshot-id] < candidate.json
```

Tactical records Ariad Operational ancestry. Strategic records Ariad Operational and optional Nautilus Tactical ancestry. Candidate JSON contains only `content`; all envelope authority is publisher-owned.

Successful and rejected commands emit bounded JSON without echoing candidate meaning. Candidate validation occurs before publication, preserving the last valid document on failure.

## Runtime assets

The independently installed extension now includes checksum-traceable copies of:

- Protocol Tactical schema v1;
- Protocol Strategic schema v1;
- Protocol dependency-free relational validator;
- Method synthesis profile v1.

`scripts/sync_runtime_assets.py` materializes and checks these assets against the source Protocol and Method repositories. `runtime/asset-manifest.json` records SHA-256 hashes and source paths.

## Explicit intents

`SKILL.md` now defines:

```text
atualize a projeção operacional desta jornada
atualize a síntese tática desta jornada
atualize a síntese estratégica desta jornada
atualize as sínteses desta jornada
```

The all-syntheses route is strictly ordered Operational → Tactical → Strategic and stops on failure. Loading the skill, observing staleness or changing Journey source never invokes synthesis implicitly.

## Validation evidence

Automated extension suite:

```text
13 tests passed
```

Covered behavior includes:

- command registration and compatibility diagnostic;
- envelope ownership;
- Tactical and Strategic ancestry;
- optional Tactical source for Strategic;
- malformed and relationally invalid candidates;
- last-valid preservation;
- bounded receipts/errors;
- no internal Mirror imports, implicit model calls or subprocesses;
- bundled asset hashes and source parity;
- all four explicit skill intents.

Installed isolated round trip:

```text
Tactical: published and inspected status ok
Strategic: published and inspected status ok
Invalid Tactical replacement: exit 2, candidate_invalid
Stable Tactical SHA before/after invalid replacement: identical
```

Installed extension validation:

```text
Validated 1 extension(s)
```

## Commit

Mirror Extension:

```text
e8b3077 Keep model interpretation outside projection publication authority
```
