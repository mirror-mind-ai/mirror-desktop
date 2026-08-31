[< Story](index.md)

# Test Guide — DS-009.TS-4

## Test Boundary

Prove captured-authority settlement, per-Journey save/finalization serialization, durable lease release and persisted recovery while production remains globally serial at capacity 1.

This story does not test capacity 2, simultaneous Pi children, real persistence overlap, US-2, US-3, RS015, stable promotion, release or deployment. Pure tests may interleave two Journey coordinators with deferred barriers to prove isolation, but no test or smoke changes the production registry limit or starts concurrent real processes.

## Deterministic Test Architecture

Use dependency injection at every asynchronous boundary:

- immutable `RunAuthority` fixtures for A1, A2 and B1;
- distinct generation-scoped A and B projection byte fixtures;
- deferred Promises or explicit barriers for transcript, save, enqueue, cleanup, append, receipt-save and acknowledgement;
- fake per-Journey persistence queues with an operation log;
- temporary directories/files for native save/outbox durability and restart recovery;
- fake native occupancy inspection and cleanup responses;
- fake listener attachment/unlisten functions for dispatcher remount/reload;
- fake app restart that creates a new coordinator/registry instance while retaining only projection/outbox files; and
- exact before/after serialized bytes for non-owner and stale-replacement assertions.

Do not use timing sleeps, real Pi processes, production failure injection or mutable selected-Journey values as test synchronization.

## Canonical Authority Fixtures

```text
A1:
  journeyId=A
  runId=A1
  turnId=turn-A1
  threadId=thread-A
  generation=1
  piSessionId=pi-A-g1
  piSessionFile=/private/pi-A-g1.jsonl
  mirrorConversationId=mirror-A-g1
  harnessUserMessageId=user-A1
  harnessAssistantMessageId=assistant-A1

A2:
  same Journey A
  replacement run/turn/message IDs
  generation 1 or rollover generation 2 as required by the case

B1:
  entirely distinct Journey/thread/generation/Pi/Mirror/message authority
```

Every assertion compares the complete relevant authority. Journey ID alone is never sufficient.

## Required Deterministic Matrix

