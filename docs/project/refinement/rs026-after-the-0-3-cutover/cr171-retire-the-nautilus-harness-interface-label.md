[< RS026](index.md)

# CR171: Retire the nautilus_harness Interface Label

**Status:** parked
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
