[< RS023](index.md)

# CR135: Let the Navigator Hide a Conversation Without Deleting It

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The sidebar shows many conversations that are no longer in focus: old Desktop work and imported Mirror Core history compete for attention with active work. The Navigator cannot hide a conversation and later reveal it without treating it as deleted.

What exists today is not a visibility control. `FocusedConversationSidebar` computes `hiddenCount` from `props.entries.length - visibleEntries.length` and offers *Show N more* (`:33`, `:96`–`:98`). That is the app's own truncation cap deciding what to show. The Navigator chooses nothing, and what is capped is not what they want out of the way.

## Outcome

The working set of the conversation list is the Navigator's choice. Hiding is explicit, discoverable and reversible, and it is never a deletion.

## First Investigation

1. Inventory the conversation catalog: `journey_workspace`, `desktop_conversation` and `mirror_history` entries, their source and provenance, their lifecycle and their persistence coordinates. Establish which states may be hidden safely without deleting or mutating their authority.
2. Decide the relationship between a Navigator hide and the existing truncation cap. They are different mechanisms and must not be conflated; determine whether the cap should remain at all once hiding exists.
3. Determine where visibility is persisted and what happens to a hidden conversation that later receives work, a correction, or a Mirror-side change — including whether it must reveal itself.
4. Compare a current Desktop conversation, a parent Journey workspace and a Mirror Core history entry in the reveal surface, and confirm provenance survives for each.

## Acceptance

- The Navigator can hide a conversation from the sidebar's ordinary working set and reveal it again through an explicit, discoverable control.
- Hiding is reversible and does not delete, retire, archive, mutate, merge or lose the conversation's transcript, Mirror provenance, thread or run evidence.
- Old Desktop conversations and Mirror Core history remain distinguishable by provenance in any visibility or reveal surface.
- A hidden conversation is never represented as deleted, and an imported Mirror record is never represented as a Desktop one.
- Reload preserves visibility choices.
- A hidden conversation that owns active work is reachable; the Navigator cannot lose a running turn by hiding it.

## Boundaries

No automatic deletion, archival, migration or pruning, and no automatic hiding — the Navigator chooses. This is a presentation preference and must not drift into archival or lifecycle semantics. No change to transcript authority, admission or runtime keying.
