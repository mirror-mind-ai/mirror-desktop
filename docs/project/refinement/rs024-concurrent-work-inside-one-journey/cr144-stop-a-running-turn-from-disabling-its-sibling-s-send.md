[< RS024](index.md)

# CR144: Stop a Running Turn from Disabling Its Sibling's Send

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs024-cr144-stop-a-running-turn-from-disabling-its-sibling`

**Reported by the Navigator from the field**, 2026-10-10, during CR143's verification: the working
mark worked, *"mas o app não me deixou mandar o D1B enquanto o D1A não terminou (o botão de enviar
não habilitou)."*

## Friction

RS024's Desired Outcome was **unreachable from the Navigator's hands**, and the Story had already
been recorded as reaching its Acceptance Horizon.

`selectJourneyRuntime` fell back to the Journey whenever its exact key missed — including when the
caller knew its thread and that thread simply had not run yet in this session. A conversation that
has never run is precisely the one a Navigator opens to start a second turn, so it was handed the
live sibling's entry. `sendBlocked` read true, `sameConversationExecutionActive` read true,
`conversationAvailability.canSend` read false, and **Send never enabled** — with no sentence,
because this path is not admission and has no surface.

## Why the field said it worked

**The first field run passed by an accident of ordering I wrote myself.**

D0-CAL was added to the sequence to measure execution time, and it ran in *"New conversation"* —
the same conversation D1B used. It left a settled runtime entry under that thread's key, so the
exact lookup matched and the fallback never ran. The three concurrent turns recorded on 2026-10-10
at 23:11 were real: the registry, the journal and the event transport genuinely carry concurrent
work, and that evidence stands. What did not follow is the conclusion that a Navigator can reach
that state from a cold list, and that is the conclusion the Horizon was written on.

Proved by throwaway probe before anything was changed, in both directions:

| Ordering | Runtime entries | `sendBlocked` on the sibling |
|---|---|---|
| Cold — only the running conversation has an entry | `["mirror-desktop\|thread-A"]` | **`true`** |
| Warm — the calibration turn settled in the sibling first | `["…thread-B", "…thread-A"]` | `false` |

## Why no test caught it

CR140 bounded the fallback with a case named *"keeps the exact key winning over the fallback
whenever the caller knows its thread"*. It uses two threads that **both have entries**, so it
asserts the half that cannot misfire. The case where a caller knows its thread and the key does
*not* exist — the only case where a known thread can reach the fallback — was never asked.

**The whole suite of 1,963 tests passed unchanged when the fallback was narrowed**, which is the
measurement of that gap rather than an argument about it.

## What changed

One condition in `selectJourneyRuntime`: the Journey fallback runs only when
`workspace.threadId === null`. A caller that knows its thread gets its own workspace's answer, and
for a thread with no entry the honest answer is an empty runtime.

CR140's two measured callers both pass `null` — `selectJourney` (`App.tsx:4462`) asks about a
Journey whose thread is unresolved, and the selected workspace carries `null` before its catalog
loads — so narrowing removes the defect and changes nothing either of them does.

**CR141 drew this exact line in `selectWorkspaceNativeLease` and this function was left behind.**
Two functions answering the same question disagreed about it. A source guard now pins the
agreement, so drifting apart again fails a test rather than a field run.

## Acceptance

- With one turn running, selecting a sibling conversation that has never run reports that
  conversation as idle, and Send is available. ✅ `workspaceGrainedRuntime.test.ts`
- The conversation that *is* running still blocks its own Send. ✅
- A caller with no thread still receives the Journey's single live entry. ✅
- Both workspace selectors fall back only on an unresolved thread, asserted against source. ✅
- **Field: a cold D1 — no calibration turn in either conversation — admits the second send.** Owed.

## Delivery Record (2026-10-10)

Diff: 2 files, +106/−4. **`src-tauri` diff 0 lines.** Five tests added, three of which fail against
the unchanged code, which is the record that the defect was real rather than argued.

Gates: `tsc` 0; renderer **254 files / 1,968 tests**; `cargo test` **285 passed / 3 ignored**,
unchanged; `npm run build` clean; `roadmap:check` READY.

### A judgment call, stated so it can be reversed

This was delivered rather than captured and queued. The reasoning: RS024's own committed outcome
was failing, the Navigator had asked for the Story to be finished before the release, and they were
blocked mid-verification. Treating it as completing committed work rather than new scope is **my
call, not theirs** — if it should have been a separate decision, this is one commit to revert.

## Boundaries

No change to admission, the registry, the event transport, the refusal sentences or CR143's marks.
The silence of this refusal is **not** repaired here: `sameConversationExecutionActive` has no
surface, which is the same gap already recorded for `recovery_inspection` under CR099.
