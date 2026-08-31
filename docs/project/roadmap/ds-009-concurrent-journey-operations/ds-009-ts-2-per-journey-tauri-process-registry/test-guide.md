[< Story](index.md)

# Test Guide — DS-009.TS-2

## Test Boundary

Validate a bounded native registry keyed by `journeyId` while production remains globally serial at limit 1. Tests prove atomic reservation before spawn, one immutable `RunAuthority` per entry, directed `journeyId + runId` mutation, separate process-capacity and Journey-lease states, idempotent terminalization and private bounded inspection.

This story does not validate capacity 2, simultaneous Pi children, settlement/persistence overlap, TS-4 durability rules, US-2/US-3 behavior or RS015.

## Deterministic Test Architecture

Prefer a focused Rust module with an injected limit and a fake child/process-control seam. Registry state transitions must be testable without Tauri windows, real providers, process timing or sleeps.

Use:

- `Arc<Barrier>` and threads for simultaneous reservation attempts;
- fake child IDs/handles and explicit terminal callbacks;
- allowlisted terminal causes and inspection reason codes;
- exact `RunAuthority` fixtures derived from existing TS-1 test helpers;
- a production constructor fixed to limit 1; and
- a test constructor that accepts a validated limit.

Every callback helper receives the expected `journeyId + runId`. Assertions compare the full entry/inspection before and after stale operations.

## Required Rust Matrix

