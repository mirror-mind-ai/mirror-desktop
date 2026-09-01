# Plan — DS-009.US-3

## Objective

Close DS-009 with exact owner-directed interruption semantics under the already-enabled production capacity of exactly `2`: when two distinct Journey runs overlap, cancellation, process/provider failure, downstream settlement failure, app shutdown and restart recovery must affect only the run whose immutable authority owns the event or operation. The sibling run must continue, stream, settle and recover independently.

US-3 is an isolation and failure-lifecycle story. It does not raise capacity, redesign admission, introduce a production fault switch or weaken any US-2/TS-4 durable frontier.

## Starting Contract

US-3 begins from the accepted US-2 closure at `383d1aa`:

- `PRODUCTION_PI_PROCESS_LIMIT` is the single private production capacity source and remains exactly `2`;
- one reserved, running or finalizing lease is allowed per Journey, and no more than two Pi children are allowed globally;
- native reservation, cancellation, terminalization, lease cleanup and replacement protection require exact `journeyId + runId`;
- `RunAuthority` is immutable and start-captured; `JourneySettlementAuthority` is derived only from it;
- the app-lifetime dispatcher routes every `PiProcessEvent` by complete authority and closes only on exact native `done`;
- selected Journey is presentation-only and never chooses event, persistence, cancellation or recovery destinations;
- interrupted settlement saves exact active authority before lease cleanup;
- completed settlement preserves the TS-4 durable frontier and generation-scoped outbox recovery;
- first terminal signal wins; child capacity and retained finalizing leases remain separate;
- exact rejected-reservation rollback and capacity-`1` rollback compatibility remain intact;
- app shutdown snapshots at most two exact child handles under the registry lock and controls them only after releasing it;
- restart restores projection/outbox evidence, never child handles or phantom runtime routes.

US-3 must preserve these contracts while proving them under targeted cancellation and failure with a sibling child still alive.

## Scope

### 1. Characterize exact targeted cancellation before changing behavior

Start with deterministic native and frontend tests for concurrent A1/B1 runs. Cancellation of A1 must:

- issue only `cancel_pi_invocation(A.journeyId, A.runId)`;
- validate A1 against the registry before cloning its child handle;
- leave B1's cancellation state, child handle, process capacity, terminal state, lease and inspection bytes unchanged;
- preserve an A1 cancel request made before child attachment and apply it only to the later A1 attachment;
- make repeated A1 cancellation idempotent;
- reject a stale or mismatched A authority without touching A2 or B1;
- never hold the registry mutex while killing, waiting or joining a child;
- allow B1 to continue emitting events and settle naturally after A1 is interrupted.

The selected UI may expose Cancel only for the selected Journey's exact live identity. Navigation during cancellation must not retarget the command or its later interrupted settlement.

### 2. Define terminal precedence for cancellation, completion and process death

Retain the native first-terminal-wins rule independently per run. Deterministic barrier tests must cover:

- A1 cancel winning before natural completion;
- A1 natural completion winning before a late cancel request;
- A1 process death or nonzero exit winning before a late cancellation callback;
- duplicate `cancelled`, `error`, `agent_end` or `done` signals not terminalizing twice or underflowing process capacity;
- every A1 terminal race leaving B1 byte-for-byte unchanged;
- a stale A1 terminal callback after A2 reservation being rejected without changing A2 or B1.

Native `done` remains the route-closing event. Earlier cancellation/error evidence may update A1 presentation but must not close B1's route or discard valid A1 post-processing evidence before exact `done`.

### 3. Settle cancellation and pre-completion failure to the exact owner

Use the existing interrupted-settlement contract for cancellation and provider/process failure before a complete native assistant pair exists:

1. derive settlement authority from A1's captured `RunAuthority`;
2. revalidate A1 as the active exact run/turn after every await;
3. persist A1's interrupted projection through `active_pre_frontier` authority checks;
4. revalidate again;
5. release only A1's finalizing lease and reinspect bounded occupancy;
6. retain fail-closed A1 evidence if save, cleanup or inspection fails.

