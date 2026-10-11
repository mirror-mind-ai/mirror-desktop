[< RS016](index.md)

# CR146: Stop a Recovered Turn from Being Stored Twice

*Renamed 2026-10-11. The original title, ~~Stop Recovery from Asking the Question Twice~~, asserted a
symptom the Navigator does not have.*

**Status:** captured
**Driver:** —
**Delivery:** —

Found on 2026-10-11 by the restart experiment in CR145, which recovered an answer and damaged the
transcript doing it.

## Correction before anything else

I wrote that the Navigator sees their question twice. **They do not.** They scrolled up, twice,
including after a further restart, and the transcript reads correctly: one question, one answer.

I asserted a screen symptom from a file reading. `ConversationTranscript` applies **no** filter for
empty or duplicate messages, so a four-message state would render as four. The displayed
conversation therefore is not the stored one, and the defect is the divergence — not the symptom I
claimed.

**The file is not the screen.** This is the third time this session I over-read a durable artifact:
a truncated JSON field, a question that could not discriminate, and now a stored record read as a
rendered one.

## Friction

~~A turn whose process vanished was recovered after a restart. The answer came back. But the
conversation durably reads:~~

A turn whose process vanished was recovered after a restart. The answer came back and **the screen
is correct**. The stored conversation is not. It holds:

| # | Role | Size | |
|---|---|---|---|
| 1 | user | 353 chars | the prompt |
| 2 | assistant | **0 chars** | the placeholder written at admission |
| 3 | user | 353 chars | **the same prompt again** |
| 4 | assistant | 65,474 chars | the answer |

Messages 0 and 2 carry **identical content hashes**. Message 1 is the empty placeholder. The ids
say where each came from: `user-2026-10-11T…` and `assistant-2026-10-11T…` are the renderer's,
written at admission; `pi-f50e7acb` and `pi-491588d7` match entry ids in the Pi session file.

Written at `11:24:21` — by the most recent restart, so this is what the app stores *now*, not a
leftover from the first one.

## What is established, and what is not

**Established.** The stored conversation has four messages with a duplicated user turn. The
transcript filters nothing. The Navigator sees two. `projectPiBackedConversationSurface` rebuilds
the surface from the Pi session and binds Pi entries to harness messages through
`reconciliation.turns`, and **this turn's `pi` evidence is `{state: "pending"}`** — no
`userEntryId`, no `assistantEntryId` — so no binding existed to match the Pi entries to the
placeholder waiting for them.

**Not established.** Which write path produced the four-message file, and why the projection the
renderer displays contains two. Those are the same question from both ends and the investigation
should answer it once.

`dedicated-journey-conversations/mirror-desktop/threads/desktop-thread-mirror-desktop-18dd7a36acc7f288/generation-1.json`,
4 messages, 69,473 bytes, written `11:08:25`, twelve seconds after launch.

## Desired Outcome

A recovered turn fills the place that was held for it. The Navigator's question appears once.

## First Investigation

1. Establish why stored and displayed diverge — which of the four
   `projectPiBackedConversationSurface` call sites produced the persisted four, and what the
   displayed two come from. **This is the whole CR**; the rest follows from the answer.
2. Establish whether the binding can be made. The placeholder exists and the Pi entries exist; what
   is missing is `turn.pi.userEntryId`/`assistantEntryId`, never written because the turn never
   committed. Ask whether recovery should write that evidence before projecting, which would make
   the binding work and the duplicate never occur.
3. Decide whether a divergence between stored and displayed should be **visible**. The project's
   standing rule is to show a divergence rather than hide it, and here the store is silently wrong
   while the screen is silently right — the dangerous polarity, because nothing prompts a repair.
4. Decide what happens to the record already duplicated on this profile. **Forward-only is the
   likely answer** and should be said rather than assumed.
5. Establish whether this explains the catalog reporting `messageCount: 0` for a file holding four.
   The catalog was not rewritten at either restart.

## Boundaries

Not a change to recovery's decision to recover. The content route works, the screen is correct,
and both were the valuable findings. This is about the record disagreeing with them.