| Case | Setup and action | Required result |
|---|---|---|
| Two concurrent reservations | Different Journeys synchronize on a barrier and call reserve against one limit-1 registry | Exactly one reservation succeeds, one returns capacity rejection, one entry exists and process capacity is claimed once |
| Duplicate Journey | Reserve A1, then reserve A2 under the same `journeyId` | A2 is rejected as duplicate while A1 remains byte-for-byte unchanged, regardless of distinct `runId` |
| Global capacity rejection | Reserve A1, then reserve B1 at limit 1 | B1 is rejected; no B entry or child-spawn authorization exists |
| Finalizing lease admission | Terminalize A1 so process capacity is released but lease remains finalizing, then reserve B1 | B1 remains rejected at production limit 1; TS-2 does not introduce settlement overlap |
| Mismatched directed cancel | A1 is running; cancel targets A with another `runId`, or B with A1's `runId` | Request fails closed; A1 child, cancellation, terminal state and events are unchanged |
| Targeted cancel | A1 is running; cancel targets exact A/A1 | Only A1 becomes cancellation-requested and its child receives one kill request; no other entry changes |
| Cancel before child attachment | A1 is reserved; matching cancel arrives before fake spawn attaches | Request is retained; attached child is immediately cancelled/terminalized and cannot escape ownership |
| Spawn failure after reservation | A1 reserves capacity; fake spawner fails | A1 becomes finalizing/spawn_failed, capacity releases once, bounded error/done decision occurs once, lease remains until cleanup |
| Cancel/done race | Matching cancel and successful/failed child terminal callbacks race behind a barrier | One terminal outcome wins, capacity releases once, terminal/done emission decision occurs once and lease remains finalizing |
| Process death | Fake child reports unexpected non-success/process disappearance without cancellation | A1 becomes finalizing/process_died, capacity releases once and bounded failure evidence is retained |
| Repeated terminal signal | Deliver the same or competing terminal callbacks multiple times | State remains the first accepted terminal outcome; no second capacity decrement or terminal event decision occurs |
| Stale runId removal | Clean A1, reserve A2, then deliver A1 cleanup/terminal/cancel callbacks | A2 remains unchanged and present; stale callbacks return stale/idempotent results only |
| Matching cleanup | A1 is finalizing with released process capacity and the caller has reached its applicable durable boundary; release exact A/A1 lease twice | First release removes A1; second is idempotent; no capacity underflow occurs |
| Premature native cleanup | A1 is reserved or running | Cleanup is rejected and cannot kill, terminalize or remove A1 |
| Successful save plus enqueue | Completed A1 has native evidence; dedicated projection/save and durable outbox enqueue succeed | Caller requests exact A1 cleanup once; lease is removed |
| Enqueue durable, append/ack pending | Projection/save and enqueue succeed, but Mirror append or acknowledgement remains pending | Cleanup is allowed because the outbox is the durable recovery handle |
| Projection/save failure before enqueue | Completed A1 cannot durably save its projection | No cleanup call occurs; A1 remains finalizing and limit 1 rejects another Journey |
| Enqueue failure | Projection/save succeeds but outbox creation/enqueue fails | No cleanup call occurs; A1 remains finalizing and another Journey is rejected |
| Missing native evidence | Completed presentation lacks required native completion evidence | No cleanup call occurs; A1 remains finalizing |
| Interrupted-state save failure | Cancelled/failed A1 cannot durably save interrupted state | No cleanup call occurs; A1 remains finalizing and capacity admission stays blocked |
| Interrupted-state save success | Cancelled/failed A1 saves interrupted state durably | Caller may request exact A1 cleanup once |
| Later durable retry | A1 initially retains its lease after save/enqueue failure; matching retry later reaches durable enqueue | Retry uses captured A/A1 and releases exactly that lease |
| Presentation finalization only | `finalization_finished` is emitted from `finally` without a durable branch result | No cleanup command is invoked, Recording ends, A1 remains finalizing and `runtimeBusy`/aggregate operational admission stays blocked |
| Retained lease with B selected | A1 presentation is terminal, native A1 lease is finalizing and B is selected | B text draft remains editable; Send, Enter, attachments, settings/admin mutations and every start/staging path remain blocked |
| No staging while inspected occupied | Local presentation is idle but inspection reports A1 finalizing | No user/assistant message creation, correlated turn staging, conversation save or start command occurs |
| Exact cleanup success | Cleanup returns success for captured A/A1 and reconciliation shows no blocking replacement | A1 occupancy is removed and only then are operational controls re-enabled |
| Cleanup failure/mismatch | Cleanup fails, has no response, returns another pair or inspection still reports A1 | Occupancy and aggregate admission remain blocked |
| Frontend reload reconciliation | Reload/remount occurs inside the same Tauri process while A1 lease exists | Inspection completes before controls enable and reconstructs exact occupancy only |
| Empty local state, occupied native state | Frontend starts with no runtime/occupancy entry; inspection reports A1 | Admission remains fail-closed and no mutation/staging occurs |
| Native reservation TOCTOU | Local inspection says free, another reservation wins before start | Backend atomically rejects the loser, no second child exists and reversible staging is rolled back before controls re-enable |
| Stale inspection/cleanup | Stale A1 inspection or idempotent cleanup response arrives while A2 is current | A2 occupancy remains unchanged; A1 result cannot mark the Journey or app free |
| Retained owner error scope | A1 is finalizing after save/enqueue failure while B is selected | A error/retry is owner-scoped; neither A nor B falsely renders Working/Recording |
| Matching persisted recovery | Inspection reports A1 and persisted correlated turn/generation evidence reports the same A1 failure | Retry is available only when A is selected and resumes only that failed settlement phase |
| Recovery creates no new work | Execute matching A1 retry | No child/start call, new `runId`, `turnId`, user/assistant message, staged turn or generation restart occurs |
| Non-owner recovery rejection | A1 is retained while B is selected | B cannot see or dispatch A1 retry; only B textual draft editing remains mutable |
| Mismatched persisted recovery | Inspection reports A1 but persisted retry evidence reports A0 or another turn/generation | Retry is rejected, A1 remains occupied and no cleanup occurs |
| Missing persisted recovery evidence | Inspection reports A1 but no matching correlated recoverable turn exists | Occupancy remains fail-closed; owner receives bounded diagnostic and forced cleanup is unavailable |
| Recovery failure | Matching A1 retry fails again during projection/save, enqueue/append/ack or interrupted-state save | A1 lease and global admission block remain unchanged |
| Recovery reaches durability | Matching A1 retry reaches durable enqueue or interrupted-state save | Exact A1 cleanup is called once; controls remain blocked until cleanup confirmation |
| Generic restart/repair blocked | A1 lease is retained and UI attempts generation restart, generic Journey repair or another pending-turn retry | Every generic operation is absent/disabled or fails before mutation |
| Stale durable retry | A1 retry completes after A1 is gone and A2 is current | Exact A1 cleanup cannot release or mutate A2 |
| Bounded inspection | Inspect reserved, running and finalizing fixtures | Deterministically ordered entries expose only bounded authority/lifecycle fields and allowed reason codes |
| Inspection privacy | Populate prompt, provider config, private session path, environment-like values and raw failure text inside test entry/private fixture | Serialized inspection contains none of those values or field names |
| Injected limit 1 | Construct through test limit 1 and through production constructor | Both enforce the same one-entry admission and serial-finalization behavior; production constant is exactly 1 |
| Invalid injected limit | Construct with zero or above the internal maximum | Construction fails without creating an unbounded registry |

