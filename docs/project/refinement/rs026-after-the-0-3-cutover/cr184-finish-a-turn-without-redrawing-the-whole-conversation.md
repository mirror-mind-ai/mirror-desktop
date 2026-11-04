[< RS026](index.md)

# CR184: Finish a Turn Without Redrawing the Whole Conversation

**Status:** done
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02. When the agent finishes, the Conversations area flashes
hard, as if the whole conversation were drawn again.

## Hypothesis (to measure)

At settlement the conversation shown is replaced by the settled one, and the message list does not
keep its elements: new identities (streamed ids against settled ids) or a reload of the persisted
projection remount every message. A recording of the frames at the end of a turn and a React render
profile come before any change.

Related, not the same: [CR157](../rs027-re-examine-the-older-open-work/cr157-stop-moving-the-whole-conversation-through-every-settlement.md)
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

## Check (2026-11-03, rehearsal at production's size)

The remount is gone: no `inspect_local_references` at all, no layout over a second, longest task
1.5 s against 12 s. The acceptance's "no task over a second" is **not** met yet: the remaining
stalls (0.8–1.5 s, four of them) are each the renderer parsing a 34 MB read of the projection, of
which a turn makes nine. See the measurement record. Next: stop reading the whole projection where
the renderer already holds it.

## Second Repair: the Reads (`1ada90c`, 2026-11-03)

A turn read the 34 MB projection eight times, and the renderer parsed each on its main thread:

| read | for | now |
|---|---|---|
| before Send | the metadata the staged turn is built on, attachments included | **kept** (needs the bodies) |
| before each of four saves | keeping the history outside the loaded chapter (CR114) | gone: the native save does it, it already reads the file |
| pre-frontier evidence, twice | identity and the current turn | metadata only |
| post-frontier receipt | identity and the turn ledger | metadata only |

- `preserve_durable_conversation_history` in `main.rs` is CR114's rule, case for case (the TS
  function and its tests were ported and removed). A save now sends only the surface.
- `load_dedicated_journey_conversation_metadata` returns identity and reconciliation with no
  messages. `appendAndAcknowledgeProjection` returns the projection it was given with the durable
  commitments, since its read no longer holds bodies; the post-frontier native merge already took
  the stored messages, not the payload's.
- Spec `src/tests/cr184ProjectionReads.test.ts` and six Rust `cr184_*` tests, failing first. Seven
  mutation controls, each caught. Guards re-aimed: `workingSetAuthorityIndependence` (durable, now
  metadata), `currentSegmentWorkingSet` (one native call), the command census 105 → 106.
- Suites: TS 2,502, Rust 463.

Check owed: the same rehearsal and timeline; one read of the projection per turn, no task over a
second at the end of a turn.

## Second Check (2026-11-03)

One full read per turn instead of nine; no task over a second after the lease is released (longest
0.75 s); the remount stays gone. One task of 1.0 s remains during the turn. The remaining stalls are
the saves, still 28.2 MB each because the renderer carries the action evidence of all 475 turns of
the generation (28.4 MB) while showing 73 messages. Next candidate: keep in the renderer only the
evidence of the loaded window and let the native save preserve the rest, as it now does for
messages.

## Third Repair: the Action Evidence (2026-11-03)

- `projectPiBackedConversationSurface` keeps only the evidence of the messages it puts on the
  surface. The transcript never drew any other (`ConversationTranscript` looks evidence up by the
  message it renders).
- `preserve_durable_conversation_history` keeps the stored evidence of every message outside the
  window; the window owns the evidence of its own messages, and evidence it brings for a message
  not yet on it (an interrupted turn) wins over the stored.
- Loading earlier chapters reads the stored projection once, on that request, and reprojects with
  the stored evidence underneath the surface's.
- Spec: two more cases in `cr184ProjectionReads.test.ts`, three more Rust `cr184_*` tests. Five
  mutation controls, all caught (one survived first; its test was strengthened).
- Suites: TS 2,504, Rust 466.

Check owed: the save payload should fall from 28.2 MB to the window's size.

## Third Check (2026-11-03): Acceptance Met

Same rehearsal (`ensaio-cr185`), one turn, 01:40:16Z to acknowledged 01:42:01Z; fourth timeline.

| per turn | first recording | after the reads | after the evidence |
|---|---:|---:|---:|
| save payload | 32.6 MB | 28.2 MB | **1.08 MB** (75 messages) |
| full reads of the projection | 9 | 1 | 1 (before Send) |
| longest task | 12.0 s | 1.0 s | **0.21 s** |
| tasks over 0.3 s | many | 3 | **0** |

The stored projection kept everything the surface no longer carries: 6,196 messages, 476 evidence
entries, 499 turns, no duplicate ids, first message 2026-09-20. The native saves still take 3–6 s
because they read and merge the 34 MB file, but off the renderer's main thread; no frame stalls on
them. The page still draws about 8 frames per second during the turn; that is CR185.

**Shipped in:** v0.3.0-alpha.10 (2026-11-03). Checked in production on 2026-11-03: the Navigator updated, ran a turn in `mirror-desktop` and reported "Tudo parece ter funcionado perfeitamente".
