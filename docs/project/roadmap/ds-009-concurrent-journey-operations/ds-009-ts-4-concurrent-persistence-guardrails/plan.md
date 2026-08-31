# Plan — DS-009.TS-4

## Objective

Harden Journey-scoped settlement and persistence while production remains globally serial at capacity 1. Every transcript lookup, projection mutation, durable save, outbox item, Mirror append receipt and acknowledgement must be authorized by the immutable `RunAuthority` captured at start. Finalization must serialize per Journey, reject stale run/generation work after every asynchronous boundary, release the native Journey lease only after durable projection plus durable outbox enqueue, and recover from persisted projection/outbox evidence without using the selected Journey or dead child handles.

TS-4 establishes the persistence safety prerequisite for later concurrency. It does not enable overlap. US-2 alone may later raise production capacity to 2, and US-3 remains responsible for cancellation and settlement behavior under real concurrent execution.

## Current-State Characterization

The plan starts from the completed TS-1, TS-3, US-1 and TS-2 contracts and the current implementation:

- `RunAuthority` is constructed once before start from persisted `TurnCorrelation` schema `0.2.0` plus validated active-generation `piSessionFile`. It contains exact Journey, run, turn, thread, generation, Pi session, Mirror conversation, activation receipt and Harness message IDs.
- `start_pi_invocation(prompt, config, runAuthority)` is the only start boundary. The native registry owns one immutable authority and one private provider snapshot per Journey entry.
- The registry atomically reserves before spawn, has a private production constant exactly equal to 1, separates child capacity from the Journey lease, terminalizes first-wins and requires exact `journeyId + runId` for cancel and cleanup.
- Child `kill`, `try_wait`, joins, event emission, filesystem work and output processing occur outside the global registry mutex.
- Frontend runtime and presentation are Journey-keyed. Selection is intended to be presentation-only, and one app-level dispatcher routes authority-bearing events.
- Native occupancy is `unknown`/`reconciling`/`known`, is inspected through a bounded private allowlist and fails closed on malformed, stale or ambiguous evidence.
- `executeCompletedSettlement()` currently orders save → enqueue → exact cleanup/reinspection → append/ack. Save or enqueue failure retains the lease; a durable existing outbox may skip save/enqueue after caller validation.
- `executeInterruptedSettlement()` saves interrupted state before exact cleanup. Exact retained recovery creates no child, run, turn, message, generation or staging.
- `save_dedicated_journey_conversation` validates Journey/generation payload identity and writes through a staged rename, but it has no per-Journey serialization, run/turn settlement authority argument, stale replacement comparison or file/directory `sync_all` durability boundary.
- `MirrorAppendOutboxState` serializes the shared outbox file globally. Enqueue is durable and idempotent for an identical item, but append/ack recovery and repeated acknowledgement need an explicit exact idempotency contract.
- `App.tsx` captures local owner variables for a run, but transcript, projection, outbox and retry helpers still accept narrower correlation/conversation fragments. TS-4 must make complete start authority the required dependency rather than relying on lexical convention.
- App restart already loads dedicated projection and outbox state. TS-4 must turn those persisted artifacts into explicit recovery authority and must never recreate or infer a live child handle.

These are hardening gaps under serial execution, not authorization to raise capacity or run simultaneous processes.

## Authority Model

### One captured settlement authority

Introduce a focused immutable settlement context derived only from the start-captured `RunAuthority`:

```text
JourneySettlementAuthority
  runAuthority                  complete immutable authority
  correlation                   exact frozen RunAuthority.correlation
  projectionKey                 journeyId + threadId + generation
  turnKey                       runId + turnId + Harness message IDs
  transcriptKey                 piSessionId + piSessionFile
  mirrorKey                     mirrorConversationId + turnId
```

This may be the `RunAuthority` itself plus pure projections rather than a second persisted schema. It must not become a mutable copy or a competing authority source. Every settlement dependency receives this complete object or a type that preserves it by reference.

Before each side effect, validate exact equality among:

- `RunAuthority` and its frozen `TurnCorrelation`;
- projection `journeyId`, thread ID, generation and live identity;
- reconciliation turn `runId`, `turnId` and Harness message IDs;
- Pi transcript `piSessionId` and private `piSessionFile`;
- outbox `itemId`, Journey, thread, generation and Mirror conversation; and
- append receipt and acknowledgement destination/message IDs.