## State-Transition Assertions

At minimum, exercise this fixed sequence:

```text
reserve A1
assert lease=reserved, process=reserved, capacity=1
attach child A1
assert lease=running, process=running, capacity=1
terminalize A1 completed
assert lease=finalizing, process=released, capacity=0
attempt reserve B1 at production limit 1
assert rejected because A1 lease still occupies the admitted slot
release lease A1
assert registry empty, capacity=0
reserve B1
assert success
```

Stale replacement sequence:

```text
reserve/attach/terminalize A1
release A1
reserve/attach A2
call terminalize A1
call cancel A1
call release A1
assert A2 entry, child, authority, capacity and inspection unchanged
```

Race sequence:

```text
reserve/attach A1
barrier(cancel A1, child done A1)
join both callbacks
assert cancellation requested at most once
assert terminal state chosen once
assert capacity released once
assert terminal/done emission decision chosen once
assert A1 finalizing until directed cleanup
```

## Native Command Adapter Tests

Add focused tests around the command seams or extracted pure adapters proving:

1. `start_pi_invocation` accepts `prompt`, `config` and one `RunAuthority`; it does not accept independent competing start identity.
2. Backend authority validation completes before reservation and reservation completes before the spawn dependency is called.
3. A reservation rejection means the spawn dependency is never called.
4. Every setup/spawn error after reservation calls matching idempotent terminalization.
5. Child attachment compares `journeyId + runId` and cannot attach to a stale/replacement entry.
6. `cancel_pi_invocation(journeyId, runId)` invokes kill and emits `cancelled` only for the matching current run.
7. `release_pi_invocation_lease(journeyId, runId)` removes only a matching finalizing lease.
8. `inspect_pi_invocations()` returns the dedicated bounded projection rather than serializing registry entries.
9. Worker normal exit, cancelled exit, wait failure and process death converge through the same expected-run terminalization API.
10. Native `done` remains authority-bearing and is emitted once after existing stdout/stderr joins and post-processing Mirror evidence.

## TypeScript Contract Regressions

Update or add focused tests proving:

- `livePiAgentStream()` still invokes `start_pi_invocation` with exactly `prompt`, `config` and the original immutable `runAuthority`;
- route registration still completes before start and only matching native `done` closes the central route;
- `cancelLivePiInvocation(journeyId, runId)` passes both exact values to `cancel_pi_invocation`;
- `App.tsx` derives cancel target from the selected runtime owner's captured identity, never from a stale selected Journey string alone;
- mismatched/non-owner UI cannot issue a cancel target;
- frontend presentation `finalization_finished` never invokes lease cleanup by itself or through an unconditional `finally`, and does not clear aggregate operational occupancy;
- explicit native occupancy remains keyed by complete captured identity after Recording ends;
- B text drafting stays enabled under retained occupancy while Send, Enter, attachments, settings/admin mutations, generation restart, generic repair, unrelated pending-turn retry and all start/staging paths remain blocked;
- exact settlement retry is rendered/dispatched only for the selected owner whose persisted correlation/generation matches the inspected `journeyId + runId`;
- B or another non-owner cannot invoke A's retained settlement recovery;
- no user/assistant message construction, new `runId`/`turnId`, `stageCorrelatedTurn`, new-turn conversation save or `start_pi_invocation` occurs during exact settlement retry or while inspection is occupied/unknown;
- completed-turn cleanup receives the same captured owner `journeyId + runId` only after native evidence, dedicated projection/save and durable outbox enqueue succeed;
- append or acknowledgement pending after enqueue does not suppress cleanup;
- projection/save failure, missing native evidence, enqueue failure and interrupted-state save failure suppress cleanup and retain the lease;
- cancelled/failed-turn cleanup occurs only after durable interrupted-state save;
- initialization/reload inspection is crossed with persisted correlated turn/generation evidence before exposing retry; inspection alone never invents recovery authority;
- inspected A1 with persisted A0 or missing recovery evidence remains blocked with bounded owner diagnostic and no forced cleanup;
- later matching settlement recovery resumes only the recorded projection/save, outbox enqueue/append/ack or interrupted-state-save failure using the original captured `journeyId + runId`;
- retry failure retains occupancy, while durable retry success calls exact cleanup once; a stale retry cannot release a replacement run;
- exact cleanup success/idempotent success clears only matching occupancy; cleanup failure, mismatch, missing response or retained inspection stays fail-closed;
- frontend initialization/reload reconciles native inspection before enabling operations, including local-empty/native-occupied state;
- ambiguous cleanup/retry triggers bounded reinspection without polling, and stale inspection responses cannot clear newer occupancy;
- owner error/retry stays owner-scoped without false Working or Recording;
- inspection adapters expose the bounded native type only;
- Journey-keyed frontend runtime and one app-lifetime dispatcher behavior remain unchanged; and
- mock streaming remains Tauri-free.

