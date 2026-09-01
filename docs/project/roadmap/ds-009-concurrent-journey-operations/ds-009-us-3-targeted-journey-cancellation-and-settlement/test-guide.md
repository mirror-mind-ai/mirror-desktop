[< Story](index.md)

# Test Guide — DS-009.US-3

## Purpose

Prove that cancellation, pre-completion failure, controlled completed-settlement failure, shutdown and restart recovery remain exact-owner operations while two Journeys execute under production capacity `2`.

Automated races use deterministic barriers, deferred promises, fakes and temporary files. They must not use timing sleeps or real Pi processes. Real process control is reserved for the later DEV-only E2E route and requires exact recorded authority/PID correlation.

## Native Registry And Process Lifecycle Coverage

Extend focused native tests before changing behavior:

1. with A1/B1 running at limit `2`, `request_cancel(A1)` changes only A1 cancellation state and returns only A1's cloneable handle;
2. A1 mismatch/stale authority is rejected without changing A2 or B1;
3. repeated A1 cancellation is idempotent and never kills or terminalizes B1;
4. A1 cancel-before-attachment remains pending and controls only the later A1 handle;
5. deterministic cancel-vs-done barriers produce one A1 terminal winner while B1 inspection remains byte-identical;
6. deterministic process-death-vs-cancel barriers produce one A1 terminal winner and no capacity underflow;
7. A1 child-control/wait failure leaves B1 usable and does not retain the registry mutex;
8. first A1 terminalization releases only A1 process capacity and keeps A1 finalizing lease until exact cleanup;
9. stale A1 attachment, terminalization or cleanup after A2 reservation cannot mutate A2 or B1;
10. first terminal independently applies to B1 even when A1 is cancelling/finalizing;
11. shutdown snapshots at most two exact sorted handles under lock, releases the lock, then attempts both controls even if one fails;
12. shutdown never performs untargeted PID/name search, provider execution, event fabrication, filesystem work or wait while holding the registry lock;
13. injected limit `1` uses the same cancellation/terminal/shutdown implementation without changing production capacity;
14. production capacity characterization remains exactly `2` and only one capacity definition exists.

Use barriers/channels to prove ordering. No assertion may depend on elapsed time.

## Frontend Cancellation And Dispatcher Coverage

Add or extend reducer, dispatcher and application integration tests:

- Cancel uses the selected runtime's captured live identity and invokes only `cancel_pi_invocation(journeyId, runId)`;
- navigation after the click cannot retarget the in-flight cancel command;
- A1 `cancel_requested` updates only A's entry while B's complete runtime entry remains deep-equal;
- A1 `cancelled`, `error`, warning, diagnostic, finalization and native `done` events update/close only A's exact route;
- B1 may receive deltas, operations, context usage, compaction, Mirror evidence and `done` after A1 route closure;
- A1 error/cancel before native `done` does not prematurely dispose A1 post-processing evidence;
- repeated or reordered terminal presentation cannot change first-terminal state;
- selected B never displays A cancellation/failure text or recovery controls;
- selected A never displays B stream/progress/diagnostics;
- stale A1 events after A2 registration are dropped or bounded-quarantined without mutating A2/B1;
- exact A1 cleanup cannot remove B runtime, staging snapshot, diagnostics or draft;
- listener lifecycle remains one app-level listener with no remount duplication.

Tests should snapshot B before A cancellation/failure and require byte-for-byte equality until B receives its own next event.

## Interrupted Settlement Coverage

Extend `journeySettlement` and recovery tests for A1 interruption while B1 remains active:

1. A1 validates active authority, saves interrupted projection, validates again, cleans only A1 and reinspects;
2. B1 projection/runtime/outbox fixtures remain byte-identical across every A await;
3. interrupted-save failure retains A1 lease and diagnostic, invokes no cleanup, and leaves B unchanged;
4. cleanup or reinspection failure retains fail-closed A evidence without marking B occupied/failed;
5. A1 cancellation with no complete assistant pair creates no completed outbox item or Mirror append;
6. deterministic partial-assistant handling remains A-local and does not fabricate completion;
7. pre-provider/native-start rejection uses exact rollback rather than interrupted settlement;
8. stale A1 interrupted recovery is rejected after A2 replacement and cannot read B authority;
9. repeated exact interrupted recovery converges idempotently without another provider call;
10. A/B persistence queues remain independent while same-Journey work stays FIFO.

## Completed Settlement Failure Coverage

Use dependency injection and deferred gates to cover controlled A1 failures while B1 runs:

- A1 active projection save failure retains A1 lease; B continues;
- A1 outbox enqueue failure retains A1 lease and creates no partial conflicting item;
- A1 durable projection plus enqueue allows exact cleanup even if remote append later fails;
- A1 remote append failure retains one exact recoverable outbox item and never blocks B enqueue/provider lifetime under the global outbox lock;
- A1 receipt-save failure leaves its item recoverable and cannot regress B receipts/checkpoints;
- A1 acknowledgement failure/retry cannot remove B's item;
- model-free A1 retry performs zero provider/start calls and creates no run, turn, message, generation, staging or child;
- A and B may reverse completion/failure order without cross-owner writes;
- exact duplicate receipts/acknowledgements converge independently;
- old-generation A1 post-frontier recovery cannot mutate A2 or B1.

Temporary outbox/projection files must establish exact bytes and lock boundaries without touching user data.

## Shutdown And Restart Recovery Coverage

Automated shutdown/recovery tests must prove:

- two exact child handles are snapshotted in deterministic order and controlled outside the registry lock;
- both controls are attempted when one returns an error;
- no synthetic cancellation/completion settlement is emitted by shutdown itself;
- late workers from the prior app epoch cannot deliver into new dispatcher routes;
- restart inspection is empty and restores no child handle, active runtime entry, process capacity or route;
- persisted A/B pending turns are independently classified using exact generation/session/run/turn evidence;
- exact recoverable interrupted or post-frontier evidence resumes model-free and Journey-keyed;
- contradictory/stale A evidence fails closed without changing B;
- no duplicate Mirror append, receipt or assistant message appears after restart.

## Focused Commands

Run from the Harness repository; adjust only if TDD introduces a narrower dedicated test module:

```bash
npm test -- --run \
  src/tests/journeyRuntimeIntegration.test.ts \
  src/tests/journeyRuntimeState.test.ts \
  src/tests/piProcessEventDispatcher.test.ts \
  src/tests/piProcessStream.test.ts \
  src/tests/journeySettlement.test.ts \
  src/tests/journeySettlementRecovery.test.ts \
  src/tests/journeyPersistenceCoordinator.test.ts \
  src/tests/mirrorAppendOutbox.test.ts \
  src/tests/mirrorAppendOutboxStorage.test.ts \
  src/tests/conversationRestartLifecycle.test.ts

cargo test --manifest-path src-tauri/Cargo.toml pi_process_registry
```

Also include any new dedicated targeted-cancellation or shutdown/recovery test file in the focused gate.

