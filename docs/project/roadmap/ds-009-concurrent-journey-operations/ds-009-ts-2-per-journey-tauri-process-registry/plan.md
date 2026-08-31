# Plan — DS-009.TS-2

## Objective

Replace the single Tauri `PiProcessState` child slot with a bounded registry keyed by native `journeyId`, while preserving exactly one globally admitted run or finalizing lease in production. Each entry owns one immutable `RunAuthority`, one `runId`, one child lifecycle, one cancellation state, one terminalization state and one private provider snapshot. Reservation happens atomically before spawn, every later mutation is conditional on the expected `journeyId + runId`, and repeated or stale callbacks cannot release capacity or alter a replacement run.

TS-2 establishes native process ownership and Journey lease authority only. It does not enable real concurrency, concurrent settlement or new persistence semantics.

## Current-State Characterization

The implementation starts from these observed constraints in `src-tauri/src/main.rs` and the completed TS-1, TS-3 and US-1 contracts:

- `PiProcessState` currently stores three independent mutexes: one global `Option<Child>`, one global cancelling flag and one global optional `PiProcessEventAuthority`.
- `start_pi_invocation(prompt, config, runAuthority)` validates `RunAuthority`, checks whether the global child slot is occupied, stores event authority and spawns a worker thread.
- The child is inserted into the slot only after process construction and spawn inside the worker. The check and later child insertion are not one atomic reservation boundary.
- `cancel_pi_invocation` is currently untargeted. It kills whichever child occupies the global slot and reads authority from a separate authority mutex.
- The process loop polls `Child::try_wait()`, clears the child, cancelling and authority slots, joins stdout/stderr readers, reads durable Mirror evidence and emits native `done`.
- Several errors before or during spawn emit `error` plus `done` and return through independent branches. There is no shared idempotent terminalization state.
- TS-1 already requires immutable `RunAuthority`, backend pre-spawn validation and bounded authority-bearing events while preserving persisted `TurnCorrelation` schema `0.2.0`.
- TS-3 already owns one app-lifetime event dispatcher and rejects stale or divergent authority before frontend reduction.
- US-1 already allows presentation navigation while `hasActiveOrFinalizingJourneyRuntime()` keeps all operational starts globally blocked.
- Production currently permits one live/finalizing owner only. TS-2 must retain that observed serial behavior even after the child has terminated and process capacity has become free.

These facts define a registry migration. They do not authorize capacity 2, persistence concurrency, targeted multi-run UX or settlement redesign.

## Registry Ownership Model

### Bounded container

Introduce a native registry abstraction, preferably in a focused Rust module such as `src-tauri/src/pi_process_registry.rs`, managed by Tauri through one mutex-protected state object:

```text
PiProcessRegistry
  productionLimit: 1
  entries: HashMap<journeyId, RegistryEntry>
  processCapacityInUse: usize
```

The limit is injected by constructors used in deterministic tests. Production must use one private constant:

```text
PRODUCTION_PI_PROCESS_LIMIT: usize = 1
```

There is no environment, CLI, frontend or provider override for this limit. A zero or unbounded test limit is rejected. TS-2 tests exercise the production value `1`; raising production capacity belongs only to US-2 after TS-4.

All admission checks and insertion occur while holding the same registry mutex. No check-then-spawn gap may exist outside the reservation transaction.

### Entry authority

Each `RegistryEntry` owns:

- the complete immutable `RunAuthority` validated before reservation;
- the exact `journeyId` and `runId` derived from that authority, never accepted as competing start authority;
- a backend-private immutable `ProviderConfig` snapshot;
- an optional child handle present only after successful spawn attachment;
- process-capacity state;
- Journey lease phase;
- cancellation state;
- terminalization state; and
- bounded allowlisted diagnostic reason codes where needed for inspection.

The entry must not store a second mutable copy of event authority. `PiProcessEventAuthority` is always projected from the entry's `RunAuthority` when emitting or inspecting bounded identity.

Provider snapshot, prompt and process environment remain private implementation data and are never returned by inspection.

## State Model

Process capacity and the Journey lease are related but distinct state dimensions.

### Process-capacity state

```text
reserved  — capacity claimed atomically before spawn; no child attached yet
running   — matching child attached; capacity remains claimed
released  — child never started or has terminated; capacity released exactly once
```

### Journey lease phase

```text
reserved    — authority admitted and spawn is pending
running     — matching child is alive or being cancelled
finalizing  — child capacity is released, but frontend finalization/cleanup is pending
```

There is intentionally no unleased registry entry. Cleanup removes the exact matching finalizing entry.

### Cancellation state

```text
none
requested
```

