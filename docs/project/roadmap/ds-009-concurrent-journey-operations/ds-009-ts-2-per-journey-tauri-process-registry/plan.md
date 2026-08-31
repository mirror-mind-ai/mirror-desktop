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
finalizing  — child capacity is released, but the native Journey lease remains until the caller reaches the existing durable settlement boundary and requests matching cleanup
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
| finalizing | matching cleanup requested by the caller after its durable boundary | absent | already released | remove exact lease |
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

It may remove only the matching finalizing entry whose process capacity is already released. Repetition after a successful matching release is idempotent. A missing entry, wrong Journey, stale `runId` or cleanup while the entry is reserved/running fails closed and cannot remove a replacement entry.

Frontend presentation finalization and native Journey lease release are separate decisions. The existing `finalization_finished` presentation action is emitted from `finally`, including when projection/save or outbox enqueue fails; it is therefore not cleanup authority. `release_pi_invocation_lease` must never be called unconditionally from that `finally` path or merely because presentation left `finalizing`.

The native registry remains persistence-agnostic. It does not read projection, transcript, reconciliation, outbox or acknowledgement state and accepts only an exact directed cleanup request for a finalizing entry. The frontend caller owns the serial-era durable-boundary decision using results already produced by the existing settlement flow:

- a completed turn may request cleanup only after required native evidence exists, the dedicated conversation projection/save has completed successfully and the Mirror outbox item has been durably enqueued;
- Mirror append execution or acknowledgement may remain pending after successful enqueue, because the durable outbox item already provides the recovery handle;
- missing native evidence, projection/save failure before enqueue, or outbox creation/enqueue failure must retain the finalizing lease;
- a cancelled or failed turn may request cleanup only after its interrupted state has been saved durably; and
- a later retry/recovery that reaches the applicable durable boundary requests cleanup with the same start-captured `journeyId + runId`.

A premature cleanup after native finalizing but before this durable boundary is prevented by the caller's fail-closed decision path; the persistence-agnostic registry cannot infer durability from `finalization_finished`. Production limit 1 continues rejecting every new reservation while the retained lease remains finalizing.

This preserves the existing serial safety invariant that a run without a durable projection/outbox or interrupted-state recovery handle blocks another start. TS-4 will harden captured-authority persistence, recovery and durable authorization for future overlap; it does not introduce this basic enqueue safety.

### Frontend lease occupancy and operational admission

Frontend presentation phase and native lease occupancy are distinct authority surfaces. `finalization_finished` may end the owner's visible `Recording` phase while the exact native lease remains `finalizing`. The frontend must therefore maintain an explicit authority-bound native occupancy projection keyed by `journeyId + runId`, rather than deriving all admission from `JourneyRuntimeEntry` presentation phase.

The frontend occupancy model must represent at least:

```text
reconciling/unknown — native occupancy has not yet been established; fail closed
known occupied       — exact inspected or locally tracked native lease exists
known free           — bounded inspection and matching cleanup evidence show no blocking lease
```

The existing `runtimeBusy`/operational-admission projection, or its explicitly named successor, must include native occupancy rather than only presentation runtime. Global operational admission is blocked when any of these is true:

- a frontend run is active or presentation-finalizing;
- a start reservation is pending;
- any exact native lease is reserved, running or finalizing; or
- native occupancy is unknown/reconciling after startup, reload or a divergent cleanup/retry response.

While a native lease remains finalizing, the mutable-action allowlist is closed and exact. Only these actions are permitted:

- Journey-scoped textual draft editing;
- bounded native inspection/reconciliation;
- exact owner-scoped settlement recovery for the same inspected `journeyId + runId`; and
- matching lease cleanup after that recovery reaches the applicable durable boundary.

Everything else remains blocked: Send, Enter, attachments, settings/profile mutation, Journey administration, generation restart, generic Journey repair, retry of another pending turn, stale retry, and every new start or staging path. The retained owner may show an owner-scoped settlement error and matching retry affordance, but must not falsely show `Working` or `Recording` after presentation finalization has ended. A selected non-owner may edit its text draft but cannot invoke the owner's recovery.

