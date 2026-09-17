[< RS018](index.md)

# CR043: Keep Bounded Turn Journal Retention Non-Blocking

**Status:** in_progress
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

Journal writes now protect the exact run being admitted or transitioned and compact historical records deterministically whenever either the 64-record or 8 MiB serialized bound would be exceeded. Retention priority is `settled`, `interrupted`, `outbox_enqueued`, `projected`, `terminal_durable`, then unfinished history.

Unfinished admitted/running history can be pruned only during `admit_turn()`. That function is called after the native registry reserves the only same-Journey lease, proving all pre-existing records inactive. Ordinary lifecycle transitions never prune another unfinished run without that occupancy proof. The newly admitted or transitioned run is always protected; if it alone exceeds the byte budget, the write remains fail-closed.

No archive or replacement authority was introduced. Compaction removes only bounded lifecycle-cache records; Pi transcript, compatibility-outbox items, Mirror state and control-plane bindings are untouched.

### TDD And Validation Evidence

- The initial 65th unresolved admission test failed with `turn_journal_full`.
- Record-count coverage now proves that 65 unresolved historical attempts admit the protected successor and retire the oldest inactive record.
- Deterministic-order coverage proves that settled history is retired before older unfinished history and that the new run is retained.
- Occupancy-safety coverage proves ordinary transitions cannot prune another admitted/running record without post-reservation proof.
- Byte-bound coverage proves oversized history is compacted while one oversized protected run remains fail-closed.
- Complete Rust suite: 146 passed, 1 ignored.
- Complete frontend suite: 802 passed.
- `cargo check`: passed without warnings.
- TypeScript and production web build: passed.
- `npm run roadmap:check`: `Mirror Desktop roadmap: READY`.

No provider was invoked and no production app data was read or mutated.
