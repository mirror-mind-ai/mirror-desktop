[< RS017](index.md)

# CR033 — Separate Local Turn Completion from Mirror Synchronization

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs017-cr033-local-completion`

## Problem

A completed response that is already terminal and durably projected can remain ineligible for a successor until its Mirror outbox frontier completes. `isTurnJournalSuccessorEligible()` and native `admit_turn()` both require `outbox_enqueued`, `settled` or `interrupted`, so an outbox or reconciliation failure can make preserved local work block continued conversation.

Conversation opening then treats the `projected` record as blocking recovery. If recovery cannot rebuild or enqueue the exact outbox item, the entire Journey surface becomes unavailable even though the provider response and local projection may already be safe.

## Expected Behavior

Local completion and full Mirror synchronization are distinct:

- a completed turn becomes locally complete only after terminal evidence and the exact complete Conversation projection are durably established;
- a locally complete `projected` turn permits successor admission;
- Mirror outbox enqueue, append, receipt projection and acknowledgement continue as durable synchronization work;
- a synchronization failure remains attached to the exact turn and never silently disappears;
- opening one Conversation does not need to complete every prior Mirror delivery before restoring agent access;
- incomplete or unverifiable local projection remains blocking and fails closed.

## Impact

This removes secondary synchronization as a single point of failure for access to the agent while preserving exact turn destination, eventual Mirror delivery and non-regression of durable conversation history.

## Plan Or Decision

### Implementation Contract

1. Define local completion as a completed terminal journal record in phase `projected` with valid terminal Pi evidence and an exact durable projection containing the matching current turn authority.
2. Make the TypeScript successor decision accept only that completed `projected` shape, plus the existing `outbox_enqueued`, `settled` and `interrupted` phases. A malformed, cancelled, failed or evidence-free projected record remains ineligible.
3. Align native `admit_turn()` with the same rule so frontend policy cannot bypass the atomic authority boundary and native admission cannot contradict it.
4. Stop returning locally complete projected records from the blocking-opening lookup. Conversation opening may schedule their outbox repair, but failure remains a Journey-local synchronization notice rather than changing the thread to unavailable.
5. Keep outbox reconstruction exact. It may use the complete durable projection and terminal journal evidence, never the currently displayed Segment alone.
6. Keep retry model-free and idempotent. No provider invocation, generation reset, response recreation or implicit discard is allowed.
7. Preserve the complete durable Conversation as the only base for the next admission. If it cannot be loaded or does not contain the prior locally complete turn, Send remains blocked as `local_admission_unavailable`.
8. Add migration and restart fixtures representing the observed alpha 8 `projected` and `outbox_enqueued` states, including a segmented current view.

### Affected Files

Expected implementation surface:

- `src/app/turnJournal.ts`
- `src/domain/conversationAvailability.ts`, only if local-completion evidence needs a more precise input
- `src/app/App.tsx`
- `src/app/journeyConversationStorage.ts`
- `src/app/mirrorAppendOutboxStorage.ts`
- `src-tauri/src/turn_journal.rs`
- focused TypeScript and Rust tests
- integration fixtures for alpha 8 recovery states

The exact list may narrow during TDD. Expansion into schema migration, new background services or Mirror Core changes requires a separate decision.

### Acceptance

- A completed `projected` record with valid terminal evidence is successor-eligible in both TypeScript and native admission.
- A projected record without completed evidence remains blocking.
- Opening a Journey with a locally complete projected turn restores the complete local Conversation even when outbox repair fails.
- The composer remains available for a new turn and displays exact synchronization debt.
- New admission uses the complete durable projection and cannot regress prior turns.
- The pending outbox item can still be reconstructed, appended and acknowledged later without duplicate provider execution.
- Restart at every phase from `terminal_durable` through `settled` preserves data and exposes the correct availability decision.
- Existing cancellation, process death, retained lease, same-Journey occupancy and generation authority checks do not regress.

### Validation

- TDD for TypeScript local-completion classification and blocking-record selection.
- Rust tests for atomic successor admission with eligible and ineligible projected records.
- Integration tests for outbox failure followed by successful successor admission and later synchronization repair.
- Segmented-conversation regression proving the complete durable projection remains the admission base.
- Complete frontend suite, production web build, Rust tests and `cargo check` before handoff.
- Navigator validation in Mirror Desktop Dev using disposable data. No production app-data mutation is authorized.

### Exclusions

- No generic **Try again** redesign. CR034 owns recovery interaction.
- No change to Journey prompt or cross-Journey material semantics. CR035 owns that boundary.
- No schema expansion, journal quarantine store or periodic background worker unless TDD proves the existing durable journal and opening retry cannot safely support the contract.
- No production promotion, push, release or update publication.

### Authority Boundary

The Navigator approved this Plan, Driver `@alissonvale`, Delivery `refinement/rs017-cr033-local-completion` and local implementation. Commit authority covers this approved local delivery. Push, merge, publication and release remain separate decisions.

## Evidence

The alpha 8 incident and CR031 experiment exposed `projected`, `outbox_enqueued`, partial Segment projection, timestamp and recovery-evidence coupling across the current frontier.

## Outcome

Implementation is complete and awaiting Navigator validation.

The local-completion frontier now releases the exact native Journey lease immediately after the completed turn and complete Conversation projection are durably established. Mirror enqueue, append, receipt projection and acknowledgement remain exact, durable synchronization work, but failures after local completion no longer remove Send access. On restart, an eligible `projected` record is non-blocking and its Mirror synchronization is resumed model-free from the complete durable projection.

Native admission independently verifies the completed terminal evidence against the exact persisted Conversation, including Journey, thread, generation, session, Mirror identity, run, turn, committed harness/Pi states and exact user/assistant messages. The next provider packet reloads the complete durable Conversation rather than extending the displayed Segment.

The first Navigator validation pass exposed an unsupported-model provider error whose unchanged Pi leaf was being mistaken for fresh completion evidence. The outbox fault fixture was restored without retrying that invalid turn. Terminalization now captures the pre-invocation Pi leaf and refuses completion unless the durable Pi transcript advances beyond it; successor eligibility also rejects stale, empty, truncated or chronologically invalid completion evidence. This preserves the fail-closed side of the local-completion contract.

Validation evidence:

- frontend: 143 test files and 792 tests passed;
- production web build passed, with only the pre-existing Vite chunk-size warning;
- Rust: 136 tests passed, 1 explicitly ignored private-fixture test;
- `cargo check` passed;
- focused local-completion, settlement, composer, availability and source-contract tests passed.

Navigator validation in Mirror Desktop Dev remains required before this CR can move to `validated` or `done`. No production app-data mutation, push, merge, publication or release was performed.
