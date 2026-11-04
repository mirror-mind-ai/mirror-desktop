[< RS025](index.md)

# CR165: A Turn After an Unanswered Request Never Settles

**Status:** done
**Driver:** @alissonvale
**Line:** 0.3 (`main`); the same code is on `release/0.2`
**Criterion half:** neither directly; it removes a cause of a *Finishing* with no working exit
([CR166](../rs027-re-examine-the-older-open-work/cr166-recover-this-turn-does-nothing-on-a-turn-still-running.md) carries the exit)

## Friction

Field, 2026-11-01, CV-010 phase 5c item 1, User-channel build `0.3.0-alpha.2` on the rehearsal home
`ensaio-5c-2`, Journey `mirror-desktop`. Two rehearsals in a row: the agent answered, Pi wrote
`stopReason: stop` and exited, and the turn stayed at *Finishing* with *"This turn has already
finished … Recover this turn"*. The journal record never left `running` (`admitted → running`
only).

## Mechanism

Reproduced on copies of the field files (`/private/tmp/5c2-repro`, throwaway test, not committed).

1. Before a run, `latest_pi_leaf_entry_id` records a baseline: the assistant entry of the last
   *complete* turn, not the session's actual leaf.
2. The carried session ended on a request with no answer (`a75e55a8`, "vai", 14:48:39Z) and the
   agent's first tool call, because the 0.2 state was cloned mid-turn.
3. The run projection starts after the baseline and takes the first request it meets, so the new
   run was attributed to that older request: `started_at` 14:48:39Z, before the record's
   `created_at` 14:54:49Z.
4. `has_current_completion_evidence` requires `started_at >= created_at`, so `TerminalDurable /
   completed` was refused as `turn_journal_transition_invalid`, on the settle path and again after
   Pi exited. Nothing else ever moves the record.

With the baseline taken as the actual leaf (`ee0f4769`) the run starts at its own request
(`257d9bee`, 14:55:27Z) and the same transition succeeds.

**Reach.** Any turn interrupted after Pi recorded its request (a quit, a crash, a mid-turn copy)
leaves its Journey unable to settle the next completed turn, in either line. Of the 47 sessions in
the 0.2 state only this one had the shape, and only because of the mid-turn clone.

## Change

`latest_pi_leaf_entry_id` returns the session's actual leaf (the last entry of the active branch).
On a healthy session that entry is the last complete answer, so every healthy turn keeps the
baseline it had.

## Verification

- `a_run_after_an_unanswered_request_is_evidenced_from_its_own_request`: the field shape; failed
  before the change (`left: Some("pi-asst-0")`, `right: Some("pi-cut")`).
- `a_healthy_session_keeps_the_baseline_it_always_had`: the negative case RS025 requires; passes
  before and after.
- Mutation controls: the old baseline (A) fails the field test only; the entry before the leaf (B),
  none (C) and the first entry (D) fail both.
- `cargo test --locked`: 434 passed, 10 ignored.
- **Field check passed (2026-11-01, 12:31):** a User build of `ebac6c1` on the same rehearsal
  home (`ensaio-5c-2`), same session shape. The Navigator's new `mirror-desktop` turn settled on its
  own (`agent-run-2026-11-01T15:31:00.101Z`: `settled / completed`, started 15:31:36Z after the
  record's 15:31:00Z). The turn stranded at 11:55 also reached `settled / completed` after the
  relaunch, evidenced from its own request (14:55:27Z).
