[< Story](index.md)

# Test Guide — CV-003.DS-005

## Aggregate Validation

Validate one end-to-end checkpoint boundary:

```text
source-grounded candidate content
  Agentic Protocol validation
    Mirror Extension envelope + publication
      canonical Tactical/Strategic projection
        Harness normalization
          read-only Meaning Checkpoints surface
```

## Protocol Evidence

Tactical and Strategic must both cover:

- optional `meaningCheckpoints` backward compatibility;
- non-empty arrays when present;
- required `id`, `title`, `summary`, `state` and `sourceReferences`;
- state enum: `provisional`, `consolidated`, `contested`, `correction_requested`, `stale`;
- optional non-empty `correctionBoundary`;
- rejection of unknown fields, malformed sources and invalid states;
- preservation of existing relationship validation.

Run:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/agentic-protocol
uv run pytest
```

## Extension Publication Evidence

Verify runtime assets are synchronized from canonical Protocol sources, then prove:

- valid Tactical checkpoints publish inside the extension-owned envelope;
- valid Strategic checkpoints publish with Operational and Tactical ancestry;
- invalid checkpoints return `candidate_invalid`;
- rejected candidates do not replace the last valid projection;
- candidate content cannot set Journey or envelope authority;
- publication does not invoke a provider.

Run:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/mirror-extension
uv run python scripts/sync_runtime_assets.py --check
uv run pytest
```

## Harness Evidence

Verify:

- valid checkpoints normalize for Tactical and Strategic;
- invalid state rejects the bundle;
- absent checkpoints remain absent;
- provisional and consolidated states render distinctly;
- correction boundaries and source references are visible;
- reading surfaces contain no forms, checkpoint mutation or provider controls.

Run:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test -- --run
npm run build
```

## Controlled Publication Evidence

Publication authority must be exactly:

```text
journey-id=nautilus-harness
```

Before mutation, inspect and record the active Operational snapshot. Publish Tactical first. Inspect its receipt and use that exact new Tactical snapshot as Strategic ancestry. Candidates must be temporary files outside the Journey and must preserve existing published content while adding only source-grounded validation checkpoints.

Pass only when final public inspection confirms:

- manifest coordinates match the publication receipts;
- Tactical and Strategic documents contain the expected checkpoints;
- source snapshots match inspected ancestry;
- no direct projection-file edit occurred;
- temporary candidates were deleted.

## Navigator Validation

1. Restart or reload Harness after controlled publication.
2. Select `nautilus-harness`.
3. Open **Tactical** and find **Meaning Checkpoints**.
4. Confirm **Provisional reading** and **Consolidated checkpoint** are visibly distinct.
5. Expand source evidence and verify readable source references.
6. Verify the correction boundary preserves original evidence rather than claiming a rewrite.
7. Open **Strategic** and verify its checkpoint state and sources.
8. Switch between altitudes and confirm the surfaces remain read-only and model-free.

Pass when visible content matches the inspected canonical projection and no action except explicit publication mutates state. Fail on missing checkpoints, fabricated content, indistinguishable states, hidden sources, source rewriting, mutation controls or provider activity.

## Child Work Packages

- TS-1 — Derived Meaning Checkpoint Read Model Contract
- US-1 — Checkpoint State Visibility
- US-2 — Provisional and Consolidated Meaning Distinction
- US-3 — Correction and Source Evidence Boundary
- TS-2 — Checkpoint Publication Boundary
- TS-3 — Derived Meaning Validation Fixtures

## Validation Evidence

Record Protocol, Extension and Harness command output; Tactical and Strategic publication receipts; final inspected coordinates; and explicit Navigator acceptance or rejection. DS-level Debt Review remains blocked until Navigator validation is accepted.