Repeated matching cancel requests are idempotent. A cancel for a missing Journey, wrong `runId` or non-running/finalizing entry fails closed and cannot affect another entry.

### Terminalization state

```text
open
completed
cancelled
spawn_failed
process_died
```

The first accepted terminal transition wins. Repeated `done`, process-exit, kill completion, wait error or cleanup signals return an idempotent result without emitting a second terminal outcome, decrementing capacity twice or removing another run.

### Required transitions

| From | Trigger | To | Capacity effect | Lease effect |
|---|---|---|---|---|
| absent | atomic reserve | `reserved/open` | claim once | insert exact Journey lease |
| reserved | matching child attached | `running/open` | unchanged | keep lease |
| reserved | spawn/pre-spawn failure | `finalizing/spawn_failed` | release once | retain lease for bounded cleanup |
| reserved | directed cancel before child attachment | `reserved/requested` | unchanged until spawn abort/terminal path | keep lease |
| running | directed cancel | `running/requested` | unchanged until child termination | keep lease |
| running | successful child exit | `finalizing/completed` | release once | retain lease |
| running | cancelled child exit | `finalizing/cancelled` | release once | retain lease |
| running | unexpected exit/wait failure | `finalizing/process_died` | release once | retain lease |
| finalizing | repeated terminal signal | unchanged | none | unchanged |
| finalizing | matching cleanup | absent | already released | remove exact lease |
| any current entry | stale callback with another `runId` | unchanged | none | none |

## Admission and Serial-Capacity Rules

Reservation derives `journeyId + runId` exclusively from the already validated `RunAuthority` and performs these checks atomically:

1. Reject an existing entry for the same `journeyId`, whether reserved, running or finalizing.
2. Reject when the count of admitted Journey leases reaches the injected registry limit.
3. Reject when process capacity cannot be claimed consistently.
4. Insert the reserved entry and claim process capacity before any spawn attempt.

With production limit 1, a finalizing lease still occupies the one admitted registry slot even though its process-capacity state is `released`. Therefore another Journey cannot start while any Journey is finalizing. This deliberately prevents TS-2 from introducing process/settlement overlap before TS-4.

The separate released process-capacity state is still recorded now so TS-4 can later harden finalization and persistence against captured authority. TS-2 must not use that released capacity to admit another Journey while the production lease limit remains occupied.

## Native Command Contracts

### Start

Preserve the single-authority boundary:

```text
start_pi_invocation(prompt, config, runAuthority)
```

The directed target is `runAuthority.journeyId + runAuthority.runId`. Do not add duplicate `journeyId` or `runId` start arguments that could diverge from `RunAuthority`.

The command must:

1. validate prompt and provider shape;
2. validate `RunAuthority` against the active generation and persisted live identity;
3. atomically reserve the registry entry with a private provider snapshot;
4. return a bounded reservation failure without spawning if duplicate Journey or capacity checks fail;
5. spawn only after successful reservation; and
6. attach the child only if the same `journeyId + runId` is still current.

Any error after reservation converges through the matching idempotent terminalization path.

### Directed cancel

Change the native boundary to:

```text
cancel_pi_invocation(journeyId, runId)
```

The frontend adapter becomes `cancelLivePiInvocation(journeyId, runId)`, and `App.tsx` passes the selected owner's captured `JourneyRunIdentity`. The command must compare both fields before setting cancellation state, killing a child or emitting `cancelled`.

A cancellation request that wins before child attachment is retained in the entry; successful spawn attachment must observe it and immediately converge through the same cancellation path rather than creating an uncancellable child.

### Directed cleanup

Add a narrow lifecycle command:

```text
release_pi_invocation_lease(journeyId, runId)
```

It may remove only the matching finalizing entry whose process capacity is already released. Repetition after a successful matching release is idempotent. A stale `runId` cannot remove a replacement entry.

TS-2 wires this command to the same frontend point that currently finishes local finalization. It does not inspect, reorder or redefine Harness projection, Mirror outbox, acknowledgement or persistence success. TS-4 will harden when lease release is authorized by captured durable settlement evidence.

### Bounded inspection

Add a read-only command:

```text
inspect_pi_invocations() -> PiInvocationRegistryInspection
```

Return entries in deterministic Journey order and expose only:

- bounded event-authority identity derived from `RunAuthority`;
- lease phase;
- process-capacity state or boolean;
- cancellation state;
- terminalization state; and
- allowlisted reason codes needed for reconciliation.

Inspection must exclude prompt, assistant response, raw stdout/stderr, provider snapshot, command/arguments, `piSessionFile`, filesystem paths, environment, secrets, credentials and arbitrary error text. The result count is bounded by the validated registry limit/internal maximum.