A1 interrupted settlement must not enqueue or append a fabricated completed pair. Partial/empty assistant handling must remain deterministic and Journey-local. B1 may continue provider execution and persistence throughout; A's per-Journey persistence queue must not serialize B.

Pre-provider/native-admission failure remains the exact rejected-reservation rollback path rather than interrupted settlement. US-3 must not conflate reversible staging rollback with a run that reached native execution.

### 4. Isolate controlled completed-settlement failure

Characterize a completed A1 answer whose downstream Harness save, outbox enqueue, Mirror append, receipt-save or acknowledgement fails while B1 runs. Controlled failures use dependency seams, deferred promises, temporary files or bounded fake appenders—never a production fault flag.

Required behavior:

- before the durable projection-plus-enqueue frontier, A1 retains its exact lease and B1 remains unchanged;
- after the frontier, A1 may release its lease and retain exact recoverable outbox evidence while B1 continues;
- A1 remote append never holds the global outbox-file lock and cannot block B1 enqueue or provider lifetime;
- A1 retry is model-free and cannot create another provider run, turn, message, generation or child;
- A1 receipt-save/acknowledgement cannot remove or overwrite B1's outbox item or projection;
- B1 may settle first or last without cross-owner diagnostics or selected-Journey retargeting.

This is controlled settlement failure, not a general fault-injection framework.

### 5. Preserve sibling runtime, dispatcher and presentation isolation

Add two-run reducer/dispatcher/application tests proving:

- A1 `cancel_requested`, `cancelled`, `error`, warning, diagnostic and finalization updates mutate only A's Journey-keyed runtime entry;
- B1 event order and bytes remain unchanged while A1 cancels or fails;
- A1 native `done` closes only A1's route; B1 continues receiving later deltas, operations, context, compaction, Mirror and `done` evidence;
- selecting B during A cancellation shows B's own stream and cancel control, never A's terminal message;
- selecting A after cancellation shows only A's interrupted/finalizing/recovery state;
- late A1 events after exact cleanup or A2 replacement are discarded or placed in bounded quarantine outside A2/B1 runtime state;
- cleanup of A1 removes only A1's exact runtime/staged state and cannot clear sibling diagnostics, snapshots or drafts.

No new mutable global "current run" may be introduced.

### 6. Keep two-child shutdown bounded and recoverable

Characterize shutdown while A1 and B1 are both running:

- snapshot at most the two exact running handles under the registry mutex in deterministic Journey order;
- release the registry mutex before controlling either child;
- direct control only through the cloned handles; never search globally by process name or PID pattern;
- one kill/control failure cannot prevent attempting the other exact handle;
- shutdown does not fabricate frontend settlement, outbox evidence or successful provider completion;
- stale worker callbacks after shutdown cannot mutate a later app lifetime or replacement run;
- restart reconstructs no child, route, active runtime entry or phantom process capacity;
- exact persisted pending/interrupted evidence for A and B is classified and recovered independently without another provider call.

If current shutdown already satisfies the contract, implementation should add characterization only. Any behavioral change must be the smallest seam proven necessary.

### 7. Provide safe real-concurrency validation without production fault controls

Automated races remain deterministic and never use sleeps or real Pi children. Later DEV-only E2E must use fresh disposable Journeys and exact observed authority/PID evidence under the development channel only.

The planned real routes are:

1. **Targeted cancellation:** start long-running A1 and B1, capture exact authorities and two direct children, use A's visible Cancel control, and prove only A terminates/interrupted-settles while B's exact PID, stream and owner projection continue naturally.
2. **Controlled process death:** in a separate fresh A2/B2 pair, capture exact direct child PIDs, terminate only A2's recorded child externally to simulate an ordinary process-death failure, and prove B2 continues. This is a validation action against the exact disposable DEV child, not application code, a production switch or an untargeted process search.
3. **Bounded shutdown/recovery:** in a third fresh pair, close the DEV app normally while both exact children run, restart, and prove zero restored children/routes plus owner-correct model-free classification/recovery for both persisted turns.

Do not rely on the model spontaneously producing an error. Do not add an environment/config fault override. If exact PID/authority correlation cannot be established before the controlled process-death action, stop rather than signal a process.

