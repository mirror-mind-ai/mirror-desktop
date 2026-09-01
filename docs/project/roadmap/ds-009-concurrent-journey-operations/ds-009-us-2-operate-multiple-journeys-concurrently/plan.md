# Plan — DS-009.US-2

## Objective

Activate bounded local concurrency only after the completed TS-1 through TS-4 safety chain: permit exactly two Pi-backed executions globally when they belong to different Journeys, continue allowing at most one active or finalizing lease per Journey, and preserve a capacity-only rollback to exactly one without undoing correlation, registry, frontend routing, persistence, recovery or isolation contracts.

This is a controlled capacity activation, not a redesign of execution ownership.

## Starting Contract

US-2 begins from the independently verified TS-4 closure at `402f13d`:

- `PRODUCTION_PI_PROCESS_LIMIT` is the single private production capacity source and is exactly `1`;
- `PiProcessRegistry` already supports injected bounded limits and atomically reserves `journeyId + runId` before worker or child spawn;
- child capacity and the retained Journey lease remain distinct lifecycle state;
- one registry entry owns one immutable `RunAuthority`, exact `runId`, private provider snapshot, child handle, terminal state and Journey lease;
- `start_pi_invocation(prompt, config, runAuthority)` remains the only start boundary;
- cancel, terminalization, cleanup and replacement protection require exact `journeyId + runId`;
- the central dispatcher and Journey-keyed reducers already isolate events, projections, warnings, diagnostics and terminal state;
- settlement and persistence use captured authority, per-Journey serialization and the TS-4 pre-/post-frontier contracts;
- persisted `TurnCorrelation` remains schema `0.2.0` and `RunAuthority` remains immutable;
- selected Journey remains presentation-only;
- remote Mirror append remains outside the global outbox-file lock;
- mock streaming remains Tauri-free.

US-2 must preserve these contracts byte-for-contract except where admission presentation must understand a bounded limit of `1` or `2`.

## Scope

### 1. Activate one production capacity source at exactly two

Change only `PRODUCTION_PI_PROCESS_LIMIT` from `1` to `2`. Keep the existing injected-limit registry implementation and bounded constructor. Do not add an environment variable, settings toggle, CLI override, dynamic scheduler or second capacity source.

Update the production-capacity characterization so it proves exactly `2`, while retaining explicit injected-limit tests for both `1` and `2`. Rollback remains one source change from `2` to `1`; frontend inspection and admission logic must continue to accept either supported capacity without another rollback edit.

### 2. Preserve atomic native admission and one lease per Journey

Keep reservation under the single registry mutex and before spawn. For capacity `2`:

- A1 and B1 may reserve and run concurrently;
- A2 is rejected while any A1 lease is reserved, running or finalizing;
- C1 is rejected when the two bounded admission slots are occupied;
- a stale callback or cleanup for A1 cannot affect A2, B1 or either capacity count;
- first terminal signal wins independently for each run;
- child control, output joins, filesystem work, event emission and provider execution remain outside the registry mutex.

The existing bounded entry rule remains fail-closed: a retained finalizing lease occupies its Journey's admission entry until durable cleanup. Child capacity is still reported separately, but US-2 does not create an unbounded pool of retained leases merely because a child exited. After exact cleanup and fresh reinspection, the freed slot may admit another Journey while the other child continues.

Inspection remains deterministic, private and bounded, now with at most two entries. It must never expose provider snapshots, prompts, responses, `piSessionFile`, environment, private paths, secrets or raw output.

### 3. Replace the serial frontend gate with exact admission state

Do not weaken the aggregate operational guard used by global settings, Journey administration, generation restart and other non-admission mutations. Introduce a pure admission decision for the selected Journey, derived from:

- bounded native inspection status and supported limit;
- exact inspected entries and `processCapacityInUse`;
- the selected Journey's own active/finalizing frontend runtime;
- the single in-flight pre-spawn reservation guard;
- selected conversation reconciliation and provider/profile readiness.

The decision must fail closed and distinguish at least:

- `inspection_unknown` or `reconciling`;
- `same_journey_occupied` for a reserved, running or finalizing selected Journey;
- `global_capacity_reached` when the registry's bounded entry/capacity rule is full;
- `admitted` when the selected Journey is free and one of the two slots is available.

The inspection validator must accept exactly the supported rollback/enabled limits `1` and `2`, enforce `processCapacityInUse <= limit`, enforce `entries.length <= limit`, reject duplicate Journey or run identities, and verify lifecycle/capacity consistency. It must reject zero, values above two, malformed or contradictory entries and any extra fields.

Fresh inspection is advisory presentation authority; native reservation remains the final atomic TOCTOU barrier. A late native duplicate/capacity rejection must use the existing exact rejected-reservation rollback and reinspection path without removing or diagnosing A1/B1 incorrectly.

### 4. Permit only the intended concurrent interaction

While A runs, selecting a ready and unoccupied B with available capacity enables B's text submission. A remains owner-only for its cancel control, runtime activity and settlement. Once A and B occupy both slots, a ready C remains navigable and draft-editable but cannot submit.

