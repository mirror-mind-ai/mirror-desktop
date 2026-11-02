[< RS026](index.md)

# CR184: Finish a Turn Without Redrawing the Whole Conversation

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02. When the agent finishes, the Conversations area flashes
hard, as if the whole conversation were drawn again.

## Hypothesis (to measure)

At settlement the conversation shown is replaced by the settled one, and the message list does not
keep its elements: new identities (streamed ids against settled ids) or a reload of the persisted
projection remount every message. A recording of the frames at the end of a turn and a React render
profile come before any change.

Related, not the same: [CR157](../rs016-ongoing-product-improvements-and-adjustments/cr157-stop-moving-the-whole-conversation-through-every-settlement.md)
is the cost of moving the whole conversation through every settlement. If the remount comes from
that reload, the two may share a repair.

## Direction

The end of a turn changes only what changed: the last answer settles in place and the rest of the
conversation is not drawn again.

## Acceptance

At the end of a turn, nothing visible moves except the answer that settled, in a long conversation.