### 8. Preserve capacity and rollback

Production capacity remains exactly `2`; US-3 must not edit `PRODUCTION_PI_PROCESS_LIMIT`, add capacity configuration or weaken limit-`1` injected rollback tests. Native inspection remains bounded to limits `1|2`, and all cancellation/failure behavior must work through the same registry implementation at either injected limit.

## Non-Goals

- Do not raise capacity above `2`, add queues/priorities/fairness or permit a second lease in one Journey.
- Do not add production fault-injection commands, environment variables, hidden prompts, provider modes or arbitrary executable overrides.
- Do not change provider cancellation semantics beyond the existing exact child-kill boundary.
- Do not redesign `RunAuthority`, `TurnCorrelation` `0.2.0`, `PiProcessEvent`, settlement authority, command signatures or persistence schemas.
- Do not let selected Journey, sidebar state or mutable refs choose cancellation, settlement or recovery authority.
- Do not fabricate completed assistant/Mirror evidence for cancelled, failed, dead or shutdown-interrupted runs.
- Do not broaden global settings, Journey administration, generation restart or attachment concurrency.
- Do not modify Mirror runtime, RS015, stable app-data, production Mirror, release, promotion or deployment scope.
- Do not close DS-009, create a release boundary or begin another roadmap item inside this story.

## Acceptance Behavior

```text
Given A1 and B1 own the two real execution slots
And both exact children are alive
When the Navigator cancels A1 through A's owner control
Then only A1 receives cancellation and interrupted settlement
And B1's child, events, runtime entry, projection and natural completion remain unchanged
And A1 cleanup cannot remove or release B1.
```

```text
Given A1 and B1 run concurrently
When A1 exits or fails before a complete assistant pair
Then A1 is persisted as interrupted under its captured authority
And no fabricated completed outbox item is created for A1
And B1 continues and settles to B's exact owner.
```

```text
Given A1 has a complete answer while B1 is active
When an A1 persistence or remote-append dependency fails at a controlled frontier
Then A1 retains either its exact lease or exact recoverable outbox evidence according to that frontier
And retry performs no provider call
And B1's run, projection and outbox evidence remain byte-for-byte isolated.
```

```text
Given A1 has terminated and A2 later owns Journey A
When a late A1 event, cancel callback, cleanup or recovery attempt arrives
Then it cannot mutate A2 or B1
And any diagnostic evidence remains bounded outside current runtime state.
```

```text
Given A1 and B1 are both alive when the DEV app closes
When shutdown snapshots and controls its bounded children and the app restarts
Then at most the two exact handles were targeted outside the registry lock
And no child or dispatcher route is restored
And A/B recovery uses only exact persisted projection/outbox evidence without another provider call.
```

## Implementation Sequence

1. **Red tests — native targeting and terminal races:** exact A cancellation with B unchanged, cancel-before-attach, cancel/done/process-death precedence, stale target/replacement rejection, bounded shutdown with independent control failures.
2. **Red tests — frontend runtime/dispatcher:** owner-only cancel command, A terminal events leaving B byte-identical, exact route closure, stale A events after A2 replacement, Journey-local diagnostics and cleanup.
3. **Red tests — interrupted settlement:** A cancellation/pre-completion failure saves and cleans only A while B continues; save/inspection/cleanup failure retains A fail-closed evidence.
4. **Red tests — completed controlled failure:** pre-frontier lease retention, post-frontier recoverable outbox, model-free retry, cross-Journey enqueue/append/ack isolation.
5. **Red tests — shutdown/restart recovery:** two exact children controlled outside locks, no synthetic completion, independent A/B restart classification and no phantom runtime.
6. **Minimal implementation:** change only seams demonstrated missing by the red tests. Preserve existing APIs and capacity.
7. **Documentation alignment:** update process-boundary, reconciliation and app architecture only for behavior actually added or newly characterized.
8. **Automated gates:** focused frontend/Rust suites, full frontend, build, stable/development Rust, links/diff/schema/capacity/scope checks.
9. **DEV-only validation:** execute separate targeted-cancel, exact process-death and shutdown/restart pairs with stable/production isolation. Stop at Navigator Validation.

