[< RS016](index.md)

# CR128: Give Back the Answer a Restart-and-Continue Strands

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The Navigator's computer restarted in the middle of a turn in the Journey `softwarezen`. The app came
back and showed the turn as interrupted, which is correct. The Navigator sent `continue`. The agent
then did the work and finished — and the Desktop has been showing **Finishing** ever since, with an
empty answer bubble.

The answer exists. It is in the Pi session, 952 characters, closed with `stopReason: stop` at
`2026-10-06T12:36:07Z`, beginning *"Verificando o estado da recuperação interrompida"* and ending
*"Recuperação concluída."* It is not in the conversation, it never reached Mirror, and the Journey
cannot start another turn.

This is a **permanent** strand, not a slow one. Recovery refuses it deterministically, and will refuse
it on every reload.

## Outcome

A turn interrupted by a machine restart and then continued settles: the answer the agent produced is
shown, delivered to Mirror, and the Journey accepts new work. A restart-and-continue does not leave
the Journey needing manual repair.

## First Investigation

### What happened, from the store

| | |
|---|---|
| Machine booted | `2026-10-06T12:29:27Z` |
| App started | `2026-10-06T12:34:30Z` |
| Interrupted run's record | `turn-agent-run-2026-10-06T12:18:21.328Z` |
| The `continue` run's record | `turn-agent-run-2026-10-06T12:34:47.097Z` |
| Both records | `phase=running`, `recoveryDisposition=resume_execution`, `revision=2`, no terminal evidence |
| Both last updated | ~41 ms and ~43 ms after creation, then never again |
| Settlement collectors opened | **none** — `settlement-timings/softwarezen.json` holds 2 records, `savedAt 12:17:13Z`, both for earlier turns |
| Pi process | none running |
| Agent's last entry | `12:36:07Z`, `role=assistant`, `stopReason=stop`, 952 chars |
| Conversation | last two turns have `pi`, `harness` and `mirror` all `pending`; `classification=commit_pending` |

So the agent ran after `continue`, worked for about 80 seconds, and finished cleanly. The journal
record never moved off `running`.

### Why recovery refuses, exactly

`recover_one_stale_journal_record` (`src-tauri/src/main.rs`) *does* handle a `running` record — its
guard is `matches!(current.phase, TurnPhase::Admitted | TurnPhase::Running)`. It projects the Pi
transcript and calls `match_unclaimed_pi_turn`, which pairs stale records against unclaimed turns and
refuses unless the counts are equal:

```rust
if stale.len() != unclaimed.len() || stale.is_empty() {
```

Replayed over the real session, mirroring the shipped legacy segmentation:

- frontier (max claimed `entryCount`): **138**
- stale records: **2** — `12:18:21.328Z` and `12:34:47.097Z`
- unclaimed turns: **1** — `entry_count` 182, `user 1d000ad3`, `assistant 5c55d124`, closed `12:36:07Z`

**2 ≠ 1**, so recovery returns `mirror_append_pi_recovery_ambiguous` and stops.

The mismatch is structural, not incidental. The interrupted run and the continued run are **one Pi
turn**: `continue` resumed the same session, and the agent closed a single exchange spanning both. Two
journal records can never pair 1:1 against one projected turn, so no number of reloads will change the
outcome.

**This is the debt named when CR126 was closed**, under a cause nobody had anticipated. CR126 recorded
that recovery cannot segment a run whose shape yields a different turn count than the journal expects,
left `match_unclaimed_pi_turn` on the legacy projection deliberately, and recorded the ambiguity as
"pre-existing, not introduced here, and unfixable without a baseline the recovery path does not have."
That debt has now produced a live production strand, and the trigger is not a correction but a
restart-and-continue.

### Why the surface says Finishing

`deriveComposerTurnStatus` (`src/app/composerTurnStatus.ts`) returns `"finishing"` when
`reconciliationBlocksInvocation` is true, and `App.tsx:1179` derives that from the reconciliation when
the dedicated thread is not ready — `classification` is `commit_pending`, which is not `in_sync`.

**Which of the two blocking paths is active is not established.** The other candidate is
`isFinalizingTurn`. `classifyDedicatedTurnState` with the last turn's `pi.state === "pending"` falls
through to `"failed"`, which `dedicatedTurnBlocksNewInvocation` does **not** block on, so that path
would not produce Finishing. Distinguishing them needs a runtime observation this read-only reading
cannot make. Either way the label is wrong in the same way: nothing is finishing, because no
settlement was ever started.

**CR116 does not cover this.** CR116 released a Journey stranded in *finalization*, under a bound on
work actually in progress. Here there is no work in progress and no settlement to bound — the strand
is a journal record that cannot be advanced.

## Acceptance

- The `softwarezen` answer closed at `12:36:07Z` is recoverable: shown in the conversation, delivered
  to Mirror, and the Journey accepts a new turn.
- A run interrupted by process death and then continued in the same Pi session settles once, against
  the single turn the agent actually closed.
- `mirror_append_pi_recovery_ambiguous` is not reachable from a restart-and-continue.
- A genuinely ambiguous case — two stale records and two unclaimed turns that cannot be attributed —
  still refuses rather than guessing. The fix must narrow the refusal, not remove it.
- Replayed against the production store, no currently recoverable record becomes unrecoverable.

## Boundaries

**Attribution must not be invented.** The reason `match_unclaimed_pi_turn` refuses is that it cannot
tell which record owns which turn. Any fix has to derive the answer from something recorded — the
run's own identity, its admitted time against the turn's entries, or a baseline — and not from a
plausible ordering. Pairing by position would be guessing.

**The surface is a separate question from the strand.** Even once recovery can settle this, a Journey
whose record cannot be advanced should not describe itself as `Finishing`. Whether that becomes part of
this CR or its own is open.

**No manual repair of the live state as part of capture.** The `softwarezen` record is evidence while
this is unresolved. Editing the journal by hand would destroy the only witness and would write an
attribution by hand — the same thing this CR must not do in code.

**Mirror's stored history is not backfilled.** The turn never reached Mirror. If the fix delivers it
late, that is delivery; writing it into the Mirror database by another route is not in scope.
