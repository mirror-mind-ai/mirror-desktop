[< Parent](../index.md)

# CV-008.DS-004-TS-3 — Segment Long Conversations at Compaction Checkpoints

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to keep complete long-running Conversations usable without conflating token pressure with user intent,
as Mirror Desktop,
I want authoritative Pi compaction checkpoints to bound technical history Segments inside the same Journey-root or child Conversation,
so that normal loading scales with the working set while Pi remains the sole context and compaction authority.

## Outcome

After exact settlement proves a compaction entry, the Desktop idempotently closes one technical Segment and opens the next without changing root/child presentation identity, thread, generation, Pi session or Mirror conversation. Complete history remains exact and earlier Segments materialize only on request.

## Acceptance Behavior

```text
Given an exact active Pi session records authoritative compaction
When the owning turn settles
Then one ordered Segment checkpoint records exact source and turn ranges plus retained-tail semantics
And no Conversation, generation, title, provider call or automatic restart is created
And ordinary loading reads the current working Segment rather than all retained history

Given earlier Segments remain closed
When the Navigator explicitly opens one
Then its exact messages, Steering, tools, surfaces and terminal evidence become available
And closing it releases the heavy presentation subtree
```

## Scope

- Exact compaction evidence and settlement boundary.
- Segment manifests, source ranges, retained-tail overlap and idempotent publication.
- Current-first loading and explicit historical materialization.
- Complete evidence continuity across Segment boundaries.
- Explicit checkpoint-to-new-Conversation handoff only if the aggregate plan's authority contract is supported.

## Out Of Scope

- Desktop-generated compaction or summary.
- Automatic semantic Conversation split or context reset.
- Treating visible history as active model context.
- Moving or deleting history before verified reversible migration.

## Implementation Evidence

- `60989aa` indexes exact Pi compaction IDs, parent/retained-tail coordinates, source ranges and turn ranges in metadata-only generation-scoped manifests.
- `7362312` publishes SHA-256 verified immutable closed-Segment projections plus one replaceable current projection and loads earlier verified Segments only on explicit request.
- `f377a4a` rejects duplicate checkpoint and projection authority rather than silently deduplicating divergent history.
- Generated coverage keeps a 10 MiB historical terminal action body outside the initial current-Segment working set while preserving complete reconstruction.

## Validation

Automated coverage uses disposable generated sessions with zero, one and malformed compactions, retained-tail overlap, cross-Journey authority, duplicate IDs and histories larger than CR029. Aggregate isolated Navigator validation remains pending at Delivery Story level.
