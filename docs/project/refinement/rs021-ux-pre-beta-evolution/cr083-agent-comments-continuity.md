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

## Approved Direction — 2026-09-29

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

## Navigator Decision — 2026-09-29

The Navigator rejected collapsing the notes behind a disclosure, using the surface itself as
evidence: an Agent Comments section that reads well open would get worse behind a click. The
`N progress notes` disclosure is withdrawn. Nothing in the trail hides.

The Navigator also named the real distinction: the glued comments were the agent's anticipations
of what it was about to do. That intuition is adopted, but the implemented criterion is structural
rather than linguistic. A comment is a note when more work followed it in the same turn; the
comment that closed the turn is the answer. No text is interpreted, so nothing is guessed.

Distinction is carried by visual register, not by visibility: notes form a quieter connected trail,
and the closing comment keeps the ordinary weight of an answer.

## Implementation — 2026-09-29

**The boundary is recovered instead of invented.** `piProcessStream` now emits
`agent_comment_boundary` on assistant `message_end`, the event it previously consumed only for
usage. `reduceStreamedAssistantMessage` turns that boundary into a paragraph break, so the glue
disappears from the rendered surface, from copied text and from the persisted content alike.

**Comments become an ordered list.** `RuntimeProjectionState` keeps the run's comments in order,
appending deltas to the open comment and starting a new one after a boundary. Assistant text is
still never projected as an operation.

**An answer must be earned by closing the turn.** `projectAgentTurnPresentation` promotes the last
comment to `closingComment` only when the run completed. While work continues the comments stay a
trail, and a cancelled or failed run never gains an answer it did not produce — which keeps this CR
from silently deciding what CR089 owns.

**The ordinary answer is untouched.** A single comment still renders exactly as before, so the
common conversational turn sees no change at all.

**The restored path gained the same register.** `projectPiBackedConversationSurface` marks every
assistant message that did not close its turn as `trail`, per turn, and the transcript passes that
role into the presentation. Reloading no longer turns notes into a row of equal answers.

Deliberate boundary: restored multi-step turns remain separate messages rather than being merged
into one, because merging would destroy per-response model attribution (CR091) and per-step
reconstructed actions. The reading register is equivalent; the message structure intentionally is
not.

## Validation

- `npx vitest run`: 194 files, 1253 tests green.
- `npx tsc --noEmit`: clean.
- `npm run build`: green.
- `npm run roadmap:check`: READY.
- `git diff --check`: clean.

Two existing tests changed because the behavior changed, not to accommodate the patch: the Pi
`message_end` mapping now also closes a comment, and the runtime projection test that asserted
assistant text left the projection untouched now asserts what it always meant — that assistant text
is not an operation — while recognizing that the comment is kept.


## Acceptance

- Consecutive Agent Comments no longer feel glued together.
- The design does not manufacture new messages or alter transcript order.
- Copy/action affordances remain clear.

## Exclusions

- No summarization or rewriting of agent content.
- No change to Pi transcript authority.
