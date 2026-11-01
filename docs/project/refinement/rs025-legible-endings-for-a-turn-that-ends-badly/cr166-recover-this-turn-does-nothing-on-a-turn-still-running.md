[< RS025](index.md)

# CR166: Recover This Turn Does Nothing on a Turn Still Running

**Status:** captured
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
