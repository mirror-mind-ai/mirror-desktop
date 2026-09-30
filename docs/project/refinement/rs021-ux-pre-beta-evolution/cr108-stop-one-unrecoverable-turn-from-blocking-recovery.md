[< RS021](index.md)

# CR108: Stop One Unrecoverable Turn from Blocking Recovery

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr107-startable-journeys`

## Friction

`mirror-desktop` in Dev presented `Conversation synchronization needs attention` with
`mirror_append_pi_recovery_ambiguous`, and `Repair synchronization` could not clear it. The notice
was permanent and the offered action could never succeed.

Observed on 2026-09-30 while validating CR107, and unrelated to it.

## Diagnosis

`reconcile_pi_backed_mirror_delivery_debt` collects **every** journal record still at
`Admitted`/`Running` for the Journey — across all generations, threads and Pi sessions — and then
loops over them. Each iteration propagated failure with `?`:

```rust
let (_, content) = pi_session_for_journal_record(&app, &record)?;
let turns = project_complete_pi_transcript(&content).map_err(...)?;
let turn = match_unclaimed_pi_turn(&record, &records, &turns)?;
```

So a single unrecoverable record aborted the whole reconciliation. Worse,
`materialize_completed_journal_delivery_debt` runs **after** that loop, so the abort also prevented
delivery debt that had nothing to do with the failing record from ever being materialized.

The observed data shows exactly that shape:

- Two records still at `running` from **2026-09-18**, on retired generation 1 and thread
  `desktop-thread-mirror-desktop-18d5cf4842b669b0`.
- `match_unclaimed_pi_turn` fails closed on them with `mirror_append_pi_recovery_ambiguous`, because
  the stale set for that session does not uniquely match its unclaimed Pi turns.
- The real pending debt is a generation 2 outbox item enqueued `2026-09-30T11:52:52.473Z`.

Twelve-day-old debt on a retired generation therefore blocked the recovery of current work
indefinitely.

This is not a new regression. The same condition in the same Dev dataset is described in
`rs016.../cr062-isolated-dev-homologation-2026-09-20.md`, where it was corrected **only in a copied
fixture**. The product behaviour was never changed, so the trap remained.

`match_unclaimed_pi_turn` itself is correct: it already scopes `related` by thread, generation and
Pi session, so it judges each record on its own evidence. The defect is entirely in the caller
treating one record's verdict as the batch's verdict.

## Outcome

One unrecoverable turn no longer prevents the recovery of any other, and no longer prevents
materialization of unrelated delivery debt.

## Repair

Each stale record is attempted independently. A failure is recorded against that record and the loop
continues, and `materialize_completed_journal_delivery_debt` always runs afterwards.

`StaleRecoveryReport` makes the isolation explicit rather than implicit in control flow, and names
what happened to each record.

Nothing is hidden by this change. A record that cannot be recovered stays exactly where it was, at
`Admitted`/`Running` in the journal, and remains visible to every later inspection. What it loses is
only its power to veto the recovery of unrelated turns.

## Boundaries

No recovery action invokes the agent or a model. No journal record is deleted, rewritten or
force-settled. No relaxation of `match_unclaimed_pi_turn`'s matching rules: a record that is genuinely
ambiguous stays unrecovered rather than being guessed at.

## Validation

- `cargo test --locked`: 214 passed, including the new
  `one_unrecoverable_stale_record_does_not_block_another`. `npx vitest run`: 201 files, 1307 tests.
  `tsc`, production build, `roadmap:check` and `git diff --check` clean.

## Declared limits

- Clearing the *outbox* item is a separate delivery path. This CR unblocks reconciliation and
  materialization; it does not itself flush pending Mirror deliveries.
- The two historical `running` records remain unrecoverable by design, because their evidence is
  genuinely ambiguous. They simply no longer block anything.
- Skipped records are not yet surfaced in the UI. They stay observable in the turn journal, where
  they already were, and are now also recorded to `mirror-append-recovery-skips.jsonl` beside the
  outbox, bounded like the conflicts log. Naming them on the recovery surface is a further
  improvement, in the spirit of CR104.
