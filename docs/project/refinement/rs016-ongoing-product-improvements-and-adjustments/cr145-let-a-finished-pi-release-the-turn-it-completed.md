[< RS016](index.md)

# CR145: Let a Finished Pi Release the Turn It Completed

**Status:** captured
**Driver:** —
**Delivery:** —

**Found on 2026-10-11 by CR142's own field check**, which was looking for a false positive and met
a different defect instead. The state was preserved rather than restarted past.

## Friction

A Pi process completed cleanly, produced its entire answer, and exited. Forty-five minutes later
the Desktop still believed it was running, the turn had never settled, and every escape was shut.

| | |
|---|---|
| Pi | completed, `stopReason: "stop"`, **65,474 characters**, last written `12:45:32.381Z` |
| Pi child process | **gone** |
| Turn journal | **`running`, revision 2**, no terminal outcome, no terminal evidence, last written at admission `12:43:58.223Z` |
| `settlement-timings` | **no record** — the settlement neither succeeded nor failed |
| Native registry | **still holds a live, non-terminalized lease** |
| Screen | the full answer, `FINISHING`, and a conversation marked `WORKING` |
| Durable conversation | the prompt and an **empty** assistant message |

## How the registry's state was established

Not by inspection — a release build offers no console. By **CR143's mark**, shipped the day before.
`deriveConversationWork` maps `isActivePiInvocationLease` to `working`, so a conversation rendering
`WORKING` is reporting a lease that is still `reserved` or `running` with an open terminal state.

Two surfaces on one screen disagree — the conversation says `WORKING`, the Journey says
`FINISHING` — and that disagreement is the measurement.

## Why every escape was shut

**CR132's offer declined.** `settlementAbandonmentOffer` requires `!nativeExecutionActive`, read
from the registry. The registry says the dead child is alive, so the offer for *a finishing that
will not end* is suppressed by exactly the failure it exists to rescue. The Navigator confirmed no
*Stop waiting* appeared.

**CR142's notice declined, correctly.** It appeals to the journal as the durable truth, and here
the journal is wrong in the same direction as the renderer. `deriveStrandedTurn` returns
`journal_agrees` and says nothing. The predicate is right; its oracle is not.

**CR121's failure record never fired.** A settlement that fails records why. This one did not
fail — it never finished starting.

## What is established and what is not

**Established:** every row in the table above, and that the native terminal path terminalizes the
registry *before* writing the journal and emitting `done`
(`fail_pi_process_before_completion`, and the completion path beside it). A live lease therefore
means terminalization never ran.

**Not established:** why. Pi exited cleanly, so this is not a crash the watcher could have missed
in an obvious way. Whether the renderer ever received a `done` is also unestablished — the full
answer reached the screen, so stdout flowed, and the `Finishing` display may come from Pi's own
`agent_end` rather than from the native terminal event.

**Not assumed:** that this is CR142's mechanism. They share a shape — a turn that never settles —
and differ in what is wrong. CR142: the journal knew and nobody asked. Here: **nothing durable
knows**.

## Desired Outcome

A Pi process that exits releases the turn it was running, whatever the Desktop believes — and when
it does not, something the Navigator can reach still does.

## First Investigation

1. Establish the completion path's ordering against `run_pi_process` and whoever observes the
   child's exit, and whether any branch can return without terminalizing.
2. Establish whether the renderer received `done`. If `Finishing` came from `agent_end` alone, the
   renderer's loop is still open and this is CR142's mechanism with a different display — which
   would merge the two rather than separate them.
3. Decide whether CR132's `!nativeExecutionActive` guard should be narrowed. It exists so the
   offer cannot kill a live process; it currently trusts a source that can be wrong. A guard that
   defers to a possibly-stale authority is the recurring shape here.
4. Establish whether the Pi session file is an admissible second source. It carries
   `stopReason: "stop"` and the complete text, and nothing in the renderer reads it for this.
5. Establish what a restart does. `recoveryDisposition` is **`resume_execution`**, not
   `resume_projection`, so the path that rescued CR142's turn is not the one that would run.
   **Measure before restarting**; the restart is the experiment and it is destructive of the
   registry state.

## Boundaries

No change to admission, the share, the event route or CR143's marks. CR142's repair stays as
shipped: it is correct for its case, and widening it to a case where the journal itself is wrong
is a different decision, which item 2 may settle by merging these instead.

## Narrowed by the restart experiment (2026-10-11)

The restart **refuted** the prediction that the answer was unrecoverable. It came back in twelve
seconds, projected from the Pi session file. **The content route already exists.**

What remains is precisely two things, and they are what this CR is now about:

1. **The turn cannot be released while the app runs.** The only exit is a restart, and CR132's
   offer — the designed exit — is suppressed by the stale lease.
2. **The durable record never heals.** The journal record stays `running` forever. Three
   instances exist, two of them 23 days old on thread `…18d5cf4842b669b0`, and every launch since
   has left them alone. Each permanently consumes one of 64 slots.

Item 2 raises a question the original capture did not: **is a `running` record that outlives its
process ever reclaimable?** `JOURNAL_MAX_RECORDS` is a hard bound and `UnfinishedPruning` is
`Forbidden` by CR139's fail-closed rule, which was the right call for live work and makes dead
work immortal. The ledger will reach `turn_journal_full` with slots held by turns that ended weeks
ago.

Item 2 of the First Investigation is also partly answered: the restart derived `interrupted` in
memory without writing it, so the renderer *can* tell the turn is over once the registry is
rebuilt empty. It has the conclusion and no way to record it.
