[< RS018](index.md)

# CR051 — Repair Post-Native Terminal Delivery Debt from Pi Evidence

**Status:** planned
**Driver:** —
**Delivery:** —

## Problem

CR049 captured the exact post-native/pre-delivery termination window. Pi durably recorded the admitted user and a successful assistant leaf with `stopReason: stop`, then the watcher terminated Mirror Desktop before harness settlement or Mirror debt materialization. After relaunch, the Pi-backed surface correctly reconstructed the complete exchange, no provider retry ran and the Composer remained available.

The journal record nevertheless remained `running`, its harness/Pi/Mirror authorities remained pending, and no outbox item existed for that turn. After Mirror availability was restored, the explicit `Retry Mirror synchronization` action failed with `mirror_append_message_authority_mismatch`. The reconstructed Pi-backed Surface uses native aliases (`pi-<entry-id>`) while the stale journal authority retains pre-agent harness message IDs, so the current repair route attempts to recover delivery through incompatible projected message identity instead of materializing debt from exact Pi evidence.

## Expected Behavior

- A successful terminal Pi turn remains complete after termination, regardless of harness settlement state.
- Relaunch never retries the provider.
- Exact Pi user/assistant entries can finalize stale journal authority and materialize self-contained Mirror delivery debt.
- The repair route does not require Desktop projection message IDs to match pre-agent harness IDs.
- `Retry Mirror synchronization` replays only durable Mirror delivery.
- Composer availability remains independent from repair success.
- Exact Journey, thread, generation, Pi session, entry and Mirror destination bindings are preserved.
- Contradictory, incomplete or mismatched Pi evidence fails closed.

## Evidence

Private-data-free CR049 sandbox on 2026-09-18:

- baseline Pi leaf before the watched turn: `a72c3802`;
- terminal assistant leaf: `bb452d3f` with `stopReason: stop`;
- watcher observed 12 active entries and sent `SIGTERM`;
- journal remained `running` for `turn-agent-run-2026-09-18T21:30:21.389Z`;
- outbox remained at the three earlier outage turns;
- relaunch reconstructed the terminal response exactly once with no retry and an available Composer;
- explicit repair failed with `mirror_append_message_authority_mismatch`.

The rehearsal archive contains 11 private-data-free app-data files. Ordinary DEV state was restored to the verified 63-file digest `0a9cd312e4a8624c99a12a24bab367f77ccea879159e6fe9abcd794153df3e27`; production was untouched.

## Approved Plan

### 1. Prove the interrupted settlement shape before changing runtime code

Add a private-data-free integration fixture matching the CR049 evidence:

- one exact `running` journal record;
- no active native lease;
- three earlier terminal turns already represented as outbox debt;
- one later complete Pi user/assistant pair with `stopReason: stop`;
- a Pi-backed Surface whose visible message IDs are native aliases rather than the stale harness IDs;
- no outbox item for the stale turn.

The initial test must reproduce `mirror_append_message_authority_mismatch` without invoking a provider.

### 2. Recover terminal evidence from the sole transcript authority

Add a Rust reconciliation command that operates under the existing journal and outbox locks. It may recover only an inactive `admitted` or `running` record whose exact Journey, thread, generation, Pi session and Mirror destination still match current thread authority.

Use the complete active Pi branch, not projection or Segment bodies. Match stale records and otherwise-unclaimed complete Pi turns monotonically:

- order journal records by creation order and Pi turns by active-branch entry order;
- treat user/assistant entry pairs already named by terminal journal evidence as claimed;
- bound each candidate after the greatest prior claimed Pi frontier and before the next claimed frontier;
- require exactly one unclaimed successful pair for the stale record;
- require Pi start/commit timestamps to be ordered at or after journal admission;
- require no exact active native lease for the record;
- reject ambiguity, missing entries, unsuccessful stop reasons, session mismatch, reordered frontiers or competing stale records.

On an exact match, transition the journal through `terminal_durable` with full `TurnPiExecutionEvidence`, then use the existing `create_pi_backed_mirror_append_item()` path to materialize schema `1.1.0` debt. Do not reconstruct evidence from Desktop messages.