Any mismatch is stale or contradictory authority. It fails closed before write, enqueue, append, acknowledgement or lease cleanup.

### Selection is never mutation authority

`selectedJourney`, `selectedJourneyRef`, `conversationRef` and visible navigation state may decide what to render or whether an owner-scoped recovery control is visible. They may not supply a settlement destination.

Background A completion while B is selected must use A's captured authority and A's captured/run-owned projection. Selection checks may update visible React state only after exact owner/generation comparison. No persistence helper may accept the selected Journey as a fallback.

### Authority survives asynchronous boundaries

Every continuation after transcript load, save, enqueue, cleanup, append, receipt application or acknowledgement must revalidate that the queued settlement still matches the current persisted generation/run evidence. A stale callback must terminate without mutating a replacement, without clearing its diagnostic and without releasing its lease.

## Per-Journey Serialization Model

### Frontend settlement coordinator

Add a dependency-injected keyed coordinator, preferably in `src/app/journeySettlement.ts` or a focused `journeyPersistenceCoordinator.ts`:

```text
serialize(journeyId, authority, operation)
  queue operations FIFO for that Journey
  allow independent Journey queues by construction
  expose no global selected-Journey dependency
  release queue bookkeeping in finally
  reject stale authority before and after each awaited dependency
```

The coordinator must use deferred Promises/barriers in tests, never timing sleeps. It serializes initial completion, retained recovery, interrupted save, append retry and acknowledgement for the same Journey. Repeated requests for the exact turn either join the in-flight operation or converge idempotently; they do not execute conflicting writes.

Production capacity remains 1, so cross-Journey finalization overlap is not exercised in the app. Pure tests may prove independent keyed queues without starting processes or changing the native limit.

### Native durable projection save

Harden the native projection boundary so commands for the same `journeyId + generation` cannot race the fixed staging path:

- introduce a bounded keyed persistence lock/state or an equivalent exact per-Journey/generation serialization primitive;
- validate the payload against the supplied settlement authority for settlement writes;
- compare active thread/generation and persisted turn/run authority while holding the keyed write boundary;
- reject inactive/replaced generation or conflicting run evidence;
- write a unique bounded staged sibling, `sync_all` the file, rename atomically and `sync_all` the parent directory before reporting success; and
- keep non-settlement lifecycle saves explicit and unable to masquerade as settlement authorization.

The frontend queue defines logical ordering; the native keyed boundary and persisted authority protect against remount, duplicate command and stale asynchronous callers.

### Outbox and append serialization

The shared outbox file remains protected by native atomic serialization. Journey settlement coordination ensures same-Journey save/enqueue/append/ack order. A global outbox-file lock may remain as a file-integrity implementation detail; it must not become Journey ownership authority.

Append and acknowledgement occur only from a durable exact outbox item. They may remain pending after lease release and are retried per Journey without starting a provider or blocking a new invocation.

## Lease Release Boundary

### Completed turn

The exact release sequence is:

```text
validate start-captured authority
load exact Pi transcript from authority.piSessionFile
locate the exact completed native pair
build exact committed Harness/Pi projection
serialize and durably save exact Journey/generation projection
create and durably enqueue exact Mirror outbox item
release exact native journeyId + runId lease
perform fresh bounded native reinspection
only then project occupancy free when no replacement exists
append exact outbox item to Mirror
apply exact accepted/existing receipt idempotently
save exact Mirror-committed projection
acknowledge exact outbox item idempotently
```

Durable projection plus successful durable enqueue is the release frontier. Append and acknowledgement are downstream recoverable work and must not retain native occupancy after enqueue.

### Failure behavior

- Transcript/native evidence missing: no save frontier, no cleanup.
- Projection construction or exact authority validation failure: no write, no enqueue, no cleanup.
- Durable projection save failure: no enqueue, no cleanup.
- Outbox item creation failure: no enqueue, no cleanup.
- Outbox enqueue failure or conflict: no cleanup.
- Cleanup response, reinspection or replacement ambiguity: occupancy remains fail-closed.
- Append, receipt application, post-receipt projection save or acknowledgement failure after durable enqueue: lease remains released; the exact durable outbox item remains the retry handle.
- Cancelled/failed run: durable interrupted-state save remains the release frontier; its failure retains the lease.

A later matching retry resumes only the failed phase for the same authority. It never creates new conversational work.

