[< RS026](index.md)

# CR171: Retire the nautilus_harness Interface Label

**Status:** done
**Line:** 0.3 · Desktop, and conversation data in the home

## Friction

Phase 5c item 3 (2026-11-01): surveying the writers to the production home, the 44
`nautilus_harness` conversations since 2026-10-01 were first mistaken for a separate writer. They are
the Desktop's own: the conversation interface kept its pre-rename value (`CONVERSATION_INTERFACE` in
`mirror_host_bridge.rs`; on 0.2, `scripts/log_mirror_conversation.py`). The label misleads anyone
reading the data, including the agent.

## Proposed Direction

New conversations are written as `mirror_desktop`. Readers that match on `nautilus_harness`
(`AgenticMapField.tsx`, `journeyThreadStorage.ts`, the prompt-envelope projection in `main.rs`) accept
both. Rewriting old rows is a separate decision and probably not worth it.

## Parked (2026-11-03)

Parked by the Navigator: a future demand, not yet recorded, will absorb this CR. Unpark it
when that demand is captured, and merge it there.

The demand that absorbs it is [CV-013](../../roadmap/cv-013-nautilus-for-mirror/index.md) (Navigator, 2026-11-03).

## Delivered (2026-11-04)

Delivered by [CV-013.DS-002](../../roadmap/cv-013-nautilus-for-mirror/ds-002-the-nautilus-line/index.md)
slice 3 (`8c8ecbb6`). With the app named Nautilus again, the new label is `nautilus`, not the
`mirror_desktop` proposed above. New Conversations carry it; the core relabels an open Conversation
when it is ensured again, and learning asks for both labels until then. Old rows are not rewritten.
The messages' `sourceInterface` (`nautilus-harness`) is kept, since replay compares it.
