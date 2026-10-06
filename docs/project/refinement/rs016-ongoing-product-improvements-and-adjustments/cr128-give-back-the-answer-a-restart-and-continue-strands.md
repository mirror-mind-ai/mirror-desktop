[< RS016](index.md)

# CR128: Give Back the Answer a Restart-and-Continue Strands

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr128-restart-and-continue-recovery`

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

## Plan (2026-10-06)

### The rule

The matcher was never wrong about what it could see. It paired stale journal records against
**closed turns**, and a closed turn is the only thing the legacy projection produces. A run that died
before closing produces no closed turn, so the one thing a restart leaves behind is invisible to it.

Every run that got as far as writing its prompt owns exactly one **request** on the session: the user
entry it wrote. Pair stale records against unclaimed requests instead, in admission order, and each
record gets the verdict the session actually supports:

- its request was answered → recover it as `TerminalDurable` with that turn, exactly as before;
- its request was never answered **and a later request exists on the same session** → the run that
  owned it is over, because Pi appends a new request only after the previous process ended →
  `Interrupted`, a transition the journal has permitted from `Admitted | Running` all along and that
  nothing native ever took;
- its request was never answered and nothing follows it → **named, not judged**:
  `mirror_append_pi_recovery_request_open`. Nothing on the session proves that run is over, and
  another instance sharing the data directory could still be running it. The Navigator's next
  request on that session turns it into the case above.

Count mismatch still refuses as `ambiguous`; a request asked before its record was admitted, or a
reply committed after the next record's admission, still refuses as `frontier_mismatch`. The refusal
is narrowed, not removed.

### Why this is not the baseline CR126 lacked

CR126 established that recovery cannot derive *run boundaries* without a baseline leaf. This CR does
not derive them. It needs only the fact that a request exists and whether a closed turn starts at
it — both of which the legacy whole-session projection already yields. Attribution rests on recorded
admission times and recorded entry timestamps, never on position alone.

### Slices

- **D1** — `attribute_stale_pi_record` replaces `match_unclaimed_pi_turn`; `project_unclaimed_pi_requests`
  lists requests after the claimed frontier; `StalePiAttribution::{Closed, Interrupted}`.
- **D2** — `recover_one_stale_journal_record` branches on the attribution; `interrupt_stale_journal_record`
  takes `Admitted | Running → Interrupted` under the journal lock, re-reading the record first.

### Files

- `src-tauri/src/main.rs` — D1, D2, three new Rust tests, two adapted.
- `src/tests/restartAndContinueRecovery.test.ts` — 8 wiring guards.
- `src/tests/correctedTurnRequestIdentity.test.ts` — the CR126 guard that pinned the old matcher now
  pins what is still true: recovery stays on the legacy segmentation and does not use the run projection.
- `scripts/diagnostics/stale_record_attribution.py` — read-only replay of old and new rule over a store.

### Acceptance, validation, exclusions

As captured above, plus: the replay must show no record that the old rule resolved becoming
unresolvable under the new one. Exclusions: the conversation ledger of the interrupted turn, the
`Finishing` label, Mirror backfill, and any hand edit of the live journal.

## Implementation and closure (2026-10-06)

Both slices landed as planned. The attribution is one function with the eligibility, relatedness,
frontier and ordering logic of the old matcher kept verbatim, and the pairing target changed from
closed turns to requests. The interruption is one new function of fourteen lines.

Rust: **267 passed / 3 ignored** (was 264). Three tests added:

- `a_restart_and_continue_closes_the_continuing_record_and_interrupts_the_first` — the `softwarezen`
  shape: a claimed first turn, request A with tool work and no reply, request B closed by one reply.
  A → `Interrupted`, B → `Closed(pi-asst-b)` with `entry_count` 7.
- `a_trailing_open_request_is_named_not_judged` — the state before `continue`: `request_open`.
- `attribution_still_refuses_when_records_and_requests_cannot_pair` — 2 records / 1 request →
  `ambiguous`; a record admitted after its request → `frontier_mismatch`.

Two fixture errors were caught by the tests themselves before the rule was touched: a request whose
parent entry did not exist in a trimmed session, and an entry count of 8 where there are 7.

TypeScript: **235 files / 1,711 tests**, `tsc` clean, build clean, roadmap READY. One CR126 guard had to
change: it asserted the old matcher's name as proof that recovery was left alone. It now asserts the
part of that intent CR128 preserved — recovery stays on `project_complete_pi_transcript_from_branch`
and does not call `project_pi_run_from_branch`.

## Verified against the production store

`scripts/diagnostics/stale_record_attribution.py`, read-only, over every turn journal in
`ai.mirrormind.desktop` at `2026-10-06T13:09Z`:

| Journey | Record | Old rule | New rule |
|---|---|---|---|
| `softwarezen` | `agent-run-2026-10-06T12:18:21.328Z` | ambiguous | **interrupted** |
| `softwarezen` | `agent-run-2026-10-06T12:34:47.097Z` | ambiguous | **closed → `5c55d124`** |
| `comercial` | `agent-run-2026-10-06T13:07:52.477Z` | ambiguous | request_open |
| `mirror-desktop` | `agent-run-2026-10-02T02:22:26.549Z` | ambiguous | ambiguous |
| `mirror-desktop` | `agent-run-2026-10-06T13:01:28.067Z` | ambiguous | ambiguous |

Five stale records in the store; the old rule refused all five. The new rule resolves the two this CR
is about, names one that was live at the time of the replay, and leaves two exactly where they were.
**No record the old rule resolved becomes unresolvable** — the old rule resolved none.

The `comercial` record is the reason the rule is conservative. It appeared during this work, two
minutes before the replay, almost certainly a run in progress. Under a rule that interrupted any
unanswered request it would have been judged dead while alive. Under this rule it is named and left.

### What the replay cannot show

That `5c55d124`'s 952 characters reach the conversation and Mirror. The replay proves the native
attribution; the delivery after `TerminalDurable` is CR108's existing convergence
(`materialize_completed_journal_delivery_debt` → `convergePiBackedItem` → settlement), which this CR
does not touch and which the Rust tests cannot drive without an `AppHandle`. The live `softwarezen`
record is the field verification, and it cannot occur before a release carries this change,
production is upgraded, and the Journey is opened.

## Closure review

**Proportionality.** Two functions changed, one added, no renderer change, no schema change, no new
data channel. The fix is smaller than the capture feared because the information needed was already
in the session file.

**Debt.**

- The interrupted turn's conversation ledger is not touched. Turn A's `pi`, `harness` and `mirror`
  bodies stay `pending` in the `softwarezen` projection, so its `classification` stays
  `commit_pending` after B settles. Nothing on the surface reads that for the Composer when the thread
  is ready — the last Nautilus turn governs — but it is the "body pending forever" that CR122 named.
- `StaleRecoveryReport` counts an interruption as `recovered`, so `recoveredInSameAttempt` in the
  skip log cannot distinguish the two. A field no one reads yet; recorded so it is not mistaken later.
- `request_open` resolves only through the Navigator's next request on that session. A Journey whose
  Navigator never continues keeps one stale record and one unanswered request indefinitely, and the
  surface still calls that `Finishing`. The label question is open, as the capture said it would be.
- Which of the two blocking paths produces `Finishing` for this state is still not established.
- The `mirror-desktop` record from 2026-10-02 is unresolved under both rules and was not examined.

**Field verification collected (2026-10-06).** See
`docs/update/alpha-39-field-verification-2026-10-06.md`. On `alpha.39`, 13 s and 15 s after the
restart, record A became `interrupted` with receipt `pi-recovery-interrupted-…` and record B became
`settled`/`completed` on turn `5c55d124`, `entryCount` 182 — exactly what the replay predicted. The
conversation shows *"Recuperação concluída."* and Mirror `d1f94c25` received both messages.

**The Navigator then used the Journey, and it behaved correctly**: `softwarezen` showed `Interrupted`,
released the Composer, and the next turn ran and settled with 19 phases. Turn B's `harness` body is
`committed`, carrying `execution.committedAt` (`12:36:07.088Z`) — the convergence path's own value.

An intermediate reading of this CR saw that body `pending` in a snapshot taken five minutes after the
restart, and predicted from it that the Journey would still be blocked in `Finishing` and would never
heal. **Both predictions were wrong**, and the correction is recorded at the source in
`docs/update/alpha-39-field-verification-2026-10-06.md`. The ordering it identified in
`convergePiBackedItem` (`:547` before `:548`) is real, but no observed behaviour depends on it, so it
stands as an observation and not a defect. Nothing is captured from it.

The one thing that reading could not reconstruct — when the harness body committed — was unobservable
because **recovery opens no collector**, the second time in two readings that this gap has blocked a
diagnosis.

Originally recorded as owed: the `softwarezen` answer is the witness. The record must read
`terminal_durable` then `settled` for B and `interrupted` for A after the Journey is opened on a
release carrying this change; the conversation must show *"Recuperação concluída."*; Mirror
conversation `d1f94c25` must receive the pair.
