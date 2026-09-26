[< RS021](index.md)

# CR091: Attribute Each Response to Its Model

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr091-response-model-attribution`

## Problem

The Conversation shows what the agent answered but never which model answered. The Navigator
switches models often, sometimes several times inside one generation, and afterwards the
transcript gives no way to tell a Fable answer from an Opus one. Reading back a long
Conversation, the question "which model produced this?" has no answer in the product.

## Evidence

Read-only inspection of a production Pi session, generation 4 of the `mirror-desktop`
Journey, 1529 entries:

| Provider / model | Assistant entries |
|---|---:|
| `claude-bridge` / `claude-opus-5` | 288 |
| `openai-codex` / `gpt-5.5` | 174 |
| `claude-bridge` / `claude-fable-5-1` | 127 |
| `openai-codex` / `gpt-5.6-sol` | 46 |
| `anthropic` / `claude-opus-5` | 1 |

Five distinct provider/model pairs in a single conversation, and none of them visible in the
surface.

**The data already exists in the transcript authority.** Every assistant entry in the Pi
session carries `provider` and `model` on its message, alongside `stopReason`, `usage` and
`api`. RS018 made Pi JSONL the transcript authority, so this is the authoritative record of
what produced each answer.

**The Desktop discards it.** The native transcript inspection projects `entryId`, `role`,
`visibleText`, `nativeContent`, `timestamp`, `toolCallId`, `toolName` and `isError`. Neither
`model` nor `provider` is exposed, so nothing downstream can render them.

## Why This Is Cheap

Because the value comes from the reprojection source rather than from Desktop-only state, it
avoids the durability trap CR089 documented: a Desktop-only message cannot survive
`projectPiBackedConversationSurface`, but anything read *from* Pi entries survives by
construction. It also works retroactively — existing Conversations already hold the
attribution and would start displaying it without any migration.

## Expected Behavior

Each agent response can be attributed to the model that produced it, without clutter and
without implying anything about the current selection.

## Proposed Scope

- Expose `model` and `provider` on the inspected Pi transcript entry and on the projected
  transcript turn.
- Carry them through `projectPiBackedConversationSurface` onto the assistant message or a
  derived map, following the precedent CR077 set for reconstructed agent actions.
- Render restrained attribution in the transcript. The design decision to settle: always
  visible and muted, only when the model changes from the previous response, or behind the
  existing turn-details disclosure. Showing it on every response is the most honest and the
  most likely to become noise.
- Decide what a live, still-streaming turn shows. No Pi entry exists yet, so the live case
  needs the run's captured model from CR090; the completed case does not.
- Tests: projection carries attribution, reconstruction after restart preserves it, absence
  stays absent for entries without the fields, and the live case matches the captured model.

## Acceptance

- A completed response shows which model produced it, including in Conversations that
  already exist.
- Attribution survives navigation and restart, because it is re-derived from Pi rather than
  stored separately.
- Entries without the fields show nothing rather than a guess.
- The transcript stays readable; attribution never competes with the response itself.

## Exclusions

- No surfacing of per-message `usage` or cost; that belongs with CR079.
- No change to model selection, availability or effective-model resolution.
- No backfill or rewriting of stored projections.

## Dependencies

Independent of CR090 for completed responses. The live-turn case depends on CR090's captured
run model, since a streaming turn has no Pi entry yet.

## Related Finding

The same assistant messages carry a `usage` object with `input`, `output`, `cacheRead`,
`cacheWrite`, `reasoning`, `totalTokens` and a `cost` breakdown. That is a direct lead for
CR079, which asks why terminal Pi shows context stats the Desktop cannot. Recorded here
rather than acted on.