The selected Journey's own active/finalizing state blocks another send in that Journey. Navigation and text drafts stay Journey-keyed. Existing aggregate guards continue to block global settings/profile mutation, Journey administration, generation restart and other operational mutations while any run or retained lease makes those actions unsafe. File attachment behavior is not broadened by this story; concurrency activation must not turn selected-global attachment staging into cross-Journey state.

The UI must present bounded, owner-correct reasons for same-Journey occupancy, global capacity and unknown inspection. It must not infer capacity from sidebar animation or selected runtime alone.

### 5. Preserve two-run dispatch and lifecycle isolation

Use the existing single app-lifetime dispatcher. Register each exact authority route before invoking native start. Interleaved A1/B1 events must update only their Journey-keyed entries; native `done` closes only its matching route. Listener remount/disposal must not duplicate either run.

Each async invocation captures its own conversation, active generation, provider snapshot, `RunAuthority`, `JourneySettlementAuthority`, transcript and local settlement variables before overlap. Mutable selected-Journey state must not become a destination after any await.

A1 and B1 may complete in either order. Their active pre-frontier saves, durable outbox enqueue, exact cleanup and fresh reinspection remain authority-bound and independently Journey-keyed. Model-free append/receipt-save/ack recovery may overlap active children only after its durable frontier. Same-Journey recovery and a later run remain ordered by the existing per-Journey persistence coordinator; different Journeys remain independent.

### 6. Keep concurrent shutdown bounded

Characterize app shutdown with two registered child handles. Any shutdown cleanup added by implementation must enumerate exact targets under the registry lock, clone only bounded child handles, release the registry lock, and then stop children through the directed child-control seam. It must not introduce a provider call, global untargeted process search, lock-held kill/wait, synthetic settlement or restored child handle after restart.

This is activation safety only. Selective Navigator cancellation, controlled failure and cross-run settlement behavior remain DS-009.US-3.

### 7. Keep rollback concrete

The rollback procedure is:

1. change only `PRODUCTION_PI_PROCESS_LIMIT` from `2` back to `1`;
2. rebuild the DEV app;
3. verify inspection reports limit `1` and the same admission selector blocks B while A owns the sole slot;
4. retain all `RunAuthority`, event schema, Journey-keyed state, directed APIs, settlement modes, persistence locks, outbox and recovery behavior.

No schema migration, event downgrade, feature flag, environment override or registry reversion is part of rollback.

## Non-Goals

- Do not implement DS-009.US-3 targeted cancellation, injected failure or selective settlement validation under real concurrency.
- Do not permit more than two global Pi children or more than one active/finalizing lease per Journey.
- Do not change `TurnCorrelation` schema `0.2.0`, `RunAuthority`, `PiProcessEvent`, settlement authority or process command signatures.
- Do not add arbitrary capacity configuration, queues, priorities, fairness, remote orchestration or multi-user coordination.
- Do not redesign provider settings or make mutable selected state authoritative.
- Do not broaden file attachment, settings, Journey administration or restart concurrency.
- Do not modify Mirror runtime, RS015, stable promotion, release, deployment, US-3 or unrelated roadmap packages.
- Do not use stable app-data or the production Mirror database for validation.

## Acceptance Behavior

```text
Given the production registry limit is exactly 2
And Journey A and Journey B have ready dedicated generations
When A1 and B1 are started before either child terminates
Then both native reservations and both Pi children coexist
And each run retains its own immutable authority, provider snapshot and dispatcher route
And process capacity and inspection never exceed 2.
```

```text
Given A1 is active or finalizing
When the Navigator tries to start A2
Then frontend admission blocks the duplicate when current evidence is known
And the native atomic reservation remains the final rejection boundary
And A1, B1 and their persisted state remain unchanged.
```

```text
Given A1 and B1 occupy the two bounded admission slots
When Journey C is selected
Then navigation and its text draft remain available
And C1 submission is blocked with a global-capacity reason
And no staging, run, turn, child or provider execution is created for C.
```

```text
Given A1 and B1 stream and settle in either order
When events, projections, outbox work and receipts interleave
Then every mutation remains attached to its start-captured Journey and generation
And selected Journey never retargets either run
And exact cleanup of one run cannot remove or release the other.
```

```text
Given the capacity source is returned to 1
When the same registry, inspection and frontend admission code runs
Then only one global Journey lease is admitted
And all correlation, directed control, Journey-keyed state, settlement and persistence contracts remain intact.
```

## Implementation Sequence

