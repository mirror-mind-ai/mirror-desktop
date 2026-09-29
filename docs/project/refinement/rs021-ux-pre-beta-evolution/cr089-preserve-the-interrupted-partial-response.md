[< RS021](index.md)

# CR089: Preserve the Interrupted Partial Response

**Status:** in_progress
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