## Idempotency and Stale Rejection

### Durable outbox and `existing` receipt

An identical already-enqueued outbox item is success only after exact persisted projection and authority validation. Same item ID with divergent content remains a conflict and retains any lease not yet released.

Mirror receipts containing `existing` are first-class success. Applying the same exact receipt repeatedly must return the already committed projection unchanged rather than incrementing checkpoints or reopening pending state.

### Acknowledgement

Acknowledgement becomes explicitly idempotent:

- first exact acknowledgement removes the item after the exact Mirror-committed projection is durable;
- repetition for an absent item succeeds as `already_acknowledged` only when the exact persisted projection proves that turn committed to the same Mirror conversation and message IDs;
- missing or contradictory persisted evidence remains an error; and
- an A1 acknowledgement can never remove or satisfy A2.

Use a bounded typed acknowledgement result rather than inferring success from missing data.

### Rollover and replacement

Before every write phase, compare authority to the active thread generation and exact persisted turn. After generation rollover, inactive A1 may finish only already-durable append/ack recovery when its generation-scoped projection and outbox item still match; it cannot overwrite the active generation, stage work or release A2. A stale callback for replaced run A1 is a no-op/fail-closed result with no current-run diagnostic mutation.

## Remount, Reload and Restart Recovery

### Dispatcher remount/reload

Preserve one app-lifetime Tauri listener. Make mount/dispose/register behavior explicitly lifecycle-safe:

- repeated mounts in one lifecycle share one listener attachment;
- dispose is idempotent and invalidates pending attachment by lifecycle epoch;
- remount attaches exactly one replacement listener;
- bounded inspection rehydrates only exact authority/lifecycle routes;
- persisted projection supplies existing message/turn recovery evidence; inspection never invents transcript or settlement content; and
- stale routes/events remain quarantined without private content and cannot close a replacement.

Tests distinguish React remount within one JavaScript lifetime from a full frontend reload. Neither path may leave duplicate active listeners or duplicate settlement callbacks.

### App restart

On native app restart, the process registry is empty and child handles are dead. Recovery must:

1. load exact generation-scoped dedicated projections;
2. list bounded durable outbox summaries;
3. join them by exact Journey/thread/generation/turn/Mirror authority;
4. resume pending append/receipt-save/ack from the outbox without invoking Pi;
5. classify pending/interrupted projection evidence without inventing a child; and
6. block operational admission for a Journey when persisted evidence says settlement is incomplete but no exact durable recovery handle can be established.

Never reconstruct a registry child entry or claim a process is running from persisted state. Native lease inspection describes only the current native process lifetime.

### Missing recovery handle

If inspection reports a finalizing lease but no persisted projection/outbox/interrupted evidence exactly matches it, keep occupancy and all operational actions fail-closed. Emit only an allowlisted bounded reason such as `settlement_recovery_evidence_missing` or `settlement_authority_mismatch`. Do not expose prompt, response, provider configuration, `piSessionFile`, path, environment, stdout/stderr, secret or arbitrary error text. Do not force cleanup, restart a generation or create a replacement turn.

After app restart, where no native lease survives, the equivalent unresolved persisted state remains a Journey-scoped admission block until exact model-free recovery succeeds or a later explicitly scoped repair story is authorized.

## Planned Implementation Surface

Expected files and responsibilities:

- `src/app/journeySettlement.ts` — complete authority-bound settlement context, per-Journey serialization seam, phase results and release-frontier orchestration.
- Optional focused `src/app/journeyPersistenceCoordinator.ts` — keyed FIFO coordinator if separation keeps the settlement module bounded.
- `src/app/App.tsx` — capture one settlement context at start; remove selected-Journey persistence authority; route initial, retry, interrupted and restart recovery through the coordinator.
- `src/app/journeyConversationStorage.ts` — typed exact-authority settlement save adapter.
- `src/domain/mirrorAppendOutbox.ts` — exact authority validation plus idempotent `existing` receipt application.
- `src/app/mirrorAppendOutboxStorage.ts` — typed enqueue/append/ack results and exact repeated acknowledgement handling.
- `src/app/piInvocationOccupancy.ts` — persisted-recovery block/diagnostic integration without weakening native inspection privacy.
- `src/agent/piProcessEventDispatcher.ts` — remount/reload route rehydration and no-duplicate-listener guarantees if current lifecycle seams are insufficient.
- `src-tauri/src/main.rs`, or focused persistence/outbox modules extracted from it — bounded keyed projection serialization, durable atomic save, exact stale authority checks and idempotent acknowledgement.
- Focused deterministic TypeScript and Rust tests. Update architecture documentation only if implementation changes the described boundary.