The local occupancy entry is removed only after `release_pi_invocation_lease` returns success or idempotent success for the same captured `journeyId + runId`. Cleanup failure, mismatched identity, missing/unparseable response, or inspection that still reports the lease keeps admission blocked. An idempotent response for stale A1 must never remove a separately tracked or inspected A2 entry.

`inspect_pi_invocations` is consumed as occupancy authority:

- during frontend initialization or reload within the same live Tauri process, before operational controls are enabled;
- before treating capacity as available whenever local occupancy is absent but uncertain;
- after cleanup or retry returns a divergent, missing or ambiguous response; and
- to reconcile exact leases after dispatcher/frontend remount without inventing process or settlement content.

Reconciliation is bounded and trigger-driven; TS-2 adds no unbounded polling. Overlapping inspection requests carry a monotonic request token or equivalent freshness guard so a stale A1 result cannot replace or clear newer A2 occupancy. Inspection may establish occupancy identity and lease phase only. It cannot reconstruct prompts, messages, assistant deltas, conversation snapshots, settlement results or persistence authority.

### Exact owner-scoped settlement recovery

Inspection alone never invents recovery authority. After initialization/reload or any retained-lease reconciliation, the frontend must cross the inspected `journeyId + runId` with the persisted correlated turn and dedicated generation evidence. Retry is exposed only when all of these match the inspected lease:

- owner `journeyId`;
- persisted `runId` and `turnId` from the existing correlation;
- active thread/generation and session identity required by the existing dedicated turn; and
- an existing recoverable failure phase: projection/save, outbox enqueue/append/ack, or interrupted-state save.

The allowed recovery resumes only the failed settlement work for that exact persisted turn. It must not start a child, call `start_pi_invocation`, create a new `runId` or `turnId`, construct new user/assistant messages, create a new staged turn, switch generation, or absorb another pending turn. It may only resume the already-authorized projection/save, outbox enqueue/append/ack or interrupted-state save appropriate to the recorded failure.

The retry control is rendered only for the retained owner and only while the selected owner, inspected lease and persisted recovery evidence identify the same run. Journey B or any non-owner cannot dispatch A's recovery. A persisted retry for A0 cannot satisfy inspected lease A1. If inspection reports A1 but no matching persisted correlated recovery evidence exists, occupancy remains fail-closed and the owner receives a bounded diagnostic; cleanup is not forced and generic repair/restart remains blocked.

Retry failure preserves the exact occupancy and global admission block. Retry success through durable outbox enqueue or durable interrupted-state save requests `release_pi_invocation_lease` exactly once for the same captured pair. Operations are re-enabled only after cleanup success/idempotent success is confirmed and no replacement occupancy exists.

This carve-out keeps the already-existing serial settlement recovery operable under retained native leases. TS-4 remains responsible for captured-authority persistence/settlement hardening and recovery under future overlap; TS-2 does not generalize recovery or introduce concurrency.

