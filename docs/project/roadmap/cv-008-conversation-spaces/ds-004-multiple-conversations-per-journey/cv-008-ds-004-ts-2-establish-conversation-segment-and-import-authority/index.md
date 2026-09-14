[< Parent](../index.md)

# CV-008.DS-004-TS-2 — Establish Conversation, Segment and Import Authority

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to support multiple exact continuities without promoting indexes into execution authority,
as Mirror Desktop,
I want versioned bounded Conversation, Segment, source-revision and import-receipt contracts,
so that selection, provisioning, copy, segmentation and recovery remain exact and idempotent.

## Outcome

The Desktop can parse, validate and atomically persist one bounded catalog per Journey, stable Conversation-to-thread authority, immutable historical Segment manifests, and a phased source-preserving import receipt. Partial, duplicate, stale, cross-Journey, cross-channel and symlinked state fails closed.

## Acceptance Behavior

```text
Given valid and adversarial catalog, Conversation, Segment and import records
When native and frontend parsers inspect them
Then only bounded exact Journey plus Conversation authority is accepted
And listing or selection does not create RunAuthority
And partial import or segment state never appears ready
And duplicate exact operations converge while conflicting revisions fail closed
```

## Scope

- Stable Conversation identity beneath one Journey and dedicated thread.
- Catalog origin, availability, title, recency, lifecycle and bounded ordering metadata.
- Segment range, compaction checkpoint and current-versus-immutable state.
- Source identity/revision and phased import receipt.
- Exact path, payload, symlink, traversal, count, byte and unknown-field validation.
- Unique staging, file sync, atomic publication and model-free recovery evidence.

## Out Of Scope

- Catalog UI or working-copy confirmation flow.
- Provider-generated titles or summaries.
- Same-Journey concurrent execution.
- Treating catalog or Segment indexes as Pi, generation, run or turn authority.

## Validation

Use pure schema tests plus native filesystem tests for corruption, bounds, atomic publication, replacement races and every import phase. Preserve existing thread identity through compatibility fixtures and prove that only a fully validated ready record may be selected for execution.