### 3. Make explicit repair honor self-contained Pi-backed debt

Preserve the outbox item's real schema/authority kind in `list_mirror_append_outbox` and its TypeScript summary. When repair materializes or discovers a schema `1.1.0` item, route it through Pi-backed delivery even when a Desktop projection exists. Never run `executeCompletedSettlement()` against Pi aliases and stale harness IDs.

After an accepted or idempotently existing Mirror receipt, acknowledge the exact self-contained item under lock and transition its exact journal record from `outbox_enqueued` to `settled`. This acknowledgement validates item identity, Pi entry IDs, current generation authority, receipt message IDs and Mirror destination; it does not require projection messages to carry harness IDs.

### 4. Derive synchronization presentation from durable debt

A stale projection-level `mirror: pending` flag cannot independently create a repair route after exact journal/outbox settlement. Gate the visible repair state by the exact durable journal/outbox authority for the turn. Successful Pi-backed acknowledgement must clear the notice across relaunch without rewriting Pi transcript identity or treating a projection receipt as transcript truth.

Existing schema `1.0.0` projection-backed items retain their current route. Existing CR044 schema `1.1.0` behavior remains compatible.

### 5. Fail closed and preserve availability

Bound new diagnostics for:

- ambiguous Pi turn assignment;
- active lease still present;
- Pi frontier regression;
- journal/session/generation mismatch;
- outbox conflict;
- receipt mismatch.

Every failure leaves the outbox/journal intact, never retries the provider and never changes `canSend`. No implicit delivery runs on relaunch; recovery remains attached to the explicit repair action or pre-admission local materialization boundary.

### 6. Validation

Automated validation must cover:

- exact terminal-window recovery and schema `1.1.0` materialization;
- ambiguity and all authority mismatch rejections;
- existing claimed-frontier and multiple-record ordering;
- active-lease refusal;
- projection deletion and Pi-alias reconstruction;
- one explicit Mirror append, idempotent existing receipt and exact acknowledgement;
- no provider invocation;
- notice clears after settlement and remains clear after relaunch;
- legacy schema `1.0.0` repair remains unchanged;
- concurrent Journey isolation;
- complete frontend, Rust, TypeScript, build, roadmap, link and diff gates.

Interactive validation reopens the archived private-data-free CR049 fixture in an isolated DEV swap, restores only its disposable Mirror home, runs one explicit repair, verifies the fourth turn arrives once without provider execution, then relaunches and confirms continuity plus cleared debt. Ordinary DEV state must be restored by verified manifest afterward.

## Expected File Surface

- `src-tauri/src/main.rs` — exact stale-journal/Pi reconciliation, schema-preserving outbox summaries and Pi-backed acknowledgement command.
- `src/app/mirrorAppendOutboxStorage.ts` — schema/authority-aware summaries and command adapters.
- `src/app/App.tsx` — explicit repair orchestration and durable-debt presentation gating.
- `src/app/turnJournal.ts` and/or a focused recovery domain module — pure recovery classification where frontend coordination needs it.
- focused Rust and `src/tests/` fixtures for the terminal window, authority rejection, retry routing and relaunch presentation.
- architecture/refinement documents only where the accepted authority boundary requires clarification.

## Exclusions

- no Mirror Core or schema change;
- no provider retry or transcript mutation;
- no Segment/projection content as recovery evidence;
- no production app-data or production Mirror mutation;
- no CR049 outage, concurrency or copied-cache continuation inside CR051;
- no CR038 work;
- no push, merge, publication, release or RS018 closure.

## Planning Decisions

- Selected and moved to `planned` by the Navigator on 2026-09-18.
- Recommended Driver: `@alissonvale`.
- Recommended Delivery: `refinement/rs018-cr051-pi-backed-terminal-delivery-repair`.
- Implementation requires separate Navigator authorization with explicit Driver and Delivery assignment.

## Authority Boundary

CR051 was captured from a product defect in the explicitly authorized CR049 sandbox. Selection and planning are approved. Driver, Delivery, implementation, validation, CR049 resumption, push, merge, publication, release, production mutation and RS018 closure remain explicit Navigator decisions.