| Case | Setup and action | Required result |
|---|---|---|
| A completes with B selected | Start A1, capture its authority/context, switch presentation selection to B, complete A1 | Every persistence dependency receives A1 authority; no destination is derived from B |
| A transcript ownership | Transcript fake records lookup arguments during A1 completion | Lookup uses A1 `piSessionId + piSessionFile`; B and mutable projection paths are never read |
| A projection ownership | Apply Pi/Harness completion and durable save | Saved projection matches A Journey, thread, generation, run, turn and Harness message IDs |
| A outbox ownership | Create and enqueue after exact projection save | Item ID/destination are A1 turn, A thread/generation and A Mirror conversation |
| B byte isolation | Snapshot B projection, outbox summaries, runtime and diagnostic bytes before A settlement | All B bytes remain identical after A save, enqueue, cleanup, append, receipt and acknowledgement |
| No selected-Journey persistence | Mutate selected Journey B/C between every deferred A1 boundary | Logged transcript/save/outbox/append/ack targets remain A1 throughout |
| Same-Journey save ordering | Queue A1 save/finalization then A2 operation behind a barrier | FIFO order is deterministic; A2 starts only after A1 queue section exits |
| Same-turn duplicate join/idempotency | Dispatch A1 settlement/retry twice while first is in flight | One authoritative write sequence occurs or the duplicate joins; no conflicting second save/enqueue/cleanup |
| Different-Journey queue independence | Pure coordinator queues blocked A1 and B1 operations | Keys are independent without changing production process capacity; no cross-key state mutation |
| Queue failure release | A1 operation throws inside keyed coordinator | Queue bookkeeping releases in `finally`; next exact recovery may run without bypassing authority checks |
| Stale callback after A2 replacement | Pause A1 after any await, establish A2 persisted/current evidence, resume A1 | A1 performs no later save, enqueue, cleanup, append, ack or current diagnostic mutation; A2 bytes remain identical |
| Stale run rejection | Persisted turn is A2 but callback carries A1 in same generation | Reject before side effect with bounded stale-authority result |
| Generation rollover rejection | Pause A1, roll active thread to generation 2, resume generation-1 settlement write | No write to active generation 2 and no A2 lease release; only already-durable generation-1 append/ack recovery may proceed from exact outbox evidence |
| Authority recheck after await | Change persisted authority while a fake dependency is pending | Next continuation revalidates and stops before its side effect |
| Native per-Journey serialization | Two native saves for same Journey/generation meet a barrier | One keyed writer enters at a time; fixed staging collision is impossible |
| Native independent keys | Native saves for A and B use separate keyed locks in a pure/temp-file fixture | Locks do not establish destination authority and neither file receives the other's bytes |
| Durable projection save | Exact save succeeds in temp directory | Staged write, file sync, atomic rename and parent sync complete before success is returned |
| Projection save failure | Fail staged write/sync/rename before completion | No enqueue or cleanup call; prior valid projection remains intact and lease stays blocked |
| Projection authority mismatch | Payload Journey/thread/generation/run differs from captured authority | Native boundary rejects before replacing bytes |
| Outbox creation failure | Exact committed projection cannot create a valid item | Enqueue, cleanup, append and ack calls remain zero; lease retained |
| Enqueue failure retains lease | Save succeeds; enqueue fake fails/conflicts | Cleanup call remains zero, occupancy remains finalizing and admission remains blocked |
| Enqueue idempotent exact item | Identical A1 item already exists durably | Enqueue converges to existing success only after exact projection/authority validation |
| Enqueue conflict | Same item ID has different authority or payload | Conflict remains fail-closed; no cleanup |
| Durable pending outbox releases lease | Save and enqueue succeed; append fake remains pending/fails | Exact cleanup plus fresh inspection may release occupancy; outbox remains durable and retryable |
| Cleanup/reinspection ambiguity | Cleanup response is missing/mismatched or inspection is malformed/reports replacement | Occupancy remains blocked; no free projection is emitted |
| Append retry | Restart/retry from exact pending A1 outbox | No Pi start or new turn; append targets exact item and owner |
| Inserted receipt | Append returns two exact `inserted` messages | Mirror projection commits once, saves durably, then exact ack executes |
| Existing receipt | Append returns two exact `existing` messages | Treated as success with exact destination/message validation |
| Repeated existing receipt | Apply same exact `existing` receipt to an already committed projection | Projection/checkpoints remain byte-for-byte unchanged; no message-count increment |
| Contradictory receipt | Receipt Journey, conversation, order, IDs or counts differ | Reject before projection save or acknowledgement |
| First acknowledgement | Exact Mirror-committed projection and item exist | Remove only exact item and return `acknowledged` |
| Repeated acknowledgement | Item is absent after prior ack; exact persisted projection proves the same committed turn | Return `already_acknowledged`; no file mutation and no error |
| Missing ack evidence | Item absent and persisted projection lacks exact Mirror commit | Fail closed; do not claim idempotent acknowledgement |
| Wrong-item acknowledgement | A1 ack targets A2 or B1 item/conversation | No item removed; all unrelated bytes unchanged |
| Interrupted save frontier | Cancelled/failed A1 exact interrupted projection saves durably | Cleanup may run only after save success; no outbox is invented |
| Interrupted save failure | Durable interrupted save fails | Cleanup remains zero and lease/admission remain blocked |
| Recovery creates no work | Execute projection/outbox/interrupted recovery | Pi starts, child spawns, new run/turn/message/generation/staging counts all remain zero |
| Retained exact recovery | Inspection A1 plus matching persisted A1 failure evidence | Only selected owner A can resume the recorded phase; B cannot dispatch it |
| Missing recovery handle | Inspection reports A1 finalizing but projection/outbox/interrupted evidence is absent or mismatched | Fail-closed occupancy with bounded allowlisted diagnostic; forced cleanup/restart/start calls remain zero |
| Diagnostic privacy | Seed private prompt, response, provider config, session path, environment, stdout/stderr and secret values | Recovery/inspection diagnostic contains none of the keys or values and remains bounded |
| Dispatcher repeated mount | Call mount/register repeatedly in one lifecycle | One native listener attachment and one delivery per event |
| Dispatcher dispose/remount | Dispose twice, remount, register exact route | Old listener unlistens once; exactly one new listener; no late old delivery |
| Dispatcher attachment race | Dispose/remount while first listener Promise is deferred | Lifecycle epoch retires first listener and keeps exactly one current listener |
| Frontend remount route recovery | Preserve module dispatcher, remount app, inspect A1 and load exact persisted projection | Route/settlement recovery binds once to A1; duplicate callback count remains zero |
| Full frontend reload | Construct a new dispatcher/coordinator, simulate old realm disposal, inspect current native leases | One listener in the new realm; exact authority only; no conversation content invented from inspection |
| Restart from pending outbox | New app/native coordinator with empty process registry and retained A1 projection/outbox files | Resume append/ack only; no child handle or native running lease restored |
| Restart after ack-before-crash | Projection is Mirror committed and outbox item may already be absent | Repeated ack/recovery converges idempotently and does not block a new invocation |
| Restart with projection but no outbox | Completed/pending persisted state lacks exact durable outbox recovery handle | Journey-scoped admission remains blocked with bounded diagnostic; no provider call or fabricated cleanup |
| Restart with interrupted projection | Exact interrupted state is durable and native registry is empty | Classify as settled interruption without fabricating child/lease; admission follows exact persisted state |
| Dead child non-restoration | Persist fake historical child metadata alongside valid projection/outbox fixture | Metadata is ignored; child/start counts stay zero |
| Production capacity invariant | Inspect Rust constant and production registry; run relevant tests | `PRODUCTION_PI_PROCESS_LIMIT == 1`; no runtime override or capacity-2 fixture enters production path |

