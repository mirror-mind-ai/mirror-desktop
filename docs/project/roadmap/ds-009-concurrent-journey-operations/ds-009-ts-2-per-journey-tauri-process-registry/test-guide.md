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
| Matching cleanup | A1 is finalizing with released process capacity; release exact A/A1 lease twice | First release removes A1; second is idempotent; no capacity underflow occurs |
| Premature cleanup | A1 is reserved or running | Cleanup is rejected and cannot kill, terminalize or remove A1 |
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
- lease cleanup receives the same captured owner `journeyId + runId` after existing frontend finalization;
- inspection adapters expose the bounded native type only;
- Journey-keyed frontend runtime and one app-lifetime dispatcher behavior remain unchanged; and
- mock streaming remains Tauri-free.

Expected suites include compatible updates to:

- `src/tests/piProcessStream.test.ts`
- `src/tests/piProcessEventDispatcher.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- focused cancellation/finalization integration tests if a narrower file is introduced.

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
2. During A, verify another start remains blocked by existing aggregate occupancy and production limit 1.
3. Let A complete and finalization finish; verify its lease disappears only at matching cleanup.
4. Start Journey B only after A cleanup and verify normal serial operation.
5. In a separate sequential scenario if required, cancel the selected owner and verify the directed pair cancels that run and reaches one terminal `done`.
6. Inspect the bounded registry surface during available phases and confirm no private fields or payloads appear.
7. Confirm there was never more than one admitted live/finalizing lease and no stable data was touched.

Expected observation: visible behavior remains serial and coherent; start/cancel/completion still work; B cannot overlap A; no stale owner state or duplicate terminal signal appears.

Pass condition: deterministic authority tests pass and the Dev smoke shows sequential registry lifecycle with no concurrency, leak or stable-channel interaction.

Fail condition: a second Journey starts before A's matching lease cleanup; cancel targets the wrong run; completion duplicates or leaks capacity; inspection exposes private data; or validation requires capacity 2.

## E2E Decision

A development-channel serial smoke is required because Tauri command ownership changes. It is supplementary to deterministic Rust tests, which are the authority for races and interleavings. Do not run simultaneous Pi children, promote stable, release or deploy.

## TS-4 Boundary Checks

Review the diff and tests to prove TS-2 did not add:

- per-Journey persistence queues or locks;
- captured-authority save/outbox settlement changes;
- durable finalization acknowledgement criteria;
- outbox/projection recovery redesign;
- another Journey process admitted while a finalizing lease occupies production limit 1; or
- any settlement concurrency fixture.

TS-2 may expose and clean up a native finalizing lease at the existing frontend finalization boundary. TS-4 owns hardening that release against durable projection/outbox evidence.

## Regression Invariants

- Persisted `TurnCorrelation` remains schema `0.2.0`.
- `RunAuthority` remains the only complete runtime authority.
- Existing correlated event shape remains unchanged.
- Event authority excludes `piSessionFile`, prompt, provider configuration, raw private output, secrets and environment.
- Frontend state remains Journey-keyed.
- One central dispatcher remains app-lifetime authority.
- Production capacity remains exactly 1.
- No real process or settlement concurrency exists.
- Existing Harness/Pi/Mirror settlement ordering remains unchanged.
- Mock streaming remains Tauri-free.
- TS-4, US-2, US-3 and RS015 remain untouched.
- No promotion, release or deployment occurs.

## Validation Evidence

Pending implementation and validation. This document plans tests only and does not authorize implementation.
