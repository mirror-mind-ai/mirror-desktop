[< RS016](index.md)

# CR077: Reconstruct Reasoning from Pi Session Evidence

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Reasoning survives only if it was captured live and pinned into terminal agent
action evidence. When the Desktop reconstructs a conversation from the Pi
session, reasoning never returns:
`src/domain/piBackedConversationSurface.ts` contains no handling of `thinking`
at all.

This is independent of the provider allowlist in CR076. Even for
`openai-codex`, where live capture works today, a conversation rebuilt from Pi
evidence loses its reasoning while keeping messages and operations. The
material is present in the Pi session JSONL — assistant messages carry
`thinking` blocks alongside `toolCall` blocks — so the loss is ours, not Pi's.

The result contradicts the terminal-aligned conversation authority the product
established in RS018: Pi JSONL is transcript authority, yet one class of
durable Pi evidence is not reconstructed from it.

## Expected Behavior

Reasoning is reconstructed from Pi session evidence with the same authority as
messages and operations.

- Assistant `thinking` blocks in the Pi session are projected into the
  reconstructed conversation surface, preserving their order relative to tool
  calls so the think-then-call sequence is not rearranged.
- Reconstructed reasoning is presented exactly like live reasoning, by shape,
  without a second presentation path.
- Reconstruction remains bounded: reasoning volume across a long session cannot
  make hydration cost or storage grow without limit.
- Absent reasoning stays absent. Nothing is inferred for turns that carry no
  thinking evidence.

## Proposed Scope

- Extract `thinking` content blocks in `piBackedConversationSurface`, ordered
  with existing tool-call projection.
- Reuse the presentation classification introduced by CR076 rather than adding
  a parallel rendering path.
- Apply the bounds CR076 decided (8 KB per reasoning block, 64 KB of total
  reasoning per assistant turn, truncation always visible) at the projection
  point, so the reconstructed path yields the same bounded artifact as live
  capture.
- Tests: reconstruction with interleaved thinking and tool calls, ordering
  preservation, absence when no thinking exists, bounds enforcement.

## Acceptance

- A conversation rebuilt from a Pi session shows the reasoning that the session
  recorded, in its original order relative to tool calls.
- Live and reconstructed reasoning are presented identically.
- Reconstruction of a long session remains bounded in cost and storage.

## Exclusions

- No Pi JSONL rewrite. Pi remains transcript and native-entry authority.
- No change to the live capture path beyond consuming the classification CR076
  introduces.
- No backfill of reasoning into conversations already persisted without it.
- No change to Mirror synchronization or append identity.

## Dependencies

Depends on CR076 for the shape classification and inherits its recorded bounds
decision by reference rather than restating it. Landing CR077 first would
either duplicate presentation logic or reconstruct reasoning the surface still
refuses to display for non-codex providers.

## Evidence

- `src/domain/piBackedConversationSurface.ts` has no `thinking` handling.
- Dev Journey `us1-rerun-a-0831` Pi session JSONL carries assistant messages
  whose content is `['thinking', 'toolCall']`.

## Authority Boundary

Captured only. Selecting, assigning Driver/Delivery, implementing, committing
beyond capture, pushing, merging, publication and release remain separate
Navigator decisions.