## Ordered Settlement Assertions

Completed turn without existing outbox:

```text
validate(A1)
transcript(A1.piSessionId, A1.piSessionFile)
project(A1)
save_durable(A1 projection)
enqueue_durable(A1 outbox)
cleanup(A, A1)
inspect_native()
append(A1 outbox)
apply_receipt(A1)
save_durable(A1 mirror-committed projection)
ack(A1 item, A1 mirror conversation)
```

Required order:

```text
validate < transcript < project < save < enqueue < cleanup < inspect
inspect/free may precede append/ack completion
append < receipt-save < ack
```

Failure cut points:

```text
save failure                 => enqueue=0 cleanup=0
outbox creation failure      => enqueue=0 cleanup=0
enqueue failure/conflict     => cleanup=0
cleanup/inspection ambiguity => occupancy blocked
append/receipt-save/ack fail => occupancy may stay free; durable outbox retained
```

Existing exact durable outbox recovery:

```text
load exact projection + exact outbox
validate both against A1
cleanup exact retained A1 lease when still present
fresh inspect
append/retry
idempotent receipt-save/ack
```

An in-memory outbox summary alone is insufficient; persisted listing and projection evidence must match.

## Byte-for-Byte Isolation Fixture

Use canonical serialized A and B files plus in-memory runtime snapshots:

```text
beforeB = {
  projectionBytes,
  outboxItemsForB,
  runtimeEntry,
  occupancyEntry,
  mirrorCommitError,
  selectedDraft
}

settle A1 while selectedJourney=B

assert serialize(afterB) === serialize(beforeB)
```

The fixture must defer and resume every A phase independently so selection changes cannot accidentally pass only because settlement ran synchronously.

## Per-Journey Serialization Fixture

A dependency-injected queue log should prove:

```text
enter A1
block A1 save
queue A2
assert A2 not entered
release A1
assert exit A1 before enter A2
```

Then repeat with A1 and B1 queue keys to show key independence in pure logic. This is coordinator testing only; production process capacity and the native registry remain at 1.

## Stale Settlement Fixture

At each await boundary, run the same table-driven assertion:

```text
start A1 settlement
pause before next effect
replace persisted/current authority with A2 or generation 2
resume A1
assert next effect call count = 0
assert A2 full state bytes unchanged
assert A2 lease/occupancy unchanged
assert no A1 error appended to A2 diagnostics
```

Boundaries include transcript return, projection save return, enqueue return, cleanup return, append return, receipt projection save return and acknowledgement return.

## Receipt and Acknowledgement Idempotency Fixture

Required sequences:

```text
append A1 => inserted + inserted
apply receipt/save/ack
repeat append A1 => existing + existing
apply same receipt => projection unchanged
repeat ack => already_acknowledged
```

And:

```text
outbox item absent
projection not exact Mirror committed
repeat ack => fail closed
```

Assertions include exact Journey, conversation, ordered message IDs, inserted/existing counts, cumulative checkpoint and unrelated item preservation.

## Dispatcher Remount/Reload Fixture

Use deferred listener installation:

```text
mount lifecycle 1
pause listen attachment
dispose lifecycle 1
mount lifecycle 2
resolve lifecycle-1 listener
assert lifecycle-1 unlisten called once
resolve lifecycle-2 listener
inspect/recover A1 route twice
emit one event
assert one delivery and one settlement callback
```

For full reload, create a fresh dispatcher/coordinator and explicitly dispose the previous fixture. Inspection may restore only bounded authority/lifecycle identity; persisted projection must supply turn/message recovery evidence.

## Restart Recovery Fixture

Construct a new application state from files only:

```text
native registry = empty
projection store = retained temp files
outbox store = retained temp file
in-memory child handles/routes/queues = empty
```

Table-drive:

- exact pending outbox;
- exact Mirror-committed projection with item already acknowledged;
- completed/pending projection without outbox;
- interrupted projection;
- stale generation outbox;
- conflicting Journey/thread/Mirror authority.

Assert no child/start/provider calls in all cases. Only exact durable append/ack work may resume. Missing or conflicting handles remain blocked with bounded diagnostics.

## Native Persistence Tests

Add focused Rust tests around extracted helpers/state rather than Tauri windows:

1. same Journey/generation saves serialize deterministically;
2. stale generation or run authority rejects before write;
3. staged file is synced and atomically renamed before success;
4. failed staged write/rename preserves prior projection;
5. outbox enqueue identical item is idempotent and conflict is rejected;
6. acknowledgement removes only exact item after exact persisted Mirror commit;
7. repeated acknowledgement returns `already_acknowledged` only with exact persisted proof;
8. missing/contradictory proof fails closed;
9. restart reads projection/outbox files without restoring process handles; and
10. bounded errors expose allowlisted codes only.

No native test changes or injects the production process limit.

## TypeScript Contract Tests

Add or update focused tests proving:

- settlement dependencies require complete captured authority;
- A completion with B selected never reads B as a destination;
- save/finalization queue semantics are per Journey and deterministic;
- transcript load uses private A authority without projecting the path to events/inspection;
- exact projection/outbox validators run before every effect;
- cleanup follows durable enqueue, not append/ack;
- append/ack failure after enqueue does not restore occupancy;
- exact existing outbox is verified from persisted evidence;
- receipt `existing` and repeated acknowledgement are idempotent;
- stale run/generation continuation is rejected after each await;
- dispatcher remount/reload produces no duplicate listener or delivery;
- restart recovery uses persisted projection/outbox and creates no child/work; and
- missing recovery handle stays fail-closed and private.

Expected focused suites include:

- `src/tests/journeySettlement.test.ts`
- a focused per-Journey persistence coordinator suite if introduced;
- `src/tests/journeyRuntimeIntegration.test.ts`
- `src/tests/piInvocationOccupancy.test.ts`
- `src/tests/piProcessEventDispatcher.test.ts`
- `src/tests/mirrorAppendOutbox.test.ts`
- focused restart/recovery and storage tests.

## Required Commands

Run from the Harness repository after implementation:

```bash
npm test -- --run \
  src/tests/journeySettlement.test.ts \
  src/tests/journeyRuntimeIntegration.test.ts \
  src/tests/piInvocationOccupancy.test.ts \
  src/tests/piProcessEventDispatcher.test.ts \
  src/tests/mirrorAppendOutbox.test.ts
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --features development-channel
git diff --check
```

If implementation introduces narrower suites, include them in focused validation and record exact commands/counts in `validation.md`.

Scope checks against the approved Plan commit must show no changes to later stories, RS015 or capacity:

```bash
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD
git diff "$APPROVED_PLAN_COMMIT"...HEAD -- src-tauri/src/pi_process_registry.rs
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD -- \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-us-2-operate-multiple-journeys-concurrently \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-us-3-targeted-journey-cancellation-and-settlement \
  docs/project/roadmap/rs-015
git status --short
```

Any capacity change or forbidden-scope diff fails TS-4.

## Navigator Validation