Frontend admission is an early fail-closed guard, not the atomic capacity decision. Before creating or saving a staged turn, `generatePacket` must prove native occupancy is known-free in addition to existing runtime/reconciliation checks. The native registry reservation remains the final atomic TOCTOU barrier. A reservation race may still reject after the early check, but no irreversible staging may survive that rejection: pre-reservation staging must remain rollback-safe and the existing pre-agent rollback must restore durable conversation state before operations can be re-enabled.

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
- `src/agent/piProcessStream.ts` — pass directed cancellation and expose typed cleanup/inspection adapters while preserving `start_pi_invocation(prompt, config, runAuthority)` and central dispatch.
- `src/app/journeyRuntimeState.ts` or a focused occupancy module — retain presentation phases while representing exact native lease occupancy and reconciliation status separately; derive fail-closed aggregate operational admission without making inspection conversation authority.
- `src/app/App.tsx` — consume occupancy inspection on initialization/reload and uncertainty boundaries; cross inspected identity with persisted correlated recovery evidence; expose only exact owner-scoped settlement retry; guard generic repair/restart and every pre-staging/mutation path; keep `finalization_finished` presentation-only; clear occupancy only after matching recovery reaches durability and exact cleanup is confirmed.
- Focused TypeScript tests for command shapes, occupancy reconciliation, aggregate admission, captured-owner cleanup/retry and owner-scoped retained-lease errors.
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
When frontend presentation finalization finishes before a durable projection/outbox or interrupted-state boundary succeeds
Then process capacity is released exactly once
And finalization_finished alone does not request native cleanup
And A remains leased in finalizing state
And production limit 1 rejects every new reservation until a matching durable retry requests cleanup.
```

```text
Given a completed A1 turn has native evidence and its dedicated projection/save plus Mirror outbox enqueue succeed
When Mirror append or acknowledgement remains recoverably pending
Then the caller may release the exact A1 lease because enqueue supplied the durable recovery handle
But projection failure, enqueue failure or missing native evidence retains the lease.
```

```text
Given A1 presentation has emitted finalization_finished but native inspection still reports A1 finalizing
When Journey B is selected
Then B may edit its text draft
But global operational admission still blocks Send, Enter, attachments, settings/admin mutations and turn staging
And A shows only an owner-scoped error/retry state, not false Working or Recording.
```

```text
Given frontend local runtime state is empty or claims capacity is free
When bounded native inspection is occupied or the native reservation loses a race
Then frontend operations remain fail-closed or the atomic reservation rejects without a second child
And no irreversible staged turn survives the rejection.
```

```text
Given a cancelled or failed A1 turn
When its interrupted state is saved durably
Then the caller may release the exact A1 lease
But interrupted-state save failure retains the lease until a matching retry succeeds.
```

```text
Given native inspection reports retained A1
When persisted correlated recovery evidence also identifies A1 and its existing failure phase
Then only A's selected owner may retry that settlement phase without starting a child or creating a run, turn, messages or staging
But persisted A0 evidence, non-owner selection or missing recovery evidence keeps A1 blocked with a bounded diagnostic.
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
7. Change cancel to `journeyId + runId`, add persistence-agnostic directed lease cleanup and bounded inspection.
8. TDD an authority-bound frontend native-lease occupancy model separate from presentation phase, including unknown/reconciling fail-closed state and exact inspection reconciliation.
9. TDD exact recovery matching between inspected lease and persisted correlated turn/generation evidence; expose retry only to the selected owner and only for the existing failed settlement phase.
10. TDD a fail-closed cleanup decision separate from `finalization_finished`: retry creates no child/run/turn/messages/staging; request cleanup only after completed projection/save plus durable outbox enqueue, or durable interrupted-state save; retain occupancy on missing/mismatched evidence, retry failure or cleanup ambiguity.
11. Guard every other operational and pre-staging path with aggregate frontend runtime plus native lease occupancy; keep only textual drafts, inspection, exact owner recovery and post-durability cleanup allowlisted.
12. Update adapters/call sites to pass the same captured owner identity to cancel, durable cleanup and settlement recovery; consume inspection at initialization/reload and uncertainty boundaries without changing settlement ordering.
13. Run focused Rust/TypeScript tests, full gates and a serial DEV-only smoke without enabling overlap.
14. Inspect the diff for TS-4, US-2, US-3, RS015, schema, event-authority or capacity drift.

## Validation Route

Deterministic Rust tests are authoritative for concurrency and race ordering. They must use barriers/fakes rather than timing sleeps. Focused TypeScript tests prove native command targets come from captured owner identity and do not regress the central dispatcher.

A supplementary non-promoting **Nautilus Harness Dev** smoke is required because native start/cancel/cleanup contracts change. Use sequential invocations only: complete and release one disposable Journey run before starting another; exercise directed cancel in a separate sequential run if needed. At no time may two children or a child plus an unreleased finalizing lease be admitted.

Expected observation: ordinary serial runs still stream, cancel or complete and settle as before; native inspection transitions through reserved/running/finalizing/absent without private data; `finalization_finished` can end Recording while retained lease occupancy keeps every operational control and pre-staging path blocked; text drafts remain editable; only exact confirmed cleanup removes occupancy and re-enables operations.

Pass condition: the deterministic matrix in `test-guide.md`, full frontend/build and both Rust channel suites pass; DEV remains serial; bounded inspection is private; and no persistence, capacity-2, sibling-story or RS015 change exists.