## Full Automated Gates

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --features development-channel
git diff --check
```

Static/scope checks must verify:

- changed Markdown local links resolve;
- `PRODUCTION_PI_PROCESS_LIMIT` has exactly one definition and remains exactly `2`;
- supported inspection limits remain exactly `1|2` and no capacity/fault environment override exists;
- `TurnCorrelation` remains schema `0.2.0`;
- `RunAuthority`, `PiProcessEvent` authority and start/cancel/cleanup signatures remain unchanged;
- no untargeted process-name/PID search enters application source;
- remote Mirror append remains outside the global outbox-file lock;
- mock streaming remains free of Tauri imports;
- no changes enter Mirror runtime, RS015, stable promotion, release, deployment or unrelated roadmap packages.

## DEV-Only E2E Decision

E2E is **required** because US-3's observable promise is selective control and settlement with a real sibling child still alive.

Use only **Nautilus Harness Dev** and disposable ready DEV Journeys. Record stable app-data and production Mirror baselines read-only before every scenario group. Stop all prior DEV processes and begin with empty native occupancy.

No validation action may use stable app-data, production Mirror, an unrecorded PID, broad `pkill`/name matching or a production fault switch.

## Scenario A — Targeted Cancellation With Sibling Continuation

1. Start naturally long A1 and B1 prompts that produce verifiable observed output and no repository mutation.
2. Capture bounded native inspection and direct parent/child evidence for exactly two distinct authorities and children.
3. Capture B1 runtime/projection/process evidence before cancellation.
4. Select A and use its visible Cancel control once. Do not cancel B or signal either process externally.
5. Prove the native cancel command targeted exact A `journeyId + runId`; A alone transitions through requested/cancelled/interrupted/finalizing.
6. While A settles, navigate to B and prove B's exact child PID remains alive, its stream continues and its runtime has no A diagnostic.
7. Let B finish naturally. Verify A exact interrupted persistence and B exact committed Harness/Pi/Mirror persistence.
8. Verify A created no fabricated completed outbox pair; any legitimate recoverable evidence is exact and Journey-keyed.

Expected: only A stops; B continues naturally and owner-correctly.

## Scenario B — Controlled Exact Process Death With Sibling Continuation

Use a fresh pair and a fresh native registry:

1. Start naturally long A2 and B2 and capture complete authority plus exact direct PIDs.
2. Reconfirm immediately before signalling that the chosen PID is A2's direct child and B2 has a different PID.
3. Send one termination signal only to A2's exact recorded disposable DEV child from the validation harness. Do not use a name search, wildcard, process group or app Cancel command.
4. Prove A2 alone emits process/error terminal evidence and enters exact interrupted settlement.
5. Prove B2's PID, stream, runtime, projection and natural completion remain owner-correct.
6. Verify no production fault configuration or application source was added for the scenario.

If PID/authority correlation is missing or changes before the signal, abort the scenario without signalling.

Expected: an ordinary exact A process death is isolated; B continues.

## Scenario C — Two-Child Shutdown And Restart Recovery

Use a third fresh pair:

1. Start A3/B3 and prove exactly two live direct children and exact authorities.
2. Close the DEV app normally without manually cancelling either run.
3. Record that no more than the two exact owned children were targeted and both app/child processes exit.
4. Restart DEV and wait for bounded startup inspection to settle.
5. Prove zero restored invocation child, route, working badge or process capacity.
6. Verify each A3/B3 persisted turn is independently classified/recoverable from exact projection/outbox evidence.
7. Perform only model-free recovery authorized by persisted evidence; verify no provider child or duplicate message/append is created.
8. Restart once more if needed to prove idempotent convergence.

Expected: shutdown is bounded and restart recovery is exact, independent and model-free.

## Navigator Validation

Expected observation: in each fresh pair, terminating/cancelling A changes only A while B continues. Completed and interrupted settlement remain tied to start-captured authority. Shutdown targets only two exact children; restart restores no live invocation and recovers only persisted evidence.

Pass condition: focused/full gates pass; exact A targeting and first-terminal precedence are deterministic; live scenarios prove B sibling continuity for cancellation and process death; controlled frontier failures remain owner-local/model-free; shutdown/restart is bounded; capacity remains `2`; stable app-data and production Mirror have zero delta.

Fail condition: wrong/sibling process control, more than two children, selected-state retargeting, duplicate terminalization, B byte changes from A events, fabricated completed evidence, cross-Journey projection/outbox/receipt mutation, stale A1 mutation of A2, global-lock provider/remote/child work, unbounded shutdown, phantom restart invocation, capacity/schema drift or stable/production mutation fails Validation.

## Validation Evidence

Pending implementation authorization, TDD, automated gates and explicit later Navigator Validation authorization. This guide authorizes no implementation, DEV signalling, cancellation smoke, push, promotion, release or deployment.