### Deterministic route — authoritative

1. Run the focused authority, serialization, settlement, outbox, dispatcher and restart suites.
2. Inspect named test output for every row in the required matrix.
3. Verify A/B byte isolation and stale A1/A2 replacement fixtures use deferred barriers rather than timing.
4. Verify native durable saves and idempotent acknowledgement against temporary files.
5. Confirm production capacity remains exactly 1 and no real overlap fixture exists.

Expected observation: all owner destinations derive from one captured authority; same-Journey writes serialize; save/enqueue failures retain occupancy; durable enqueue releases occupancy despite pending append/ack; stale work cannot mutate replacements; remount/restart is exact and model-free.

Pass condition: focused and full gates pass, all exact argument/call-count/byte assertions hold, production capacity is 1, and forbidden scope is empty.

Fail condition: tests rely on selected Journey, sleeps, real process concurrency or non-exact equality; any release precedes durable save/enqueue; post-enqueue append failure blocks occupancy; stale work writes; idempotency corrupts checkpoints; restart restores a child; or private data enters diagnostics.

### Nautilus Harness Dev route — later Validation only

If required after implementation, use only **Nautilus Harness Dev**, Mirror Dev coordinates and disposable Journeys. Stable remains closed.

Use sequential execution only:

1. Start A and select B while A works.
2. Observe A complete and verify A projection/outbox ownership while B remains unchanged.
3. Confirm only one child/lease is admitted at any time.
4. Exercise a recoverably pending append/ack after durable enqueue without starting B until exact cleanup/reinspection reports free.
5. Then start B sequentially.
6. Remount/reload only at a safe planned boundary; never destroy an unrecoverable live frontend route to manufacture a failure.
7. Restart the app only with persisted projection/outbox evidence prepared by normal behavior; verify no phantom running child.
8. Confirm missing-handle behavior through deterministic tests rather than corrupting production data.
9. Reconfirm stable app-data and production Mirror isolation.

Expected observation: selected Journey never retargets persistence; append/ack retry is model-free and does not retain a released lease; reload/restart has one listener and no phantom run; unresolved evidence remains blocked.

No simultaneous Pi children, capacity 2, forced production errors, stable launch/promotion, release or deploy is authorized.

## E2E Decision

A DEV-only sequential smoke is expected because storage, outbox and remount/restart boundaries may change, but deterministic tests remain authoritative for failures, interleavings and phases that cannot be safely captured. Validation must not manufacture retained leases by corrupting persistence or forcing production failures.

## Regression Invariants

- Persisted `TurnCorrelation` remains schema `0.2.0`.
- `RunAuthority` remains the only complete live-run authority.
- Existing `PiProcessEvent` authority and privacy boundary remain unchanged.
- `start_pi_invocation(prompt, config, runAuthority)` remains the only start boundary.
- Cancel and cleanup continue requiring exact `journeyId + runId`.
- Child capacity and Journey finalization lease remain separate.
- One central app-lifetime dispatcher remains authoritative.
- Native inspection remains bounded, deterministic, private and trigger-driven.
- Text drafts remain editable while occupancy blocks operational actions.
- Production capacity remains exactly 1 through all TS-4 work.
- Mock streaming remains Tauri-free.
- US-2 alone may later raise capacity to 2.
- US-3 retains cancellation/settlement-under-real-concurrency scope.
- RS015, stable promotion, release and deployment remain untouched.

## Stop Conditions

Stop before implementation continuation or Validation if:

- any planned change requires capacity 2, simultaneous processes or process/finalization overlap;
- selected Journey or visible conversation must become persistence authority;
- release would occur without durable projection plus outbox enqueue;
- exact recovery requires inventing a child, run, turn, message, generation or staging;
- missing recovery evidence can be resolved only by forced cleanup;
- `RunAuthority`, `TurnCorrelation`, event authority or inspection privacy must be weakened;
- deterministic tests cannot prove ordering without sleeps/real processes;
- US-2, US-3, RS015, stable, release or deploy scope becomes necessary; or
- a required gate fails without a narrow TS-4 correction.

## Validation Evidence

Pending implementation and Validation. This guide plans deterministic and DEV-only evidence; it does not authorize implementation, capacity increase, overlap, stable promotion, release or deployment.
