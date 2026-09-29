[< RS021](index.md)

# CR083: Agent Comments Continuity

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr083-agent-comments-continuity`

## Problem

When multiple agent messages are concatenated as Agent Comments, they can appear glued together. The surface preserves content but lacks enough visual continuity and breathing room to make adjacent comments pleasant to read.

## Expected Behavior

Adjacent Agent Comments read as a coherent sequence of agent prose, with enough rhythm, separation or grouping to avoid visual collision while preserving transcript authority.

## Proposed Scope

- Characterize the current composition path for adjacent Agent Comments.
- Explore spacing, separators, grouping, continuation markers or card rhythm for consecutive comments.
- Preserve copy behavior, action/tool disclosure and reconstructed/live presentation equivalence.
- Validate against live and restored conversations.

## Characterization — 2026-09-29

Navigator evidence shows `agora.Produção`, `retry.O`, `restart.Vou` and `correção.Need`: a
sentence-final period touching the next comment's first word, with no space at all.

The cause is not styling. During one run, Pi emits several assistant messages — one per step
between tool calls. The live path folds all of them into a single harness message:

- `src/app/App.tsx` accumulates every `message_delta` into one `assistantMessage.id`;
- `reduceStreamedAssistantMessage` (`src/agent/agentStream.ts`) returns `` `${current}${content}` ``.

That concatenation is correct for token deltas inside one message and wrong across messages,
because nothing marks where one comment ends and the next begins. The boundary information does
exist in the stream and is currently discarded: `piProcessStream.ts` receives `message_end` for
assistant messages and returns only usage events from it.

Both behaviors were proven with a throwaway characterization test before proposing anything:

- live accumulation produces `...smokes públicos agora.Produção está saudável...`;
- `projectPiBackedConversationSurface` emits **one message per Pi assistant entry**.

This exposes a second defect inside this CR's own scope: live and restored presentation are not
equivalent. After a reload the same run renders as several assistant turns that already breathe,
while live it is one glued wall. Fixing only the styling would leave the divergence in place.

## Proposed Direction — awaiting Navigator decision

The comments in the evidence are not one answer. They are progress narration emitted between
tool calls (`Vou rodar os smokes públicos agora.`, `Produção está saudável na release nova.`),
followed by the comment that actually answers the Navigator. Rendering them as one undifferentiated
paragraph buries the answer inside the log.

**Recommended: a narrated trail with a distinct final answer.**

1. Restore the boundary as data. Emit a comment boundary on assistant `message_end` and model the
   turn's comments as an ordered list instead of one string. This is a truth fix, not decoration:
   the surface stops destroying information Pi already provides.
2. Give the last comment the weight of an answer, at full prominence.
3. Present the preceding comments as a quieter chronological trail, each its own block, grouped
   under one disclosure such as `N progress notes` so a long run stops flooding the reading surface.
4. Apply the same model to the restored path, removing the live/restored divergence.

Nothing is rewritten, merged or reordered, so transcript authority is preserved.

**Alternatives considered.**

- *Minimal separation only*: insert a paragraph break between comments. It fixes the gluing and
  nothing else; the surface stays a wall of running prose, which is the part the Navigator called
  uninviting.
- *Chronological interleaving of comments with their Agent Actions*: the most informative option,
  since each comment narrates the action beside it. It is deliberately not recommended here because
  it would reverse the semantic grouping approved in RS011 (`Agent Actions` → `System Surfaces` →
  `Agent Comments`). That reversal is a Navigator decision, not a side effect of a continuity fix.

## Acceptance

- Consecutive Agent Comments no longer feel glued together.
- The design does not manufacture new messages or alter transcript order.
- Copy/action affordances remain clear.

## Exclusions

- No summarization or rewriting of agent content.
- No change to Pi transcript authority.
