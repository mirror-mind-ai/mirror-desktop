[< Story](index.md)

# Test Guide — DS-009.US-2

## Purpose

Prove that US-2 activates exactly two globally concurrent Pi executions without weakening one-lease-per-Journey admission, correlation, event routing, settlement, persistence, recovery, bounded inspection or rollback to capacity `1`.

All automated concurrency races use deterministic barriers, deferred Promises, fakes or temporary files. They must not use timing sleeps or real Pi processes.

## Native Registry Coverage

Extend the focused `pi_process_registry` suite before changing production capacity:

1. production construction reports exactly limit `2`;
2. invalid limits remain rejected and injected limits `1` and `2` use the same implementation;
3. barrier-released A1 and B1 reservations both succeed at limit `2` and execute their starters exactly once;
4. simultaneous A1/A2 reservation produces one exact winner and one `DuplicateJourney` without consuming a second slot;
5. A1 and B1 occupying both entries causes C1 to receive `CapacityReached` before starter/worker/child creation;
6. first terminalization of A1 decrements only A1 child capacity and does not terminalize, cancel, remove or diagnose B1;
7. A1 retained as finalizing continues to block A2 and preserves the bounded entry rule until exact cleanup;
8. after exact A1 cleanup, C1 may reserve while B1 continues, and inspection remains sorted and bounded to two entries;
9. stale A1 attachment, cancellation, terminalization or cleanup cannot mutate replacement A2 or B1;
10. duplicate terminal signals cannot underflow capacity when two entries exist;
11. cancellation/wait on one cloneable child handle never holds the registry mutex or blocks registry progress for the other Journey;
12. inspection with two entries exposes only the existing allowlist and no provider snapshot, prompt, response, `piSessionFile`, environment, path, secret or output;
13. released-target tombstones remain bounded under limit `2` and cannot authorize cleanup of a replacement;
14. any app-shutdown helper snapshots at most the bounded exact targets under lock and controls cloned children only after releasing the registry lock.

The focused tests must continue proving limit `1` rollback behavior: A1 wins, B1 is rejected while A1's entry remains, and all exact authority/control APIs are unchanged.

## Frontend Inspection And Admission Coverage

Add pure tests around `piInvocationOccupancy.ts`:

- valid inspections with limit `1` and limit `2` are accepted;
- limit `0`, limit `3+`, non-integer limits, over-capacity counters and entry counts above the reported limit are rejected;
- duplicate Journey IDs or duplicate run IDs are rejected;
- reserved/running/finalizing lifecycle combinations remain exact;
- unknown and reconciling occupancy fail closed;
- selected Journey with its own reserved, running or finalizing lease returns `same_journey_occupied`;
- two occupied entries or full process capacity returns `global_capacity_reached` for a third Journey;
- one A entry at limit `2` admits free Journey B;
- one A entry at rollback limit `1` blocks B without changing the selector implementation;
- a retained finalizing A entry still occupies one bounded admission entry even though its process capacity is released;
- exact cleanup plus fresh inspection frees only the removed slot and preserves the other Journey;
- stale inspection responses cannot free or overwrite a newer two-entry state;
- local expected-lease retention for A preserves B and keeps sorted entries;
- a late native duplicate/capacity rejection rolls back only its rejected staged turn and reinspects without removing A/B.

Admission tests must distinguish presentation from authority: the native reservation remains required even when a fresh inspection reports an available slot.

## Journey Runtime And UI Coverage

Update characterization tests that currently encode global serial blocking:

- `deriveJourneyNavigationPresentation` keeps A's active/finalizing state attached to A while B presentation remains clean;
- when native capacity is available, A active does not by itself mark free B's text submission blocked;
- selecting active/finalizing A still blocks another A send and shows only A's cancel/recovery controls;
- with A/B occupying both slots, C remains navigable and draft-editable but send/Enter is blocked by global capacity;
- global Settings, agent-profile mutation, Journey administration, generation restart and other existing aggregate operational guards remain blocked while runtime occupancy exists;
- file attachment controls remain under the existing aggregate guard and do not become cross-Journey staging state;
- source/integration checks show the send guard uses exact admission rather than `hasBlockingPiInvocationOccupancy` alone;
- two `generatePacket` closures capture different owner Journey, generation, provider snapshot, `RunAuthority` and settlement authority before overlap;
- interleaved A1/B1 stream events update only their Journey-keyed runtime entries;
- native `done` for A closes only A's dispatcher route and does not suppress B's later events;
- selecting A or B during overlap never moves messages, operations, warnings, diagnostics, context usage, terminal status or Mirror errors between owners;
- rejected C1 produces no registered runtime, turn, message, generation, staging or provider execution.

## Settlement And Persistence Regression Matrix

US-2 must rerun the TS-4 deterministic matrix and add two-run integration cases:

- A1 and B1 pre-frontier work uses independent Journey queues and exact latest current turns;
- candidate/persisted validation for A cannot read or authorize B, and vice versa;
- A1/B1 completion order may reverse without overwrite or lost turns;
- A1 durable enqueue is not blocked by B1 remote Mirror append, and B1 enqueue is not blocked by A1 append;
- cleanup/reinspection of A removes only A's exact lease and preserves B inspection/admission state;
- A1 model-free post-frontier recovery may overlap B1 child execution after A cleanup;
- A1 old-generation receipt-save/ack cannot mutate A2 replacement or any B projection/outbox item;
- exact existing receipts and repeated acknowledgements remain idempotent independently for A and B;
- lifecycle autosaves cannot delete either Journey's persisted later turn or regress committed receipt/checkpoint evidence;
- restart recovery uses only projection/outbox evidence and creates no phantom A/B child, run, turn, message, generation or staging.

