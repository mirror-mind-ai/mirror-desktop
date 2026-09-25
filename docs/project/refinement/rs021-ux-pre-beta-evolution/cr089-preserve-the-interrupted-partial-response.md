[< RS021](index.md)

# CR089: Preserve the Interrupted Partial Response

**Status:** captured
**Driver:** —
**Delivery:** —

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