## Worker and Terminalization Contract

Refactor all worker exits to converge on registry methods that require the expected `journeyId + runId`:

- child attachment;
- cancellation request;
- spawn failure;
- normal exit;
- cancelled exit;
- unexpected process death or wait failure;
- process-capacity release;
- terminal event emission decision; and
- final lease cleanup.

A callback first resolves the current matching entry. If the Journey is missing or has another `runId`, it is stale and returns without mutation or current-run diagnostics.

`done` remains the native event that closes the existing frontend dispatcher route. TS-2 does not change event authority, post-`agent_end` evidence collection or route-closing order. Idempotent terminalization ensures only the winning matching path emits the terminal outcome and native `done` once.

## Planned Files and Responsibilities

Expected implementation surface:

- `src-tauri/src/pi_process_registry.rs` — registry types, injected limit, atomic reservation, directed mutation, idempotent state transitions, bounded inspection and deterministic unit tests.
- `src-tauri/src/main.rs` — replace `PiProcessState`, route start/cancel/worker exits through the registry, register cleanup/inspection commands and preserve existing process/event behavior.
- `src/agent/piProcessStream.ts` — pass directed cancellation and expose cleanup/inspection adapters while preserving `start_pi_invocation(prompt, config, runAuthority)` and central dispatch.
- `src/app/App.tsx` — pass the captured owner `journeyId + runId` to cancel and call matching lease cleanup at the existing finalization-release point without changing settlement ordering.
- Focused TypeScript tests only for the changed command argument shapes and captured-owner call sites.
- Rust tests in the focused registry module and narrow native adapter tests.

Exact file placement may change during implementation, but responsibilities and scope may not.

## Acceptance Behavior

```text
Given production registry limit 1
When two reservation attempts execute concurrently
Then exactly one matching RunAuthority is inserted atomically
And no second child can spawn
And the rejected attempt changes no registry state.
```

```text
Given Journey A run A1 owns the current entry
When cancel or cleanup targets A with another runId
Then A1 is neither killed, terminalized nor removed
And no event is emitted for the mismatched request.
```

```text
Given A1's child terminates
When frontend finalization is still pending
Then process capacity is released exactly once
And A remains leased in finalizing state
And production limit 1 still rejects every new reservation until matching cleanup.
```

```text
Given A1 has been cleaned up and A2 is current
When a late A1 wait, done, cancel or removal callback arrives
Then A2 remains byte-for-byte unchanged
And capacity and inspection still describe A2 only.
```

```text
Given inspection is requested while entries are reserved, running or finalizing
When the bounded projection is serialized
Then it contains only allowlisted authority and lifecycle fields
And contains no prompt, response, provider snapshot, private path, environment or secret.
```

## Implementation Sequence

1. Add failing pure Rust tests for atomic reservations, duplicate Journey, limit 1 and state transitions.
2. Implement the generic/injected-limit registry core without wiring Tauri commands.
3. Add failing tests for directed cancel, early cancel, stale run mutation/removal and idempotent terminalization.
4. Add child/spawner seams or narrow adapters sufficient to deterministically test spawn failure, process death and cancel/done races.
5. Replace `PiProcessState` with the managed registry and reserve before starting the worker.
6. Route every worker return and terminal signal through one expected-run terminalization path.
7. Change cancel to `journeyId + runId`, add directed lease cleanup and bounded inspection.
8. Update minimal frontend adapters/call sites to pass captured owner identity and release the matching lease at the existing finalization boundary.
9. Run focused Rust/TypeScript tests, full gates and a serial DEV-only smoke without enabling overlap.
10. Inspect the diff for TS-4, US-2, US-3, RS015, schema, event-authority or capacity drift.

## Validation Route

Deterministic Rust tests are authoritative for concurrency and race ordering. They must use barriers/fakes rather than timing sleeps. Focused TypeScript tests prove native command targets come from captured owner identity and do not regress the central dispatcher.

A supplementary non-promoting **Nautilus Harness Dev** smoke is required because native start/cancel/cleanup contracts change. Use sequential invocations only: complete and release one disposable Journey run before starting another; exercise directed cancel in a separate sequential run if needed. At no time may two children or a child plus an unreleased finalizing lease be admitted.

Expected observation: ordinary serial runs still stream, cancel or complete and settle as before; native inspection transitions through reserved/running/finalizing/absent without private data; a new run is rejected while any lease occupies production limit 1 and succeeds only after matching cleanup.

Pass condition: the deterministic matrix in `test-guide.md`, full frontend/build and both Rust channel suites pass; DEV remains serial; bounded inspection is private; and no persistence, capacity-2, sibling-story or RS015 change exists.