1. **Red tests — native capacity:** characterize production `2`, two different-Journey winners, duplicate same-Journey rejection, third-Journey rejection, independent terminalization/cleanup, bounded inspection and injected rollback limit `1`.
2. **Red tests — frontend inspection/admission:** characterize supported limits `1|2`, malformed inspection rejection, selected-Journey duplicate blocking, global full blocking, available second slot and stale-inspection/native-rejection recovery.
3. **Red tests — integration:** characterize A active while B can submit, A/B active while C cannot, interleaved dispatcher routing, exact owner presentation and persistence isolation.
4. **Minimal native activation:** change the single production constant and only the bounded shutdown/inspection support proven necessary by tests.
5. **Minimal frontend activation:** add the pure admission selector and replace only send/Enter admission guards; retain aggregate guards for unrelated operational mutation.
6. **Documentation alignment:** update architecture and process-boundary language from capacity `1` to controlled capacity `2`, preserving the one-line rollback and the explicit US-3 boundary.
7. **Automated gates:** run focused frontend/Rust suites, full frontend, build, stable and development-channel Rust suites, diff/link/scope checks.
8. **DEV-only validation:** execute the planned two-Journey natural-completion route and production-isolation checks. Stop at Navigator Validation; do not promote or start US-3.

## Expected Change Surface

Likely implementation files, subject to TDD evidence:

- `src-tauri/src/pi_process_registry.rs`
- `src-tauri/src/main.rs` only if bounded two-child shutdown needs an app-lifecycle seam
- `src/app/piInvocationOccupancy.ts`
- `src/app/journeyNavigationCoordinator.ts`
- `src/app/App.tsx`
- focused tests under `src/tests/` and native registry tests
- `docs/architecture/app-architecture.md`
- `docs/architecture/pi-local-process-boundary.md`
- this story package

Any change to settlement/persistence algorithms, authority schemas, Mirror runtime or sibling packages is a scope change and must stop for Navigator review.

## Validation Route

Automated validation and desktop E2E are required. The detailed matrix is in [test-guide.md](test-guide.md).

Navigator-visible E2E uses only **Nautilus Harness Dev** (`com.nautilus.harness.dev`) with disposable Mirror Dev Journeys A, B and C:

1. record stable app-data and production Mirror baselines without opening or mutating them;
2. verify DEV runtime coordinates and clean native occupancy;
3. start A1, navigate to B and start B1 before A1 terminates;
4. prove by deterministic child/inspection evidence that exactly two distinct children overlap and no third child exists;
5. navigate A → B → C → A while A/B run; verify owner-only content and C draft editability with submission blocked by capacity;
6. allow A and B to complete naturally in either order; verify each exact generation projection, Mirror destination and outbox/receipt evidence;
7. restart DEV and confirm no phantom child or duplicate delivery;
8. recheck stable app-data and production Mirror baselines byte/count-identically.

The DEV route does not force cancellation, append failure, persistence corruption or generation rollover; those real-concurrency failure paths belong to US-3. Rollback is proven deterministically with the same registry/admission implementation at injected limit `1` plus the single-source static rollback check; no stable binary is promoted.

Expected observation: A and B visibly work at the same time under separate Journey rows and conversations; C remains navigable and draft-editable but cannot start while both slots are occupied; A and B finish into only their own dedicated projections and Mirror conversations; restart restores no child.

Pass condition: all automated gates pass; overlap evidence shows exactly two and never three Pi children; same-Journey and third-Journey admission fail closed without staging side effects; A/B event and persistence evidence remain isolated; rollback limit `1` uses the same implementation; stable app-data and production Mirror show zero delta.

Fail condition: any third child, duplicate run in one Journey, global or selected-state retargeting, stale callback mutation, cross-Journey event/projection/outbox/receipt write, lock-held provider or filesystem work, rollback requiring contract reversion, stable/production mutation, or need to enter US-3 scope fails Validation.

## Implementation Contract

- TDD is mandatory for every behavior change.
- Use deterministic barriers, deferred Promises, fakes and temporary files; no timing sleeps or real Pi processes in automated races.
- Keep the production capacity source private and exactly `2`; supported frontend inspection capacities are exactly `1|2` for rollback compatibility.
- Native reservation remains the final atomic admission boundary.
- Keep provider lifetime outside per-Journey persistence queues and global locks.
- Preserve all TS-1 through TS-4 invariants and first-terminal-wins behavior.
- Use `uv run` for project Python commands, if any.
- Commit only story-scoped files with descriptive English messages; do not use `git add .`.
- After any authorized push, verify GitHub Actions with `gh`; this Plan does not authorize a push.

## Stop Conditions

Stop and return to Navigator review if implementation would require:

- a capacity source other than the single constant;
- more than two children or more than one lease per Journey;
- changing correlation/event/persistence schemas or command signatures;
- weakening pre-frontier or post-frontier authority checks;
- allowing selected Journey to choose mutation destinations;
- implementing selective cancellation/failure settlement assigned to US-3;
- changing Mirror runtime, RS015, stable channel, release or deployment scope;
- accepting a flaky/timing-based concurrency proof;
- proceeding after any required gate fails without a narrow, evidenced correction.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- independent review must verify capacity accounting, frontend admission semantics, shutdown scope, rollback sufficiency, DEV evidence and the US-3 boundary;
- implementation remains blocked until the Navigator explicitly approves this exact Plan.
