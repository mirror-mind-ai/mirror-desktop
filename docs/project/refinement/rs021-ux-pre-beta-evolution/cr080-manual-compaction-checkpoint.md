[< RS021](index.md)

# CR080: Manual Compaction / Compaction Checkpoint

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Mirror Desktop has a compaction/checkpoint moment, but its product meaning is unclear. Long Journey-level conversations continue growing in the main thread, and the app misses an opportunity to help the Navigator split or continue work in a more appropriate conversation shape.

## Expected Behavior

The Desktop understands what actually happens at compaction checkpoints and uses that moment, when appropriate, to suggest a conversation split rather than letting the primary Journey conversation become indefinitely long.

## Proposed Scope

- Characterize current compaction/checkpoint behavior in Desktop and Pi evidence.
- Distinguish automatic compaction, manual checkpoint, conversation Segment, and explicit split/new Conversation.
- Design a suggestion surface that can recommend creating/switching to a new Conversation without forcing the action.
- Preserve transcript authority and avoid hidden migration or automatic split.

## Acceptance

- The current checkpoint behavior is documented with evidence.
- The product decision around split suggestions is explicit.
- Any proposed UI keeps split/manual compaction under user control.

## Exclusions

- No automatic conversation split.
- No rewrite or migration of existing transcript history.
- No Mirror Core change.