Fail condition: reservation is check-then-insert; two entries or children are admitted at limit 1; finalization releases the Journey early; mismatched or stale targets mutate a current entry; terminalization releases twice or emits duplicate terminal events; inspection leaks private data; or settlement/persistence concurrency is introduced.

## E2E Decision

A development-channel serial smoke is required as regression evidence for the changed native command lifecycle. Deterministic Rust tests remain authoritative for simultaneous reservations, races, process death and stale callbacks. No stable-channel run, simultaneous child processes, capacity-2 validation, promotion, release or deployment is authorized.

## TS-4 Boundary

TS-2 establishes:

- the bounded Journey-keyed registry;
- atomic reservation and directed lifecycle authority;
- distinct child process-capacity and Journey lease states;
- release of child capacity on termination;
- retention of the Journey lease through existing frontend finalization;
- idempotent terminalization and expected-run cleanup; and
- bounded native lease inspection.

TS-4 will establish:

- captured-authority serialization of persistence and settlement per Journey;
- durable criteria for finalization acknowledgement;
- projection/outbox recovery behavior that authorizes lease release; and
- safe overlap semantics needed before later capacity increase.

TS-2 must not inspect persistence artifacts to decide durability, change Mirror outbox or acknowledgement ordering, serialize concurrent settlement, admit another Journey while a finalizing lease occupies production limit 1, or otherwise anticipate TS-4.

## Preserved Contracts and Non-Goals

- Persisted `TurnCorrelation` remains schema `0.2.0`.
- `RunAuthority` remains the only complete live-run authority and is not redesigned.
- Existing correlated `PiProcessEvent` shape and authority projection remain unchanged.
- One app-lifetime frontend dispatcher and Journey-keyed frontend runtime remain unchanged.
- Production process/lease limit remains exactly 1.
- No real process or settlement concurrency is enabled.
- Mock streaming remains Tauri-free.
- Provider configuration semantics, conversation persistence, transcript recovery, Mirror append/outbox and settlement ordering remain unchanged.
- TS-4, US-2, US-3 and RS015 remain untouched.
- No stable promotion, release or deployment occurs.

## Risks and Mitigations

- **Reservation can still race spawn.** Insert the reserved entry and claim capacity under one mutex before creating the worker.
- **Cancel can arrive before child attachment.** Persist `requested` and make attachment observe it before treating the child as running.
- **A worker may hold the registry lock while blocking on OS operations.** Keep lock-held sections bounded to state comparison/mutation; design child-control handoff so waits and joins happen outside the registry lock without losing expected-run checks.
- **Child exit can accidentally release the Journey.** Release only process capacity on terminalization; require explicit matching cleanup for lease removal.
- **Free child capacity can accidentally enable settlement overlap.** At production limit 1, admission counts the still-present finalizing lease and rejects new reservations until cleanup.
- **Cancel/done races can emit conflicting terminal outcomes.** Use first-terminal-wins state and one terminal emission decision returned by the registry.
- **Late callbacks can delete a replacement.** Require both `journeyId` and `runId` on every mutation/removal and test A1 callbacks after A2 insertion.
- **Inspection can become a debug-data escape hatch.** Serialize a dedicated allowlisted projection derived from authority/lifecycle enums; never serialize the entry.
- **Frontend selection can retarget cancel.** Pass captured selected-runtime identity and retain owner-only cancel visibility from US-1.
- **Registry work can drift into TS-4.** Stop if correct cleanup requires new persistence durability, outbox recovery or settlement serialization semantics.

## Stop Conditions

- Correct lease release requires changing durable projection, Mirror outbox or acknowledgement semantics.
- Production must admit a process while another Journey is finalizing to complete TS-2.
- A `TurnCorrelation` schema change or `RunAuthority` redesign appears necessary.
- Event authority or dispatcher routing must change beyond native command targeting.
- Deterministic race coverage requires sleeps instead of barriers/fakes or cannot prove one terminal outcome.
- TS-4, US-2, US-3, RS015, stable promotion, release or deployment changes appear necessary.
- A required gate fails without a story-scoped fix or independent review finds unresolved lifecycle ambiguity.

## Implementation Contract

- Use TDD for registry state transitions and native command behavior.
- Keep the production constant exactly 1.
- Use injected limits only in tests; do not add runtime configuration.
- Preserve all authority, event, frontend and persistence contracts listed above.
- Stage only TS-2 implementation and lifecycle files; do not use `git add .`.
- Use descriptive English commits explaining why.
- Do not implement until the Navigator explicitly approves this `after_plan` checkpoint through Ariad.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until explicit Navigator approval through Ariad.