Expected suites include compatible updates to:

- `src/tests/piProcessStream.test.ts`
- `src/tests/piProcessEventDispatcher.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- focused cancellation/finalization integration tests if a narrower file is introduced.

## Frontend Occupancy and Admission Reconciliation

Use a pure authority-bound occupancy model and dependency-injected inspection/cleanup adapters. Presentation state alone must not determine operational admission.

Required fixture:

```text
frontend local runtime empty
occupancy status = reconciling
assert all operational controls and pre-staging paths blocked
inspection returns A1 finalizing
assert occupancy known occupied(A1)
select B
assert B text draft editable
assert Send/Enter/attachments/settings/admin/start/stage blocked
emit finalization_finished for A1 presentation
assert no Working/Recording and occupancy still blocked
cleanup A1 fails or response is missing
assert occupancy still blocked
matching retry reaches durable boundary
cleanup returns success for A1
reinspect if response is ambiguous
assert occupancy removed only when exact outcome is known
assert controls enabled only after removal
```

A second fixture must race a known-free local check against native reservation. The backend remains the final atomic decision; one reservation wins, the loser creates no second child, and any reversible pre-agent staging is durably rolled back before operational controls can become available.

Inspection triggers are bounded to initialization/reload, unknown local state before enabling capacity, and divergent cleanup/retry outcomes. Tests must assert no interval/timer or unbounded polling loop is introduced. Inspection identity updates occupancy only; it must not populate conversation, prompt, message, stream or settlement fields.

## Exact Owner-Scoped Settlement Recovery

Inspection and persisted recovery evidence must be joined before retry is exposed:

```text
inspect native lease A1
load persisted dedicated correlated turn
compare journeyId, runId, turnId, thread/generation and session identity
if exact and failure phase is recoverable:
  expose retry only when A owner is selected
else:
  retain occupancy
  expose bounded owner diagnostic
  do not force cleanup
```

Required recovery fixture assertions:

```text
retained A1 + matching persisted A1 enqueue failure
  => A-only retry available

select B
  => A retry absent and undispatchable

invoke A1 retry
  => start_pi_invocation calls = 0
  => child spawn calls = 0
  => new runId/turnId/messages/staging = 0
  => only existing projection/save/outbox/interrupted phase may execute

inspection A1 + persisted A0
  => retry rejected; A1 retained

inspection A1 + no persisted correlated turn
  => bounded diagnostic; occupancy retained; cleanup calls = 0

matching A1 retry fails
  => occupancy retained; admission blocked

matching A1 retry reaches durable enqueue or interrupted save
  => release_pi_invocation_lease(A, A1) called exactly once
  => operations remain blocked until exact cleanup confirmation

generic generation restart/Journey repair/unrelated turn retry
  => blocked before mutation
