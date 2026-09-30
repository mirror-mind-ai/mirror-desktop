[< RS021](index.md)

# CR089: Preserve the Interrupted Partial Response

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr089-preserve-interrupted-partial-response`

## Problem

Cancelling a turn that has already rendered part of the agent's answer discards that answer
completely. The Navigator sees prose appear, decides the direction is wrong or the answer is
already sufficient, cancels — and the conversation loses everything that had arrived.

The expected behaviour is the opposite: what already arrived is real work the Navigator
already read. It should stay in the Conversation, plainly marked as interrupted.

## Evidence

Read-only inspection of the Dev app data for a cancellation performed on 2026-09-25.

Journey `builder-mode-evolution`, generation 2, run `agent-run-2026-09-25T03:48:11.314Z`:

- The persisted projection keeps the turn with `pi.state: "failed"` and
  `failureCode: "turn_journal_cancelled"`, and its `harness.assistantMessageId` is
  `assistant-2026-09-25T03:48:11.314Z`.
- No message with that id exists in the projection. The assistant content is gone.
- The Pi session holds the user entry for the cancelled run at `03:48:13.074Z` but **no
  assistant entry at all**. The next assistant entry, at `03:48:35.009Z`, belongs to the
  following turn.
- The cancelled turn's user message also lost its harness identity: it reappears as
  `pi-e59ea163` rather than `user-2026-09-25T03:48:11.314Z`, because it was rebuilt from
  the Pi entry without a binding.

## Diagnosis

Two layers combine, and only the second is ours to decide.

**Pi does not persist partial assistant output on cancellation.** The session JSONL contains
the user entry and then nothing for that run. Since RS018, Pi JSONL is the transcript
authority.

**The Desktop surface rebuilds messages exclusively from Pi entries.**
`projectPiBackedConversationSurface` constructs a fresh `messages` array by iterating Pi
session entries; any message without a Pi counterpart cannot survive the next reprojection,
which happens on Journey hydration. So Desktop-only content is structurally unable to
persist, regardless of what the cancellation path does.

Notably the live cancellation path already *intends* to keep partial text: it filters the
assistant message out only when `content.trim().length === 0`. The intent exists and is
defeated downstream.

The real question this CR must answer explicitly is therefore an authority question, not a
rendering one: **may the Conversation surface contain a message that Pi's transcript does
not contain?** RS018 said Pi is the transcript authority and Desktop projections are
rebuildable views. A partial interrupted response is content that Pi will never hold. Either
this CR defines a narrow, explicitly-marked exception to that rule, or it accepts that the
partial answer cannot survive and closes as `rejected` with that reasoning recorded. Both
outcomes are legitimate; smuggling an exception in without naming it is not.

## Expected Behavior

Cancelling mid-response keeps what already arrived, presented as an interrupted fragment
rather than a complete answer. The Navigator can read it, copy it and continue from it. The
Conversation never implies the agent finished, and never re-sends or resumes anything.

## Proposed Scope

- Decide and record the authority question above before any implementation.
- If an exception is granted: persist the partial assistant text in the durable Desktop
  projection, and teach the Pi-backed surface projection to retain a Desktop-only message
  that belongs to an interrupted turn and has no Pi counterpart, instead of dropping every
  message it cannot find in the session.
- Mark the fragment visibly as interrupted in the transcript, using the interrupted turn
  evidence already present (`pi.state: failed`, `turn_journal_cancelled`).
- Decide what the fragment means for the next turn's context. It is not in Pi's session, so
  the agent does not see it; the UI must not imply otherwise.
- Investigate the related identity loss: the cancelled turn's user message reappears under a
  synthetic `pi-` id and loses its harness binding. Confirm whether one fix covers both or
  whether that deserves its own CR.

## Acceptance

- Cancelling after partial output keeps the fragment visible in the Conversation, both
  immediately and after Journey navigation and app restart.
- The fragment is unmistakably presented as interrupted, never as a finished answer.
- An empty cancellation — no output arrived — still leaves no assistant message.
- No recovery action runs the agent again, re-sends, or resumes the cancelled run.
- The authority decision is recorded in this document and, if it changes the contract, in
  `docs/architecture/terminal-aligned-conversation-authority.md`.

## Exclusions

- No writes to Pi JSONL, and no synthesis of Pi entries that Pi never produced.
- No change to cancellation, lease or journal semantics.
- No backfill of partial responses already lost.

## Dependencies

Independent of CR086, CR087 and CR088, which are closed. It touches the same cancellation
flow CR088 corrected, so it should land on a baseline that already contains CR088.


## Navigator Selection — 2026-09-29

After accepting CR083, the Navigator explicitly pulled CR089 as the next RS021 focus and
authorized local investigation and implementation on the delivery branch above. The authority
question remains open and must be decided before implementation: whether a partial interrupted
response may exist as a narrowly marked Desktop projection despite not existing in Pi's transcript.

Push, merge, publication, release, production mutation and any change to Pi JSONL authority remain
separate Navigator decisions.

## Characterization — 2026-09-29

Read-only inspection of nine real cancellations across the Dev turn journals, cross-checked
against the Pi sessions and the persisted projection. The result corrects this document's own
framing: this is not one authority question, it is three distinct losses, and only the third
needs an exception.

**The operations survive in Pi. All of them.** For `agent-run-2026-09-24T16:30:03.110Z` the
session holds the user entry, three `assistant` entries carrying `toolCall` (name, arguments,
model, usage) and their three `toolResult` entries. Across the nine cancellations, five had real
tool work — 1, 2, 3, 5 and 15 calls. Nothing of that was lost by Pi.

The next turn's user entry has the cancelled run's last `toolResult` as its `parentId`. Those
operations are therefore inside the agent's own context chain, which reverses this document's
assumption that the interrupted material is invisible to the agent. That caveat holds for the
prose, not for the operations.

**Loss 1 — live evidence is orphaned.** `App.tsx` removed the assistant message when its content
was empty, then attached the terminal action evidence keyed by that same
`harnessAssistantMessageId`. `terminalAgentActionEvidence.ts` validates the evidence against the
*turn record* rather than the message, so the write succeeded silently into a key nothing could
reach.

**Loss 2 — restored operations are discarded by a reset.** In `piBackedConversationSurface.ts`
activity blocks accumulate in `pendingBlocks` and are only flushed into `reconstructedAgentActions`
by an assistant entry *with visible text*. A cancelled run never produces one, so the next `user`
entry reset the buffer and destroyed the record.

**Loss 3 — only the in-flight prose is unrecoverable.** Narration Pi already committed is its own
entry with text and survives as a message; one of the nine cancellations had exactly that. What
Pi never wrote is the sentence still streaming at the moment of cancellation.

Correction to the Proposed Scope: the identity investigation listed there concerns only the lost
harness binding (`pi-<entryId>` instead of `user-<timestamp>`). The raw authority preamble is not
part of it — `main.rs` splits the envelope at `\n\nUser request:\n`, so CR087 already delivers a
clean visible request.

## Phase 1 — Restore the Operations (Navigator-approved 2026-09-29)

No authority exception is required. The operations are derived from Pi entries plus the turn record
that already exists, so the projection stays a rebuildable view exactly as RS018 requires.

An interrupted run has no assistant text to anchor its operations, so the surface now projects an
explicit interrupted agent turn anchored to the first Pi entry that performed work. Its content is
empty: nothing the agent did not write is invented. The anchor is only projected when a turn record
with `pi.state: failed` supports it, so an interruption is never claimed without evidence, and its
status distinguishes a cancellation from a provider failure by failure code.

The live path keeps the assistant message of an interrupted turn when the run performed work, so
the terminal evidence is no longer orphaned and the work stops vanishing at the moment of
cancellation.

### Validation

- `npx vitest run`: 195 files, 1260 tests green.
- `npx tsc --noEmit`, `npm run build`, `npm run roadmap:check`, `git diff --check`: clean.
- Real-data check through the production projection, with a throwaway harness since removed: the
  three cancellations recorded in the `mirror-desktop` generation-1 session were recovered as
  `cancelled` anchors with 15, 1 and 3 operations — matching counts measured independently from
  the raw Pi entries.
- The 15-operation run recovered zero reasoning summaries. That is correct rather than a gap: its
  `thinking` blocks carry an empty string and only an encrypted `thinkingSignature`.

Known coverage gap, recorded rather than hidden: the live cancellation branch is covered by
source-inspection assertions in `journeyRuntimeIntegration.test.ts`, not by behavioral tests. That
is the same class of coverage that made the first CR085 investigation land on the wrong layer.

Phase 1 changes what is shown for cancellations already on disk, because the projection is derived
from Pi. That retroactive effect is intended: it is the audit history returning.

## Phase 1 Correction — 2026-09-29

The Navigator reported Phase 1 as validated. Inspecting the validation run itself contradicted the
report, so the report was not accepted.

Run `agent-run-2026-09-29T13:00:19.340Z` performed three tool calls (`bash`, `read`, `read`), each
narrated by its own committed comment. Projecting that real session through the production surface
recovered only **one** of the three operations, and presented the last note as the turn's answer.
Two defects, both inside Phase 1's approved scope:

**Operations without reasoning were discarded.** `reconstructAgentActionProjection` returns nothing
when an entry carries no `thinking` text. Only the first step of that run exposed reasoning, so the
other two operations vanished. The guard is pre-existing and correct for completed turns, where the
reconstruction is a convenience; for an interrupted turn the operations are the audit record.

**A cancelled run's last note was presented as its answer.** CR083's structural rule — the last
assistant message of a turn is the answer — is false when the turn was interrupted, because no
answer was ever given. The live path already refused that promotion; the restored path did not.

Both follow from deciding per entry what is really a property of the run. The projection now closes
a run as a unit: Pi itself says whether an answer arrived, since a finished run ends with assistant
text that calls nothing further, and the turn record then confirms the interruption. Within an
interrupted run every operation is kept regardless of reasoning, and every comment stays a note.

Matching a run to its turn record is bounded by the window between the previous entry and the run's
own request, so no run borrows another's record. Session bookkeeping entries are excluded from that
bound: a `system` entry written between the turn starting and the request landing had silently
disqualified a real cancellation.

### Validation

- `npx vitest run`: 195 files, 1265 tests green. `tsc`, `build`, `roadmap:check`, `git diff --check`
  clean.
- Real-data check through the production projection, throwaway harness since removed: all four
  cancellations that performed work recovered their operations in full — 15, 1, 3, and the
  Navigator's own run with 3 — and that run's three comments are all marked as notes, with none
  promoted to an answer. The fifth cancellation performed no work and correctly yields nothing.

The earlier Phase 1 validation note in this document stands, but was insufficient: it verified
recovery only for runs whose steps carried reasoning, which hid both defects above.

## Phase 1 Homologation — 2026-09-29

Run `agent-run-2026-09-29T14:29:21.505Z` was cancelled after three tool calls (`bash`, `read`,
`read`), each narrated by its own committed comment. Every `thinking` block in that run carried an
empty string, so it exercises precisely the defect the previous round hid: under the old guard it
would have recovered nothing.

Projected through the production surface, all three operations return, and all three comments are
marked as notes with none promoted to an answer. Across the whole session the four cancellations
that performed work recover 15, 1, 3 and 3 operations, the fifth performed none and correctly
yields nothing, and completed turns are unchanged. Phase 1 is accepted.

## Phase 2 Decision — 2026-09-29

The Navigator chose **option C**: the interrupted prose is kept as evidence about the turn, not as
a message.

This answers the authority question by not raising it. RS018 makes Pi JSONL the transcript
authority and Desktop projections rebuildable views of it. A Desktop-only *message* would break
that; Desktop-only *evidence* would not, because `terminalAgentActionEvidence` has been exactly
that for several CRs — durable, persisted, consulted on every reconstruction, and never confused
with transcript content. No new precedent is created and no retention rule is added to the message
projection.

### Implementation

`TerminalAgentActionEvidence` gained an optional `interruptedFragment`. The live cancellation path
captures whatever prose had arrived and records it there; `ConversationMessage.content` is never
given a word Pi did not write.

On reconstruction, an interrupted run whose evidence carries a fragment gets an anchor of its own,
placed after the last message the agent actually committed. The anchor's content stays empty and
the fragment is exposed through a derived `interruptedFragments` map, rendered by `AgentTurn` in its
own `Interrupted` region, visually unfinished so it can never read as an answer.

An interruption that produced neither work nor prose now records nothing at all, which removes the
empty orphan evidence observed during characterization.

### Validation

- `npx vitest run`: 196 files, 1270 tests green. `tsc`, `build`, `roadmap:check`, `git diff --check`
  clean.
- Real-data regression through the production projection, throwaway harness since removed: the nine
  recovered operation records and the three empty anchors are unchanged, completed-turn
  reconstructions still project, and no fragment is invented for cancellations recorded before this
  change — those simply have none, because the prose was never captured.

Boundary kept explicit: a fragment lost before this change cannot be recovered, since Pi never held
it and no Desktop evidence recorded it.

## Phase 2 Correction — 2026-09-29

The Navigator reported the fragment working. Inspecting the run showed the capture was too wide.

Run `agent-run-2026-09-29T16:58:29.876Z` was cancelled after four narrated tool calls. All four
comments were already Pi entries, yet the evidence recorded a 408-character fragment that
reproduced them exactly. On reload that run would have shown each comment twice: once as its own
restored message, and again inside the interrupted region. Nothing was lost in that run, so nothing
should have been preserved.

The cause was reading the fragment from the live assistant message, which accumulates every comment
of the run rather than only the unfinished one. CR083 had already recovered the information needed
to tell them apart: Pi closes each comment it commits, so the prose at risk is exactly what arrived
after the last boundary. A pending boundary means the transcript is complete and there is no
fragment.

`selectInterruptedFragment` now derives the fragment from the run's comment boundaries, and the
live cancellation path uses it. A cancellation between steps records no fragment; a cancellation
mid-sentence records that sentence and nothing else.

### Validation

- `npx vitest run`: 196 files, 1273 tests green. `tsc`, `build`, `roadmap:check`, `git diff --check`
  clean.
- The three selection cases are covered directly: prose after the last boundary is kept, a closed
  boundary keeps nothing, and a run with no prose keeps nothing.

Local data note: the evidence stored by the 16:58 test still carries the over-wide fragment, so that
one historical turn renders duplicated until it is replaced. This is stale Dev data rather than
behaviour, and no released build ever wrote this field.

## Observed Behaviour — 2026-09-30

The Navigator reset the Journey context, producing generation 2 with a fresh Pi session, and
cancelled again. Run `agent-run-2026-09-30T11:30:03.771Z` narrated and committed seven tool steps
and was cancelled about 1.7 seconds after the last tool result, so once more between steps.

Inspected against the durable data and projected through the production surface:

- The stored evidence records `interruptedFragment: None`. This is the correction working: nothing
  was lost, so nothing was preserved. The previous build would have stored all seven committed
  comments and shown each of them twice.
- All seven operations are recovered, each on its own restored message, with status `cancelled`.
- All seven comments are marked as notes. None is promoted to an answer, which is correct because
  the run never gave one.
- Reasoning is recovered for the three steps whose provider exposed non-empty reasoning; the other
  four carry an empty `thinking` string and correctly yield none.

What this confirms is the absence of false positives: no duplication, and no fragment invented for a
turn that lost nothing. **The mid-sentence case is still unobserved end to end.** Every cancellation
produced since the fragment landed happened between steps, so a real unfinished sentence surviving a
reload has not yet been seen in the app. That is the remaining validation for Phase 2.

Residual, unchanged: for an interrupted turn the live evidence stays keyed to the harness assistant
message id and becomes unreachable after reprojection, so its richer aggregate projection is unused
while the per-message reconstruction carries the surface. The reconstruction is equal or better per
message, so this is recorded rather than treated as a defect.

Local data note repeated: the generation-1 evidence written by the 16:58 test on 2026-09-29 still
carries the over-wide fragment and will render duplicated on that one historical turn.

## Phase 2 Homologation — 2026-09-30

Run `agent-run-2026-09-30T11:34:31.407Z` finally exercised the case the CR was opened for. The
agent performed thirteen tool steps and was cancelled while writing its answer, not between steps.

Inspected against the durable data and projected through the production surface:

- The evidence stores a 1226-character fragment that begins `Não localizei um artefato chamado
  RS018...` and stops mid-sentence at `Portanto`. It is the answer being written, not a repeat of
  any committed comment, so the boundary-based selection kept exactly the prose Pi will never hold.
- Reprojection creates the anchor `pi-interrupted-c49d7d5d` with empty content, positioned after
  `pi-aa67c3e5`, the last comment the agent actually committed. The authority contract holds: no
  message carries a word Pi did not record.
- The fragment is exposed through the derived `interruptedFragments` map rather than as message
  content.
- Across both generation-2 cancellations, twenty operations are recovered and **no** assistant
  message is presented as an answer, which is correct because neither run gave one.
- The earlier cancellation, which lost nothing, still produces no anchor and no fragment. The two
  runs sit side by side as the positive and negative case.

Both halves of Phase 2 are therefore observed: a genuine unfinished answer survives a reload, and a
turn that lost nothing gains nothing. Phase 2 is accepted.

Phase 3 remains open: the cancelled turn still loses its harness binding and returns as
`pi-<entryId>`, visible above as `pi-c49d7d5d` in place of `user-2026-09-30T11:34:31.407Z`.

## Phase 3 — Restore the Cancelled Request's Identity (2026-09-30)

The characterization noted that a cancelled turn's request reappears as `pi-<entryId>`. That is not
cosmetic. `buildConversationTranscriptIndex` keys `turnByUserMessageId` by `harness.userMessageId`,
so a synthetic identity makes the request unable to find its own turn, and through it the steering
evidence attached to that turn never renders.

The cause is the same missing evidence as everywhere else in this CR: bindings are built from
`turn.pi.userEntryId`, which only exists once Pi execution evidence was captured. An interrupted
turn has none. But the turn record still names the request through `harness.userMessageId`, so the
identity is recoverable from evidence that already exists.

Identity has to be known when the message is built, which happens before the run it opened has
finished being read. The run-to-turn matching therefore moved into a pre-pass,
`matchInterruptedTurnsByUserEntryId`, which segments the entries by request, decides per run
whether an answer ever arrived, and matches each interrupted run to its record inside the window
between the preceding entry and the request. The main loop now consumes that result, which also
removed the window bookkeeping it had been carrying.

The assistant side is deliberately left unbound. The harness models one answer per turn while Pi
recorded several messages, so there is no honest one-to-one identity to restore there.

### Validation

- `npx vitest run`: 197 files, 1278 tests green. `tsc`, `build`, `roadmap:check`, `git diff --check`
  clean.
- Real data, generation 2: both cancelled requests now carry their harness identity and resolve to
  their own turn record — `user-2026-09-30T11:30:03.771Z` and `user-2026-09-30T11:34:31.407Z`.
- One existing assertion changed because the behaviour changed: a test that pinned the projected
  message ids now expects the request to keep its harness identity.

### Recovery is bounded by turn-record retention

Measuring generation 1 exposed a limit worth stating plainly, because it narrows a claim made
earlier in this CR. Its reconciliation now holds seven turn records, down from twenty. The
cancellations of 2026-09-11 and 2026-09-24, whose operations this CR recovered when it was
characterized, no longer have records at all, so their operations and identities are once again
unrecoverable — 10 operations recover today where 25 did a day earlier.

This is the price of never claiming an interruption without evidence, and it is the correct
trade: the alternative is inferring interruptions from Pi shape alone, which would misread runs.
But the retroactive audit benefit recorded in Phase 1 is therefore bounded by the retention window,
not permanent. Extending that window is a separate decision about journal retention, not about this
CR.

Correction to an earlier note in this document: the over-wide fragment stored by the 2026-09-29
16:58 test is gone, so no historical turn renders duplicated. That evidence entry did not survive
retention either.

## Phase 2 Defect Found on Reload — 2026-09-30

The Navigator cancelled a turn in the `builder-mode-evolution` Journey, left it and came back. The
interrupted fragment was gone. Read against the durable data, the fragment had been captured
correctly and was then discarded on load.

`parseTerminalAgentActionEvidenceMap` required every evidence key to name an existing assistant
message. An interrupted turn is precisely the case that has no such message: reprojection replaces
the harness assistant message with the Pi-derived ones, so on the next load the key matched nothing
and the evidence was dropped. The runtime attach had always validated against the *turn record*
instead, so the loader was stricter than the writer, and the only record of what the cancelled run
did and said did not survive the round trip.

The loader now accepts evidence whose turn record is interrupted without demanding the assistant
message, matching the authority the runtime already uses. Evidence no turn record vouches for is
still refused, and a non-interrupted turn still requires its message.

A second, quieter fault surfaced while reading the same file: `interruptedFragments` is derived on
every reconstruction, but the projection only replaced it when a new fragment existed, so a stale
entry survived through `...metadata` pointing at an anchor that no longer existed. The projection
now clears it, following the idiom already used in `conversationSegmentProjection`.

### What the same data confirmed

Phases 1 and 3 behaved correctly in that run. The request kept its harness identity
(`user-2026-09-30T11:53:49.301Z`) and resolved to its own turn record, both comments were marked as
notes with neither promoted to an answer, and both operations were recovered with status
`cancelled`.

### Validation

- `npx vitest run`: 198 files, 1282 tests green. `tsc`, `build`, `roadmap:check`, `git diff --check`
  clean.
- The persistence test was verified to fail without the fix and pass with it, after an earlier
  version of it passed vacuously on a fixture whose reconciliation did not parse. Fixtures are now
  built with the domain helpers rather than by hand.

## Open Finding — Steering after reload (not CR089)

In the same run, the correction sent during the turn (`foca só no primeiro arquivo`) is committed by
Pi as an ordinary user entry, so after a reload it renders as a plain new request rather than as the
`Correction during response` surface. The conversation's `steeringEvidence` was empty by then. The
correction therefore reads as a question the Navigator asked and nobody answered.

Related: a steering entry also opens a new run segment in the interrupted-run matching, because the
segmentation keys on user entries. It caused no visible harm here, but a correction is not a new
request and modelling it as one is wrong.

This is steering presentation and steering-evidence durability, not interrupted-response
preservation. Recorded here as the finding that produced it; it deserves its own CR rather than
widening this one.

## Reload Homologation — 2026-09-30

Run `agent-run-2026-09-30T12:22:24.536Z` repeated the scenario that had failed: two narrated tool
steps, a correction, a cancellation while the answer was being written, then leaving the Journey and
coming back.

Verified by parsing the persisted record exactly as a reload does and projecting the result:

- The evidence survives the load, carrying a 603-character fragment. This is the path that used to
  discard it.
- The anchor `pi-interrupted-58fc2984` exists with empty content, placed after the last comment the
  agent committed, and the fragment map points at it.
- The request keeps its harness identity `user-2026-09-30T12:22:24.536Z` and resolves to its own
  turn record.
- Both comments are marked as notes, with neither promoted to an answer.
- Operations recover with status `cancelled` for both cancelled runs in that session.

All three phases are now observed surviving a real reload. The fragment of the earlier
`agent-run-2026-09-30T11:53:49.301Z` run stays lost: its evidence was discarded before the fix
existed, and Pi never held it. Its operations still recover, because those come from Pi.

The steering finding recorded above is captured as CR097 and is not part of this CR.

## Closure

CR089 is closed after all three phases were implemented and homologated. The final reload test
confirmed that the interrupted fragment, anchor, turn identity, comments and reconstructed actions
survive leaving and re-entering the Journey. The retention-window limitation and the two declared
residues remain part of the result; neither is hidden as an implementation gap.
