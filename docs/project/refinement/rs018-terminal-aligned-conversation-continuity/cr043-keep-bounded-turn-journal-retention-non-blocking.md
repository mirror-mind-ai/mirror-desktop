[< RS018](index.md)

# CR043: Keep Bounded Turn Journal Retention Non-Blocking

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr043-non-blocking-journal-retention`

## Problem

CR042 removed historical lifecycle and Desktop projection state from successor-occupancy authority, but the bounded turn journal retains one residual availability gate. A Journey journal stores at most 64 records and currently evicts only `settled` records. If 64 historical attempts remain admitted, running, terminal, projected or awaiting delivery settlement, `admit_turn()` returns `turn_journal_full` even when the native registry proves that no previous execution is active.

The byte bound can create the same class of failure during later lifecycle transitions. This converts bounded diagnostic retention into Conversation occupancy and conflicts with RS018: Pi owns transcript continuity, the compatibility outbox owns delivery debt and only exact active native execution may block a successor.

## Expected Behavior

Journal retention remains bounded without becoming an admission or continuation prerequisite. Before a bounded journal write exceeds its record or byte budget, the Desktop removes the oldest inactive historical records according to an explicit deterministic retention policy while protecting the exact current native run.

Pruning journal history never deletes Pi transcript entries, outbox debt, Mirror state or control-plane bindings. A single current record that cannot fit within the journal schema remains an explicit durability error; accumulated historical records do not make a healthy Conversation unavailable.

## Impact

Long-running Conversations and extended Mirror outages can continue beyond 64 attempts without resetting Pi context. The journal remains useful for current crash recovery and recent diagnostics but does not grow into a second transcript or delivery ledger.

## Plan Or Decision

### Proposed Scope

1. Characterize capacity gates
   - Add failing tests with 64 unresolved historical records and a newly reserved successor.
   - Cover both record-count and serialized-byte limits.
   - Prove that current exact run evidence is never selected for pruning.

2. Define deterministic bounded retention
   - Protect the exact run being admitted or transitioned.
   - Prefer pruning oldest `settled` and `interrupted` records, then oldest terminal/projected/outbox records.
   - Prune stale admitted/running records only when exact native occupancy proves they are inactive.
   - Keep ordering and pruning independent of Desktop projection, Segment and Mirror receipt state.

3. Apply retention at native authority boundaries
   - Pass exact protected native-run identity into journal admission and transition writes where required.
   - Compact before returning `turn_journal_full` for accumulated history.
   - Retain explicit failure when the protected current record alone violates schema or byte bounds.

4. Preserve independent durable bodies
   - Do not delete or acknowledge Pi JSONL, compatibility-outbox items, Mirror receipts or control-plane records.
   - Document journal retention as lifecycle evidence retention, not transcript or delivery retention.

### Likely Affected Files

- `src-tauri/src/turn_journal.rs`
- `src-tauri/src/main.rs`
- focused Rust tests
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

### Acceptance

- A journal containing 64 unresolved but natively inactive historical records admits a successor.
- Accumulated historical byte volume is compacted before it can block the current protected run.
- The exact current reserved/running/finalizing run is never pruned.
- Retention order is deterministic and independently testable.
- Pruning never reads Desktop Conversation or Segment projections.
- Pi transcript, outbox debt, Mirror destination and generation binding are unchanged.
- Corrupt journal state and an individually oversized current record remain fail-closed.
- No provider invocation, implicit retry or generation reset is introduced.

### Validation

- TDD for record-count, byte-bound, deterministic-order and protected-run cases.
- Complete Rust suite and `cargo check`.
- Complete frontend suite and production web build as regression gates.
- `npm run roadmap:check`, `git diff --check` and relative-link validation.
- Stop for Navigator Validation before production repair, push, merge or release.

### Exclusions

- No journal archive that could become a new transcript authority.
- No Pi transcript, Surface, Segment or compatibility-outbox migration.
- No Mirror Core change.
- No production Flip mutation.
- No release or publication work.

### Reversibility

The retention policy changes only which inactive historical journal records remain in the bounded lifecycle cache. Authoritative transcript and delivery bodies remain untouched. The policy can be reverted without data migration.

### Authority Boundary

CR043 was created by the CR042 Debt Review decision `create_follow_up`. The Navigator confirmed Driver `@alissonvale`, Delivery `refinement/rs018-cr043-non-blocking-journal-retention`, selection, focus, transition to `in_progress` and local implementation. Navigator Validation, production mutation, push, merge, publication and release remain separate decisions.

## Evidence

- `JOURNAL_MAX_RECORDS` is 64.
- `admit_turn()` currently evicts only records in phase `settled`.
- A full journal with unresolved historical records returns `turn_journal_full` before appending the newly reserved run.
- CR042 established that historical journal lifecycle is not process occupancy; this capacity path is therefore residual retention debt rather than an authority decision.

## Outcome

Implementation is complete and awaiting Navigator Validation.

Journal writes protect the exact run being admitted or transitioned and compact safely disposable history before either the 64-record or 8 MiB serialized bound is exceeded. Settled, interrupted, outbox-enqueued and non-completed terminal/projection records are eligible. Unfinished admitted/running history is eligible only during `admit_turn()`, after native reservation proves every pre-existing same-Journey record inactive. Ordinary lifecycle transitions never prune another unfinished run without that proof.

Completed `terminal_durable` and `projected` records are never pruned directly. CR044 now reconciles their exact Pi evidence into independently durable compatibility-outbox debt before journal admission, then advances them to `outbox_enqueued`. This removes the final historical-capacity gate without silently discarding Mirror delivery obligations. Missing or contradictory Pi/control-plane evidence remains fail-closed as a durability error.

No archive or replacement authority was introduced. Pi JSONL, outbox items, Mirror state and exact control-plane bindings remain untouched by journal compaction.

### TDD And Validation Evidence

- The initial 65th unresolved admission test failed with `turn_journal_full`.
- Record-count coverage now proves that 65 unresolved historical attempts admit the protected successor and retire the oldest inactive record.
- Deterministic-order coverage proves that settled history is retired before older unfinished history and that the new run is retained.
- Occupancy-safety coverage proves ordinary transitions cannot prune another admitted/running record without post-reservation proof.
- Byte-bound coverage proves safely disposable oversized history is compacted while one oversized protected run remains fail-closed.
- Delivery-safety coverage proves completed pre-outbox evidence is not pruned as if delivery debt were already self-contained.
- Integrated CR044 coverage proves independently durable completed history cannot fill the journal and the protected successor remains present.
- Complete Rust suite: 150 passed, 1 ignored; `cargo check` passed without warnings.
- Complete frontend suite: 803 passed.
- TypeScript, production web build, roadmap consistency and diff checks passed.
- Final Navigator Validation remains pending.

### Resumption Decision

CR043 was parked because completed pre-outbox evidence was the only durable Mirror delivery cue. [CR044](cr044-materialize-mirror-delivery-debt-before-journal-pruning.md) satisfied the revisit trigger and was validated and closed on 2026-09-18. The Navigator authorized continuation.

CR043 resumed on Delivery `refinement/rs018-cr043-non-blocking-journal-retention`. Final integration preserves CR044's Pi-backed debt materialization before admitting and compacting a successor.

No provider was invoked and no production app data was read or mutated.

### Navigator Validation

Accepted on 2026-09-18. Automated validation was accepted as sufficient for CR043's scoped closure. This acceptance does not authorize production repair, merge, publication, release or RS018 closure.

### Proportionality Review

The implementation is proportional. It changes only bounded journal retention, exact pre-admission debt reconciliation inherited from CR044, and focused evidence. It does not create an archive, alter Pi JSONL, retry the provider or grant projections new authority.

### Debt Review

Decision: `no_action`.

The remaining production-shaped relaunch and endurance rehearsal is not CR043 implementation debt. It already belongs to the RS018 acceptance horizon and should be performed as the next explicit story slice before release or production recovery.