```

The recovery fixture must use the same persisted correlation and generation evidence already owned by the failed turn. It may not synthesize authority from inspection, selected Journey or current draft. Append/ack retry after durable enqueue remains model-free settlement work for the same turn and cannot create a child.

## Frontend Durable Cleanup Authorization

The registry itself remains persistence-agnostic, so use a pure/dependency-injected frontend decision seam to prove when the command is or is not invoked. The fixture must distinguish presentation completion from durable settlement results.

Required deterministic cases:

```text
completed + native evidence + projection saved + outbox enqueued
  => release exact captured lease

completed + outbox enqueued + append pending
  => release exact captured lease

completed + outbox enqueued + acknowledgement pending
  => release exact captured lease

completed + projection/save failed before enqueue
  => retain lease

completed + enqueue failed
  => retain lease and reject another Journey under production limit 1

completed + native evidence missing
  => retain lease

cancelled/failed + interrupted save failed
  => retain lease

cancelled/failed + interrupted save succeeded
  => release exact captured lease

finalization_finished from finally, without a successful durable result
  => retain lease; invoke no cleanup command

matching retry later completes projection/save + enqueue
  => release original captured journeyId + runId

stale retry A1 after A2 replacement
  => A2 unchanged; A1 cleanup rejected/idempotent
```

Tests must assert command call count and exact arguments, not only resulting presentation state. They must also assert that failure branches leave the native inspection in `finalizing` and that another Journey reservation remains rejected at production limit 1.

## Authority and Privacy Assertions

Use the complete existing `RunAuthority` fixture, including private `piSessionFile`, but assert:

- entry identity comes from that object once;
- event authority remains the existing bounded projection;
- inspection may include only bounded event authority plus lifecycle enums/booleans/reason codes;
- no registry method accepts provider/session/event fragments as replacement authority; and
- serialized inspection does not contain these keys or test values:

```text
prompt
response
content
providerConfig
command
args
piSessionFile
sessionFile
path
environment
env
secret
token
apiKey
stdout
stderr
```

Raw arbitrary error strings must be mapped to allowlisted reason codes before inspection.

## Required Commands

Run from the Harness repository after implementation:

```bash
cargo test --manifest-path src-tauri/Cargo.toml pi_process_registry
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --features development-channel
npm test -- --run src/tests/piProcessStream.test.ts src/tests/piProcessEventDispatcher.test.ts src/tests/journeyRuntimeIntegration.test.ts
npm test
npm run build
git diff --check
```

If the focused module/suite names differ, record equivalent commands in `validation.md`.

Inspect scope against the later approved Plan commit:

```bash
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD -- \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-ts-4-concurrent-persistence-guardrails \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-us-2-operate-multiple-journeys-concurrently \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-us-3-targeted-journey-cancellation-and-settlement \
  docs/project/roadmap/rs-015
