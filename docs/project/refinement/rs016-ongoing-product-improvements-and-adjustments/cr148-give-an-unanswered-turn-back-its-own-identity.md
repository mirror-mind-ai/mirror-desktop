[< RS016](index.md)

# CR148: Give an Unanswered Turn Back Its Own Identity

**Status:** captured
**Driver:** —
**Delivery:** —

Found 2026-10-12 while reading the baseline for CR146's field check — in the Navigator's own
working conversation, not in a reconstructed case.

## Friction

`dedicated-journey-conversations/mirror-desktop/threads/desktop-thread-mirror-desktop-18d5cf4842b669b0/generation-1.json`
holds 30 messages across 16 turns. Fourteen turns are `committed` and own a harness pair. **Two are
`pending`, own no stored messages at all, and their requests appear under native identities.**

| Turn | Harness ids recorded | Present among messages | What is stored instead |
|---|---|---|---|
| `turn-agent-run-2026-09-18T18:10:32.447Z` | both | **neither** | one user message, 123 chars, `pi-e41dbb8d` |
| `turn-agent-run-2026-09-18T18:42:30.306Z` | both | **neither** | one user message, 114 chars, `pi-9cfbcfb7` |

Each is a request with **no answer after it** — the next entry is another request. So these are turns
that were admitted, reached Pi, and produced nothing.

## Why neither existing route covers it

This is a third sub-shape, distinct from the two CR146 measured.

- **CR146's new route requires the run to have closed with an answer.** These closed with nothing,
  so it declines, by design.
- **CR089's interrupted route requires `turn.pi.state === "failed"`** in `selectInterruptedTurn`.
  These are `pending` — the turn was never marked failed, so the route that exists for exactly this
  situation does not recognise them.

The consequence is a **dangling turn record**: `harness.userMessageId` and
`harness.assistantMessageId` name messages that are not in the file, while the request the Navigator
actually asked sits under an identity nothing points at.

## What is established, and what is not

**Established.** The two turns, their recorded harness ids, the absence of those ids among the
messages, the single native-identity request each, and that both binding routes decline. All read
from the stored file and the two selectors.

**Not established.** Why `pi.state` is `pending` rather than `failed`. A cancelled or failed run
should have been marked, and these were not — which is the same family as CR147's silence and may
share a cause. Also unestablished: whether the admission pair was ever written and later replaced,
or never persisted at all.

## Desired Outcome

An unanswered turn's request carries the identity its turn records, so the turn record does not
point at messages that do not exist.

## First Investigation

1. Establish why these turns are `pending` rather than `failed` — whether a path exists that
   abandons a run without marking its Pi body, and whether CR147's repairs now close it.
2. Decide whether the repair belongs in CR089's selector (widening it to `pending` where the run
   produced nothing) or in a fourth route. Widening CR089 is smaller but touches shipped acceptance.
3. Establish whether a dangling harness id has any consequence beyond the record — whether anything
   reads `harness.userMessageId` expecting the message to exist.
4. Decide forward-only versus repair-on-read for the two records already in this state.

## Boundaries

Not a change to CR146's route, which declines these on purpose. Not a change to CR089's user-only
binding rule without saying so explicitly. No mutation of the Navigator's stored conversation
without them naming it.
