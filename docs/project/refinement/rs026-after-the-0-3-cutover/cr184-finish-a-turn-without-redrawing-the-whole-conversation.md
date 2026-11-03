[< RS026](index.md)

# CR184: Finish a Turn Without Redrawing the Whole Conversation

**Status:** in progress
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

## Measured (2026-11-02)

[cr185-output-surface-sample-2026-11-02.md](../../../update/cr185-output-surface-sample-2026-11-02.md),
the rehearsal at production's size: after settlement the 34.1 MB projection was loaded six times
(2.2–5.7 s each), one handler ran 12 s, and `LinkifiedText` asked about local paths 3,754 times in
20 s, which only a remount of the whole transcript produces. The hypothesis holds: the end of a turn
mounts the conversation again.

## Cause (2026-11-02)

`finalizeCompletedTurn` published as `settled` the projection read back from disk
(`appendAndAcknowledgeProjection` loads it, applies the receipt and returns it). Since CR114 the disk
keeps none of the maps Pi is the authority for: `chapterDividers`, `agentCommentRoles`,
`reconstructedAgentActions`, `responseModels`, `interruptedFragments`, `correctionAnchors`. The App
adopted that projection as the Conversation, so at the end of every turn nearly every message changed
shape (dividers, trails and action details gone), the transcript was mounted again, and the next
reload derived it all back. The timeline evidence matches: the 12 s React task begins as the journal
reaches `settled`, and its effects are the 3,754 `inspect_local_references` calls.

The measured surface during that turn held the whole generation (6,188 messages in every save of the
run conversation), so the remount was of everything.

## Repair

The `settled` presentation is the frontier surface the reader already has, with the Mirror
commitment the settlement added (`upgradeMirrorCommitments(projectionAtFrontier, settlement.projection)`).
`applyMirrorAppendReceipt` changes only the reconciliation, so nothing else is lost.

- Spec: `src/tests/cr184SettleInPlace.test.ts`, settling through ports that persist the way
  production does. It failed on the old code (dividers absent).
- Mutation controls, each caught: the old assignment; the frontier alone (commitment lost); the
  arguments reversed.
- Suites: TS 2,509, Rust 457.

## Not yet repaired

- The restore effect reacts to the native lease's phase (`leasePhase`, `terminalState`, guarded by
  `journeyRuntimeIntegration.test.ts`), so each lease transition at the end of a turn reads the
  34 MB projection again (three reads in the measured turn, 2.2–5.7 s each). Measured again after
  this repair before deciding anything.
- `convergeDelivery` publishes a projection rebuilt with the `complete` scope; that is the recovery
  route, not the ordinary end of a turn.

## Check (owed)

The same rehearsal (`ensaio-cr185`), the same timeline: at the end of a turn, no task over a second
and no burst of `inspect_local_references`.