Exact file placement may change, but only TS-4 responsibilities may change. `src-tauri/src/pi_process_registry.rs` should remain behaviorally unchanged except for test-compatible integration if strictly necessary; its production constant remains 1.

## Implementation Sequence

1. Add failing authority-fixture tests proving A settles while B is selected and every destination comes from A's `RunAuthority`.
2. Introduce the immutable settlement context and replace correlation-only settlement dependencies with exact authority-bound dependencies.
3. Add a deterministic per-Journey queue with deferred barriers; route initial completion, retry and interrupted settlement through it.
4. TDD native per-Journey/generation projection serialization, durable fsync/rename and stale generation/run rejection.
5. TDD exact outbox creation/enqueue validation and the durable enqueue release frontier.
6. Decouple post-enqueue append/receipt-save/ack from lease occupancy while preserving exact retry handles.
7. Make `existing` receipt application and acknowledgement explicitly idempotent.
8. Harden dispatcher remount/reload reconciliation and exact route rehydration without duplicate listeners.
9. Add startup recovery from projection/outbox evidence and fail-closed missing-handle diagnostics without child restoration.
10. Run focused suites, full frontend/build, stable and development-channel Rust suites, Markdown links, scope checks and `git diff --check`.
11. Perform only a sequential Nautilus Harness Dev smoke if Validation later requires it; never admit overlap or capacity 2 during TS-4.

## Acceptance Behavior

```text
Given A starts with immutable RunAuthority and B becomes selected
When A completes and settlement crosses asynchronous boundaries
Then transcript, projection, save, outbox, append receipt and acknowledgement all target A's captured Journey, generation, Pi session and Mirror conversation
And B remains byte-for-byte unchanged.
```

```text
Given two settlement callbacks target the same Journey
When deferred barriers interleave them
Then the per-Journey coordinator executes them in deterministic order
And a stale run or generation is rejected before every side effect.
```

```text
Given exact projection save and durable outbox enqueue succeed
When append or acknowledgement remains pending
Then exact lease cleanup and fresh inspection may release occupancy
And the pending outbox remains the model-free recovery handle for later retry.
```

```text
Given projection save, outbox creation or enqueue fails
When settlement cannot establish a durable recovery handle
Then the exact Journey remains blocked
And no cleanup, append, acknowledgement or replacement start is authorized.
```

```text
Given an exact accepted receipt reports both messages as existing
When receipt application or acknowledgement repeats
Then projection/checkpoints remain unchanged after the first exact commit
And acknowledgement converges to acknowledged/already_acknowledged without touching another item.
```

```text
Given the dispatcher remounts or the frontend reloads
When bounded inspection and persisted evidence are reconciled
Then exactly one native listener is active
And no event or settlement callback is delivered twice.
```

```text
Given the native app restarts
When persisted projection and outbox state are loaded
Then recovery resumes only exact model-free persistence work
And no dead Child handle, new run, new turn or selected-Journey inference is created.
```

```text
Given a finalizing lease or unresolved projection has no exact recovery handle
When reconciliation runs
Then admission remains fail-closed with an allowlisted bounded diagnostic
And forced cleanup, restart and new staging remain unavailable.
```

## Validation Route

Deterministic tests are authoritative for ordering, stale callbacks, failures, remount races, restart classification and byte-for-byte isolation. Use deferred Promises, barriers, fakes and temporary files; do not use timing sleeps or real Pi processes for race tests.

A later supplementary smoke, if required at Validation, uses only **Nautilus Harness Dev**, disposable development Journeys and sequential invocations. It confirms A can complete while B is selected, B remains unchanged, durable enqueue releases A before append/ack retry, and restart/reload recovery remains model-free. Stable stays closed. No simultaneous process, capacity 2, forced production failure, retained-lease fabrication, promotion, release or deploy is authorized.

Expected observation: settlement remains serial and owner-correct; append/ack may continue recoverably after occupancy release; missing durable recovery evidence remains visibly blocked; reload/restart creates no duplicate listener or phantom run.