Fail condition: reservation is check-then-insert; two entries or children are admitted at limit 1; presentation finalization or uncertain cleanup re-enables operational controls; staging occurs while inspection is occupied/unknown; mismatched or stale targets clear replacement occupancy; terminalization releases twice or emits duplicate terminal events; inspection leaks private data; or settlement/persistence concurrency is introduced.

## E2E Decision

A development-channel serial smoke is required as regression evidence for the changed native command lifecycle. Deterministic Rust tests remain authoritative for simultaneous reservations, races, process death and stale callbacks. No stable-channel run, simultaneous child processes, capacity-2 validation, promotion, release or deployment is authorized.

## TS-4 Boundary

TS-2 establishes:

- the bounded Journey-keyed registry;
- atomic reservation and directed lifecycle authority;
- distinct child process-capacity and Journey lease states;
- release of child capacity on termination;
- retention of the Journey lease after presentation finalization until the caller reaches an existing durable projection/outbox or interrupted-state boundary;
- a persistence-agnostic native cleanup command invoked only by exact captured identity from a successful durable branch or later matching retry;
- explicit frontend occupancy/admission derived from exact native leases, kept separate from presentation phase;
- trigger-driven inspection reconciliation before capacity is considered available and after ambiguous cleanup/retry;
- idempotent terminalization and expected-run cleanup; and
- bounded native lease inspection.

The basic serial safety rule already exists and remains mandatory in TS-2: completed turns require successful projection/save plus durable outbox enqueue, cancelled/failed turns require durable interrupted-state save, and failure before those boundaries retains the lease under production limit 1. TS-4 is not responsible for introducing that safety.

TS-4 will establish:

- captured-authority serialization and hardening of persistence and settlement per Journey;
- recovery and durable release authorization under future process/finalization overlap;
- protection against cross-run persistence races once serial admission is relaxed; and
- safe concurrency prerequisites before later capacity increase.

TS-2 must not make the native registry inspect persistence artifacts, change Mirror outbox or acknowledgement ordering, serialize concurrent settlement, admit another Journey while a finalizing lease occupies production limit 1, or otherwise anticipate TS-4.

## Preserved Contracts and Non-Goals

- Persisted `TurnCorrelation` remains schema `0.2.0`.
- `RunAuthority` remains the only complete live-run authority and is not redesigned.
- Existing correlated `PiProcessEvent` shape and authority projection remain unchanged.
- One app-lifetime frontend dispatcher and Journey-keyed presentation authority remain unchanged; TS-2 adds only exact native lease occupancy/admission alongside presentation phase.
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
- **Child exit or `finalization_finished` can accidentally release the Journey.** Release only process capacity on terminalization; treat frontend presentation finalization as non-authoritative and request exact cleanup only after the existing durable projection/outbox or interrupted-state boundary.
- **Projection, enqueue or interrupted-save failure can be hidden by `finally`.** Keep both native lease occupancy and global operational admission blocked on every failed durable branch; let only a later matching retry/recovery request cleanup.
- **Presentation may look idle while native occupancy remains retained.** Model presentation and occupancy separately; allow only text drafting, bounded inspection, exact owner settlement recovery and matching post-durability cleanup; keep every generic operation blocked.
- **A generic retry could become a back door to new work.** Match inspected `journeyId + runId` to persisted correlation/generation, resume only the recorded settlement phase, and assert no child, run, turn, message or staging creation.
- **Inspection can identify a lease without proving recoverability.** Require matching persisted recovery evidence; otherwise retain occupancy, expose a bounded owner diagnostic and forbid forced cleanup.
- **Frontend reload may forget an in-process native lease.** Reconcile bounded inspection before enabling operations and fail closed while inspection is unknown.
- **Local free state can race native reservation.** Check occupancy before staging, keep staging rollback-safe, and retain the backend atomic reservation as the final TOCTOU barrier.
- **Free child capacity can accidentally enable settlement overlap.** At production limit 1, admission counts the still-present finalizing lease and rejects new reservations until durable matching cleanup.
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
