[< RS025](index.md)

# CR166: Recover This Turn Does Nothing on a Turn Still Running

**Status:** in_progress
**Delivery:** `main` (`11f8b96`)
**Driver:** @alissonvale
**Criterion half:** **exit**

## Friction

Field, 2026-11-01, the same turn as [CR165](cr165-a-turn-after-an-unanswered-request-never-settles.md):
the surface said *"This turn has already finished … Recovering brings the answer back into the
conversation"* and offered **Recover this turn**. The Navigator clicked it; nothing happened. The
journal record stayed at revision 2, `running`, and `mirror-append-recovery-skips.jsonl` gained no
entry, so the native recovery for `Admitted | Running` records
(`reconcile_pi_backed_mirror_delivery_debt`, CR128) either was not reached or refused without
recording.

## What Is Known

- The offer comes from CR160's `journal_never_heard` shape: the session's leaf is a finished answer
  after the record was admitted while the journal still says `running`.
- The button runs `recoverPostTerminalPersistence`, which returns silently when the renderer believes
  native execution is active in the Journey, and otherwise converges delivery.
- Which of these happened is not established. The preserved state is in
  `/private/tmp/5c2-stuck-finishing`.

This is RS025's criterion failing in the field: an exit is offered and does nothing. Once CR165
ships, this shape should become rare, which makes it harder to observe, not less wrong.

## Diagnosis (2026-11-01, after the cutover, Navigator's word)

Read in code against the preserved state; not reproduced live.

- **The native recovery was not reached for this turn.** `mirror-append-recovery-skips.jsonl` of
  `ensaio-5c-2` holds skips for earlier runs (the last, `agent-run-…14:48:00.358Z`,
  `request_open`, 14:54:05Z) and none, ever, for the stranded `agent-run-…14:54:49.973Z`. The skip
  log does suppress a verdict equal to that turn's previous one (`recovery_skip_is_new`), but this
  turn had no previous one, so a native attempt that failed would have been recorded.
- **Not a live lease.** When Pi exits, the registry is terminalized before the journal is touched
  (`terminalize` sets `Finalizing` and a terminal state), so `is_active_execution` is false even
  when the journal transition then fails ("native lease retained").
- **The renderer returned on a guard, silently.** The notice is offered while the turn is believed
  streaming **or** finishing (`deriveStrandedTurn`), and `recoverPostTerminalPersistence` returned
  with no trace when a recovery was already in flight, occupancy was not yet known, native execution
  was active, or a runtime entry of the Journey was still streaming. Which of these fired cannot be
  told after the fact, because none of them said. The likeliest are an automatic recovery still in
  flight or a runtime entry still believed streaming.

## First Half: the Exit Says What It Did (`11f8b96`)

- `src/app/postTerminalRecoveryGate.ts` names the four guards (`postTerminalRecoveryRefusal`), in
  the order they always ran; the guards themselves are unchanged (CR115, CR116, CR138).
- `recoverPostTerminalPersistence` returns `refused | converged | failed`; its other callers ignore
  the value, as before.
- Under **Recover this turn** the notice now says which guard held recovery off, why it failed, or,
  when it ran and the same turn is still stranded, that the turn's record stayed open and where the
  reason is recorded.
- Spec `cr166RecoverActsOrSaysWhy.test.ts` (11 tests) failed first (no module). Five mutation
  controls, each applied and failing: refusal returned bare, guard order swapped, message not
  rendered, "still open" never said, the in-flight guard removed. Two older source tests re-aimed
  to the new form of the occupancy guard, same claim. Vitest 295 files / 2,461 tests; `tsc` clean.

## Owed

- **Field check:** in a build carrying `11f8b96`, the next time the notice appears, pressing the
  button produces a sentence. After CR165 the shape is rare, so this may wait.
- **Second half, decided by that sentence:** if it names `renderer_streaming` or
  `recovery_in_flight`, the exit should act in that state (the session's finished leaf already
  proves the turn ended); if recovery ran and the record stayed open, the native attribution is the
  next place to look.