## Expected Change Surface

Likely files, subject to red-test evidence:

- `src-tauri/src/pi_process_registry.rs`
- `src-tauri/src/main.rs` only if exact cancellation, terminalization or shutdown orchestration has a demonstrated gap
- `src/app/App.tsx`
- `src/app/journeySettlement.ts`
- `src/app/journeySettlementRecovery.ts` only if restart/interrupted recovery has a demonstrated gap
- `src/app/journeyRuntimeState.ts`
- `src/agent/piProcessEventDispatcher.ts`
- focused tests under `src/tests/` and native registry tests
- `docs/architecture/app-architecture.md`
- `docs/architecture/pi-local-process-boundary.md`
- `docs/architecture/three-body-conversation-reconciliation.md`
- this story package

A change to authority/event/persistence schemas, capacity, Mirror runtime or unrelated roadmap packages is a scope change and must stop for Navigator review.

## Validation Route

Automated and DEV-only desktop E2E validation are required. The detailed matrix and commands are in [test-guide.md](test-guide.md).

Navigator-visible validation must prove three separate fresh DEV scenarios under exact capacity `2`:

1. targeted cancellation of A while B continues and naturally commits;
2. controlled exact A child death while B continues and naturally commits;
3. app shutdown while A/B run, followed by restart with zero phantom child/route and exact model-free recovery.

Every scenario records exact Journey/run authority, direct child PID evidence, projection/outbox bytes and stable/production baselines. No stable execution or production Mirror mutation is permitted.

Expected observation: cancelling or failing A changes only A; B keeps streaming and settles naturally. App close targets only its two exact children, and restart restores no live process while preserving independent recoverable evidence.

Pass condition: all automated gates pass; targeted cancellation and controlled process death affect only exact A authorities; B remains byte-identical except for its own valid stream/settlement; interrupted and completed-failure frontiers persist correctly; shutdown/restart is bounded and model-free; capacity stays exactly `2`; stable/production baselines have zero delta.

Fail condition: any sibling child/control/state mutation, selected-Journey retargeting, duplicate terminalization, fabricated completion, cross-Journey projection/outbox/receipt write, stale replacement mutation, lock-held child/provider/remote work, unbounded shutdown, phantom restart process, capacity drift or stable/production mutation fails Validation.

## Implementation Contract

- TDD is mandatory for every behavior change.
- Automated concurrency uses deterministic barriers, deferred promises, fakes and temporary files; no timing sleeps or real Pi processes.
- Real child signalling is permitted only in the later explicitly authorized DEV E2E route, against an exact recorded disposable child PID after authority correlation.
- Native exact target validation remains the final cancellation/control boundary.
- First terminal signal wins independently per run.
- Interrupted and completed settlement preserve existing TS-4 save/frontier modes and per-Journey queues.
- Provider lifetime, child control, joins, filesystem work, event emission and remote Mirror append remain outside global locks.
- Production capacity remains exactly `2`; injected limits `1|2` remain supported.
- Use `uv run` for project Python commands, if any.
- Commit only story-scoped files with descriptive English messages; do not use `git add .`.
- This Plan authorizes no implementation, DEV smoke, push, promotion, release or deployment.

## Stop Conditions

Stop and return to Navigator review if implementation would require:

- changing production capacity or adding a dynamic capacity/fault configuration;
- changing authority, event, command or persistence schemas;
- untargeted process search/control or lock-held kill/wait/provider/filesystem work;
- allowing selected Journey to determine cancellation, settlement or recovery destinations;
- weakening pre-frontier, post-frontier, rollback or exact-cleanup validation;
- fabricating completed evidence for interrupted runs;
- a timing-based automated race or an uncorrelated real-process signal;
- modifying Mirror runtime, stable channel, production data, release or deployment scope;
- proceeding after any required gate fails without a narrow evidenced correction.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- independent after-plan review must verify terminal precedence, exact target ownership, interrupted/completed failure frontiers, sibling byte isolation, bounded shutdown/restart recovery, capacity preservation and the safety of the DEV-only exact-PID route;
- implementation remains blocked until the Navigator explicitly approves this exact Plan.
