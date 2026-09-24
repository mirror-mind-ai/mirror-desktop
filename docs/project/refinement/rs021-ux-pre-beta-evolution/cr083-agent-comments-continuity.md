[< RS021](index.md)

# CR083: Agent Comments Continuity

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

When multiple agent messages are concatenated as Agent Comments, they can appear glued together. The surface preserves content but lacks enough visual continuity and breathing room to make adjacent comments pleasant to read.

## Expected Behavior

Adjacent Agent Comments read as a coherent sequence of agent prose, with enough rhythm, separation or grouping to avoid visual collision while preserving transcript authority.

## Proposed Scope

- Characterize the current composition path for adjacent Agent Comments.
- Explore spacing, separators, grouping, continuation markers or card rhythm for consecutive comments.
- Preserve copy behavior, action/tool disclosure and reconstructed/live presentation equivalence.
- Validate against live and restored conversations.

## Acceptance

- Consecutive Agent Comments no longer feel glued together.
- The design does not manufacture new messages or alter transcript order.
- Copy/action affordances remain clear.

## Exclusions

- No summarization or rewriting of agent content.
- No change to Pi transcript authority.
