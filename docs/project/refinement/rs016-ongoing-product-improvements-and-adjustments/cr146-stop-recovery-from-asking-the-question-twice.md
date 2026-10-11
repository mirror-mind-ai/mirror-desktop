[< RS016](index.md)

# CR146: Stop Recovery from Asking the Question Twice

**Status:** captured
**Driver:** —
**Delivery:** —

Found on 2026-10-11 by the restart experiment in CR145, which recovered an answer and damaged the
transcript doing it.

## Friction

A turn whose process vanished was recovered after a restart. The answer came back. But the
conversation durably reads:

| # | Role | Size | |
|---|---|---|---|
| 1 | user | 353 chars | the prompt |
| 2 | assistant | **0 chars** | the placeholder written at admission |
| 3 | user | 353 chars | **the same prompt again** |
| 4 | assistant | 65,474 chars | the answer |

Ask, silence, ask the same thing again, answer. The Navigator asked once.

## What happened

At admission the renderer persists the prompt and an empty assistant message
(`saveAdmittedTurnProjection`). On recovery the projection read the Pi session file — which
contains both the user message and the assistant reply — and **appended both**, instead of
recognising that the prompt was already present and the placeholder was waiting for exactly this
text.

`dedicated-journey-conversations/mirror-desktop/threads/desktop-thread-mirror-desktop-18dd7a36acc7f288/generation-1.json`,
4 messages, 69,473 bytes, written `11:08:25`, twelve seconds after launch.

## Desired Outcome

A recovered turn fills the place that was held for it. The Navigator's question appears once.

## First Investigation

1. Establish which projection path ran. The journal gained no record, so this was not a re-run;
   something read the Pi session and wrote the conversation.
2. Establish whether the empty placeholder is addressable — whether the projection knows the
   `turnId` it is completing, or only appends.
3. Decide what happens to the two messages already duplicated on this profile, and whether any
   repair is retroactive or forward-only. **Forward-only is the likely answer** and should be said
   rather than assumed.
4. Establish whether this is why a conversation can show `messageCount: 0` in the catalog while
   its file holds four messages — the catalog was not rewritten at `11:08:25` either, so the
   recovery writes the conversation without updating what indexes it.

## Boundaries

Not a change to recovery's decision to recover. The content route works and that was the valuable
finding; this is about where it puts what it recovers.