git status --short
```

Forbidden-scope diffs must be empty.

## Navigator Validation

### Deterministic route — authoritative

1. Run the focused registry suite.
2. Inspect named test output for:
   - one winner under simultaneous limit-1 reservation;
   - duplicate Journey and capacity rejection;
   - directed cancel match/mismatch behavior;
   - reservation-before-spawn proof;
   - spawn failure, process death and cancel/done convergence;
   - process capacity released while the Journey remains finalizing;
   - production limit 1 rejecting another Journey until matching cleanup;
   - stale A1 callbacks leaving replacement A2 unchanged; and
   - bounded inspection privacy.
3. Run focused TypeScript command-contract regressions.
4. Review the implementation diff for no persistence, capacity-2, sibling story or RS015 change.

Expected observation: deterministic tests pass without sleeps; one registry entry is authoritative; every mutation uses exact Journey/run identity; process capacity and lease states transition independently; production remains serial; inspection is bounded and private.

Pass condition: focused/full tests and both Rust channel suites pass, production limit is exactly 1, the scope diff is clean, and no test requires simultaneous real Pi children or concurrent settlement.

Fail condition: atomicity depends on timing; two reservations win; child spawn precedes reservation; wrong/stale targets mutate an entry; capacity underflows/leaks; a finalizing Journey is released early; inspection leaks private data; or TS-4/US-2 behavior is introduced.

### Nautilus Harness Dev route — required, non-promoting

Use only **Nautilus Harness Dev** and disposable development Journeys. Stable must remain closed.

1. Start one run in Journey A and observe normal correlated stream delivery.
2. During A, verify another start remains blocked by frontend aggregate admission and production limit 1.
3. Let A reach `finalization_finished` while deliberately observing native finalizing occupancy; verify Recording ends, A exposes retry only when persisted correlation matches the inspected lease, and B may edit text but cannot dispatch A retry, Send, press Enter, mutate attachments/settings/admin state, restart/repair or stage/start a turn.
4. Reload/remount the frontend within the same Tauri process and verify inspection restores A occupancy before operational controls enable but exposes recovery only after matching persisted correlated turn evidence is loaded.
5. Verify the exact A lease disappears only after native evidence, dedicated projection/save and durable outbox enqueue succeed; append/ack may remain pending after enqueue.
6. Start Journey B only after exact cleanup confirmation removes aggregate occupancy and verify normal serial operation.
7. In a separate sequential scenario if required, cancel the selected owner, durably save interrupted state, then verify the directed pair cancels and releases that run through one terminal `done` plus one matching cleanup.
8. Inspect the bounded registry surface during available phases and confirm no private fields or payloads appear.
9. Confirm there was never more than one admitted live/finalizing lease and no stable data was touched.

Expected observation: visible behavior remains serial and coherent; presentation Recording may finish while native occupancy keeps every mutation/start path blocked; drafts remain editable; inspection reconciles reload before enablement; only exact cleanup re-enables operations; B cannot overlap A; no stale owner state or duplicate terminal signal appears.

Pass condition: deterministic authority tests pass and the Dev smoke shows sequential registry lifecycle with no concurrency, leak or stable-channel interaction.

Fail condition: `finalization_finished` or an unsuccessful durable branch releases A; a second Journey starts while a retained finalizing lease exists; cancel/cleanup targets the wrong run; completion duplicates or leaks capacity; inspection exposes private data; or validation requires capacity 2.

## E2E Decision

A development-channel serial smoke is required because Tauri command ownership changes. It is supplementary to deterministic Rust tests, which are the authority for races and interleavings. Do not run simultaneous Pi children, promote stable, release or deploy.

## TS-4 Boundary Checks

Review the diff and tests to prove TS-2 did not add:

- per-Journey persistence queues or locks;
- new persistence/outbox ordering or a replacement settlement protocol;
- outbox/projection recovery redesign;
- another Journey process admitted while a retained finalizing lease occupies production limit 1; or
- any settlement concurrency fixture.

TS-2 preserves the existing serial durable safety boundary and integrates registry-derived occupancy into frontend admission: completed turns request persistence-agnostic native cleanup only after native evidence, projection/save and durable outbox enqueue; cancelled/failed turns do so only after durable interrupted-state save. `finalization_finished` is presentation-only, failed durable branches retain the lease, and inspection keeps operations blocked across reload/uncertainty until exact cleanup succeeds.

TS-4 does not introduce this basic enqueue/interrupted-save safety or the narrow serial recovery carve-out. It owns captured-authority persistence and settlement hardening, recovery authorization under future overlap, cross-run race protection and safe concurrency prerequisites before capacity 2.

## Regression Invariants

- Persisted `TurnCorrelation` remains schema `0.2.0`.
- `RunAuthority` remains the only complete runtime authority.
- Existing correlated event shape remains unchanged.
- Event authority excludes `piSessionFile`, prompt, provider configuration, raw private output, secrets and environment.
- Frontend presentation remains Journey-keyed; exact native lease occupancy is added only as global operational admission authority.
- One central dispatcher remains app-lifetime authority.
- Production capacity remains exactly 1.
- No real process or settlement concurrency exists.
- Existing Harness/Pi/Mirror settlement ordering and fail-closed durable enqueue/interrupted-save boundary remain unchanged.
- Mock streaming remains Tauri-free.
- TS-4, US-2, US-3 and RS015 remain untouched.
- No promotion, release or deployment occurs.

## Validation Evidence

Pending implementation and validation. This document plans tests only and does not authorize implementation.