Pass condition: the matrix in `test-guide.md`, full frontend/build and both Rust channel suites pass; production capacity is exactly 1; scope contains no US-2, US-3 or RS015 change; and no selected-Journey persistence authority remains.

Fail condition: B changes during A settlement; stale work writes or releases a replacement; cleanup precedes durable projection/enqueue; append/ack pending retains occupancy; enqueue failure releases occupancy; receipt/ack repetition corrupts checkpoints; remount duplicates listeners; restart restores a dead child; inspection/recovery leaks private data; or capacity/overlap changes.

## Non-Goals and Boundaries

- Do not change persisted `TurnCorrelation` schema `0.2.0` or redesign `RunAuthority`.
- Do not change correlated `PiProcessEvent` authority or expose private `piSessionFile` in events/inspection.
- Do not raise `PRODUCTION_PI_PROCESS_LIMIT`; it remains exactly 1 for all TS-4 implementation and validation.
- Do not start two real processes, enable process/finalization overlap or validate capacity 2.
- Do not implement US-2. US-2 is the only later story authorized to raise capacity to 2 after TS-4 passes.
- Do not implement US-3. US-3 owns cancel/failure/settlement behavior under real concurrency.
- Do not change RS015, provider settings, imported conversation reconciliation, Mirror append primitives, stable promotion, release or deployment.
- Do not treat transient phases not captured in smoke as missing behavior when accepted deterministic coverage proves them.

## Risks and Mitigations

- **Lexical owner variables remain an implicit contract.** Require typed settlement authority on every persistence dependency and assert no selected-Journey fallback.
- **Frontend queuing alone cannot survive remount.** Add native keyed serialization and persisted stale-authority validation at the write boundary.
- **A fixed `.tmp` path can collide.** Serialize by Journey/generation and use unique bounded staged siblings with fsync/rename.
- **Outbox enqueue success may be confused with append success.** Return an explicit durable-enqueue result and treat it as the sole completed-turn release frontier.
- **Post-enqueue append failure may re-block occupancy.** Separate lease release status from Mirror commit diagnostics and retain only the durable outbox retry.
- **Repeated `existing` receipts may increment checkpoints twice.** Detect exact already-committed evidence and return the projection unchanged.
- **Repeated acknowledgement currently looks like missing item.** Prove exact committed projection before returning `already_acknowledged`; contradictory absence remains an error.
- **Generation rollover may allow an old save.** Validate active/persisted authority before and after queue waits and inside the native keyed boundary.
- **Remount may leave an old listener pending.** Keep lifecycle epochs, one listener promise and idempotent disposal; race with deterministic deferred attachment.
- **Inspection identifies a lease but not recovery content.** Join with exact persisted projection/outbox evidence; otherwise fail closed with a bounded reason.
- **Restart recovery may infer liveness from persistence.** Explicitly classify native registry as empty after restart and resume persistence only.
- **Global outbox file serialization can be mistaken for owner authority.** Keep exact per-item/Journey checks; the file lock protects bytes only.

## Stop Conditions

Stop planning/implementation and return to the Navigator if any of these becomes necessary:

- production capacity above 1, simultaneous Pi children or process/finalization overlap;
- a `TurnCorrelation` schema change or `RunAuthority` redesign;
- deriving any persistence target from selected Journey or mutable visible conversation state;
- releasing a completed lease without both durable projection and durable outbox enqueue;
- forced cleanup when no exact persisted recovery handle exists;
- restoring or fabricating a dead child handle after app restart;
- exposing prompt, response, provider config, `piSessionFile`, path, environment, raw output or secret in inspection/recovery diagnostics;
- new Mirror append primitives or changes to Mirror runtime semantics;
- TS-4 correctness requiring US-2, US-3, RS015, stable promotion, release or deploy work;
- deterministic ordering/race tests requiring sleeps or real processes; or
- a required gate failing without a narrow TS-4 fix.

## Implementation Contract

- Behavior changes begin with failing deterministic tests.
- Preserve global production capacity exactly 1.
- Use start-captured authority for every settlement and persistence dependency.
- Keep child capacity and Journey finalization lease separate.
- Preserve the release frontier: durable projection plus durable outbox enqueue.
- Stage only TS-4 implementation and lifecycle files; do not use `git add .`.
- Use descriptive English commits explaining why.
- Do not implement until the Navigator explicitly approves this `after_plan` checkpoint through Ariad.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until explicit Navigator approval through Ariad.