No test may loosen TS-4 active pre-frontier, authority-bound rollback or generation-scoped post-frontier modes.

## Focused Commands

Run from the Harness repository:

```bash
npm test -- --run \
  src/tests/piInvocationOccupancy.test.ts \
  src/tests/journeyNavigationBehavior.test.ts \
  src/tests/journeyRuntimeIntegration.test.ts \
  src/tests/journeyRuntimeState.test.ts \
  src/tests/piProcessEventDispatcher.test.ts \
  src/tests/journeySettlement.test.ts \
  src/tests/journeySettlementRecovery.test.ts \
  src/tests/journeyPersistenceCoordinator.test.ts \
  src/tests/mirrorAppendOutbox.test.ts \
  src/tests/mirrorAppendOutboxStorage.test.ts

cargo test --manifest-path src-tauri/Cargo.toml pi_process_registry
```

If implementation adds a dedicated pure admission or shutdown module/test, include it in the focused command and Validation evidence.

## Full Automated Gates

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --features development-channel
git diff --check
```

Also verify:

- Markdown local links for changed files;
- `PRODUCTION_PI_PROCESS_LIMIT` has exactly one definition and equals `2` only in the authorized implementation commit;
- no arbitrary environment/config capacity override exists;
- `TurnCorrelation` remains `0.2.0`;
- start/cancel/cleanup signatures and `PiProcessEvent` authority remain unchanged;
- no changes enter DS-009.US-3, RS015, Mirror runtime, stable promotion, release or deployment files;
- mock streaming remains free of Tauri imports.

## Rollback Proof

Automated evidence must construct the same native registry and frontend admission selector at limit `1` and prove:

- only one different-Journey reservation wins;
- a retained finalizing lease still blocks admission until exact cleanup;
- inspection limit `1` validates;
- free/occupied presentation is correct;
- no authority, event, reducer, persistence, outbox or command contract changes.

Static evidence must show rollback is one source edit:

```text
PRODUCTION_PI_PROCESS_LIMIT: 2 -> 1
```

A temporary rollback build or DEV smoke may be performed only if explicitly included in the later Validation authorization. It must be restored before evidence is committed. No environment override or stable build is acceptable as rollback proof.

## DEV-Only E2E Decision

E2E is **required** because the observable outcome is two real overlapping local Pi children and two independently updating Journey surfaces. Validation must use only:

```text
App name      Nautilus Harness Dev
Bundle        com.nautilus.harness.dev
Mirror code   $HOME/.mirror-journeys/mirror-mind/mirror-dev
Mirror home   $HOME/.mirror-minds/mirror-dev
Mirror user   mirror-dev
```

Use three disposable DEV Journeys A, B and C with ready dedicated generations and short natural prompts. Do not use stable app-data or production Mirror for execution.

## DEV Desktop Route

1. Stop all Harness DEV/Vite/Tauri processes and confirm no Pi child owned by the app.
2. Record a byte-level stable app-data baseline and read-only production Mirror conversation/message counts.
3. Launch `npm run tauri:dev`; verify DEV badge, bundle/runtime profile and bounded inspection limit `2`.
4. Select A and submit A1. Confirm A owns one child and one authority route.
5. Before A1 terminates, select B and submit B1. Capture inspection/process evidence showing two distinct Journey/run authorities and exactly two live Pi children at the same time.
6. While both run, navigate A → B → C → A by pointer and keyboard. Confirm A/B show only owner content, both rows show active state, C draft remains editable, and C send/Enter is blocked by global capacity.
7. Confirm a second send in A or B is unavailable while that Journey is active/finalizing. Do not fabricate an extra provider execution to prove rejection.
8. Let A and B complete naturally. Record their actual completion order and verify each exact generation projection contains only its own run/turn and committed Harness/Pi/Mirror evidence or its exact durable recoverable outbox state.
9. Verify the outbox contains no cross-Journey item or acknowledgement and eventually converges without duplicate receipts.
10. Restart DEV after normal settlement. Confirm zero child on startup, no phantom active row, no duplicate response/listener delivery and correct persisted A/B projections.
11. Stop DEV processes and recheck stable app-data and production Mirror against the baseline.

Use direct child-parent inspection and bounded registry inspection to establish overlap; screenshots alone are not proof of child count. Polling used only to observe real smoke state must record the maximum and exact Journey/run identities; it must never be the authority for automated race correctness.

## Navigator Validation

Expected observation: A and B visibly execute at the same time with separate owner rows and conversations; selecting either shows only its own stream/runtime state; C remains navigable and draft-editable but cannot start while both slots are occupied; A and B settle independently; restart restores no child.

Pass condition: focused and full gates pass; deterministic tests prove limits `1` and `2` through the same implementation; DEV evidence proves exactly two overlapping and never three Pi children; same-Journey and third-Journey admission create no side effects; persistence/outbox evidence remains owner-correct; stable app-data and production Mirror remain unchanged.

Fail condition: any third child, second lease in one Journey, mutable/selected authority, stale replacement mutation, cross-Journey event or persistence write, duplicate listener or settlement, lock-held provider/remote append/child control, unbounded inspection, rollback requiring more than the capacity source edit, stable/production mutation, or dependency on US-3 behavior fails Validation.

## US-3 Boundary

Do not cancel one of the concurrent DEV runs, inject provider failure, force append failure, corrupt persistence or exercise selective concurrent failure settlement in US-2 validation. Those behaviors belong to DS-009.US-3. US-2 may characterize bounded app shutdown for activation safety, but it must not claim US-3 targeted cancellation/failure acceptance.

## Validation Evidence

Pending implementation, explicit implementation authorization and later Navigator Validation. This guide approves no implementation, smoke, push, promotion, release or deployment.
