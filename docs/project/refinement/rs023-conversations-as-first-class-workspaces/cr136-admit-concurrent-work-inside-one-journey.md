[< RS023](index.md)

# CR136: Admit Concurrent Work Inside One Journey

**Status:** captured
**Driver:** —
**Delivery:** —

**Gate:** not started before CR133, CR134 and CR135 are in the field.

## Friction

When a conversation is working, the Navigator cannot send work to the Journey that owns it. Distinct workspaces are treated as one busy owner.

This is not a presentation defect. Three layers serialize work by Journey, deliberately:

- `register` quarantines a second run for the same Journey as `serial_capacity_rejected` (`journeyRuntimeState.ts:104`–`:107`);
- the occupancy filter refuses on `entry.authority.journeyId === journeyId`, returning `same_journey_occupied` (`piInvocationOccupancy.ts:289`–`:291`);
- **the native registry's `entries` map is keyed by `journey_id`** inside `reserve` (`pi_process_registry.rs:263`–`:292`), with capacity accounting and `retire_finalizing_journey` attached to that key.

A trap to avoid re-entering: `PiInvocationAuthorityInspection` carries `threadId`, `generation`, `piSessionId` and `mirrorConversationId`, which makes it look as though native authority were already per-workspace. The authority *inspection* carries workspace coordinates; the registry *index* is the Journey.

## Outcome

Work in a Journey workspace can be admitted while a conversation inside it works, where native process capacity and exact authority permit it. Where they do not, the refusal names its real constraint instead of a generic global busy state.

## First Investigation

This CR changes authority, so it characterises before it changes anything.

1. Establish whether two Pi sessions in one Journey can run concurrently at all: process capacity, provider limits, and whether `JourneyProvisioningLease` (per `journey_id`) or `JourneyProjectionPersistenceState.stripe(journey_id, generation)` serialize anything that two conversations would contend for. Two conversations may or may not differ in generation; that is a fact to establish, not assume.
2. Determine the correct key. `RunTarget` already pairs `journey_id` with `run_id`; establish whether the registry key becomes the run, the thread, the conversation or the generation, and what each choice means for capacity accounting and for retiring a finalizing entry.
3. Enumerate every invariant that currently depends on one run per Journey and decide its fate explicitly: `hasActiveNativeExecution`, `derivePiInvocationAdmission`, `isActivePiInvocationLease`, the CR115 and CR116 post-terminal recovery guard, CR132's settlement abandonment offer, and the `serial_capacity_rejected` quarantine. Each must be re-validated, not assumed to survive.
4. Establish what the turn journal, outbox, settlement and segment projections do when two settlements in one Journey overlap, and whether any durable artifact is keyed per Journey in a way that would make two concurrent turns collide.
5. Decide whether the honest answer is partial: for example admitting the Journey workspace alongside one conversation, but not arbitrary conversation pairs.

If this investigation shows the work to be Story-sized, this CR is promoted in turn.

## Index Characterisation (2026-10-08)

Investigation item 2 answered ahead of the gate, because it is read-only and nothing in CR133–CR135 touches the registry. The key choice is settled; the capacity decision below is not, and it is the Navigator's.

### What the durable layer already does — and it is the opposite of what the gate implies

This CR is labelled an authority change in Rust, which invites the fear that concurrent turns would corrupt durable state. They would not. The turn layer is already addressed per run.

- `with_turn_journal_lock` takes `persistence.stripe(&authority.journey_id, **0**)` (`main.rs:3546`) — generation deliberately pinned to zero, so every generation of one Journey shares one journal lock, and the read-modify-write happens inside it.
- All three transitions resolve their record by **full authority equality**: `.find(|record| record.authority == journal_authority)` (`main.rs:3582`, `:3607`, `:3644`), where `TurnJournalAuthority` carries `journey_id, run_id, turn_id, thread_id, generation, pi_session_id, mirror_conversation_id` and both harness message ids. Not by Journey.
- Each transition then uses `expected_revision` and `expected_phase`, so concurrent writers are reconciled optimistically rather than by last-write-wins.
- Production evidence agrees: `turn-journal/mirror-desktop.json` holds 64 records spanning **3 distinct `threadId`s and 5 distinct `mirrorConversationId`s** in one file.

So two concurrent turns in one Journey, on different threads, would serialize on the journal lock and both be recorded without aliasing. The per-Journey *file* is not a per-Journey *record*.

One caution against over-reading this: three non-terminal records coexist in that file today (one `terminal_durable` from 2026-10-04, two `running`), and that is **not** evidence of supported concurrency. One is plausibly the live turn; the rest is residue of the kind CR128 recorded. A snapshot is not a sequence.

### The index today

```rust
entries: HashMap<String /* journey_id */, RegistryEntry<A, C, P>>
struct RunTarget { journey_id, run_id }
trait RegistryAuthority { fn journey_id(); fn run_id(); fn inspection_identity(); }
enum ReserveError { DuplicateJourney, CapacityReached }
const PRODUCTION_PI_PROCESS_LIMIT: usize = 4;
```

`reserve` (`:263`) refuses `DuplicateJourney` when a non-finalizing entry exists for the Journey; `matching_entry` (`:492`) does `entries.get(&target.journey_id)` and then verifies `run_id`, returning `Stale` on mismatch. `process_capacity_in_use` is global, incremented at `:303` and decremented only at `:383`. A second bound exists: `while self.entries.len() >= self.limit` retires a finalizing entry chosen by `.min()` over keys.

### The index proposed

The key becomes the **workspace**, and the workspace is the **thread**.

```rust
struct WorkspaceKey { journey_id: String, thread_id: String }
entries: HashMap<WorkspaceKey, RegistryEntry<A, C, P>>
struct RunTarget { journey_id, thread_id, run_id }
trait RegistryAuthority { fn journey_id(); fn thread_id(); fn run_id(); fn inspection_identity(); }
enum ReserveError { DuplicateWorkspace, CapacityReached, JourneyShareExceeded }
```

`RegistryAuthority` is the seam: it exposes exactly `journey_id()` and `run_id()` today, so the whole re-grain enters through one new trait method.

Why the thread and not the alternatives:

- **Not the run.** `run_id` is per turn, so keying by run would delete same-workspace exclusion entirely and let one conversation start a second concurrent turn. The exclusion must survive; only its grain changes.
- **Not `(thread, generation)`.** Generations of one thread are successive, not concurrent — a restart supersedes its predecessor. Keying per thread preserves exactly today's semantics, including the `is_terminal_finalization` handoff that lets an immediate successor reserve while its predecessor finalizes.
- **The thread is what a workspace is.** A Journey workspace is its root thread; a `desktop_conversation` carries its own `threadId`. And the journal's authority already carries `thread_id`, so registry and journal would agree on grain rather than translate between two.
- **`journey_id` stays in the key** for provenance and so Journey-scoped questions remain expressible without assuming global thread-id uniqueness.

`matching_entry` becomes `entries.get(&target.workspace_key())` with the `run_id` check unchanged, so `Missing` and `Stale` keep their meanings.

### What re-keying silently destroys, and this is the decision

The `journey_id` key is doing three jobs at once:

1. same-workspace exclusion;
2. an implicit **per-Journey cap of one**;
3. the lookup index.

Re-keying preserves (1) at the correct grain and changes (3) mechanically. It **deletes (2) without saying so.** Today four *different* Journeys fill production capacity and a fifth never starts — there is a test named exactly that. After re-keying, one Journey could occupy all four slots and starve every other Journey, and **no existing test would catch it**, because the tests assert that four different journeys fill capacity, never that one Journey cannot.

So the per-Journey share must be decided explicitly rather than inherited. Recommendation: a sub-cap of two per Journey, which delivers this CR's stated outcome — work in the parent workspace while one conversation runs — without letting one Journey monopolise the machine. That is why `JourneyShareExceeded` appears above as its own variant: this CR's acceptance requires a shared constraint to name itself precisely, and a per-Journey cap refused as generic `CapacityReached` would violate it.

**This is a product decision and it belongs to the Navigator.**

### The hazard on the TypeScript side

`derivePiInvocationAdmission` and `hasActiveNativeExecution` share `isActivePiInvocationLease` *and* the `journeyId` filter, and CR132's load-bearing property depends on their agreeing: an active lease means both the composer blocked by occupancy and the repair route obliged to refuse, which is what let CR132 drop its planned `cleanupLease` step. Re-graining one and not the other breaks that property in one direction or the other — a composer that admits a send while recovery still refuses, or the inverse. CR132's property must be **re-derived behaviourally at the new grain**, not assumed to survive.

### Two findings that are not blockers

- The retirement loop picks the lexicographically smallest finalizing key via `.min()`, not the oldest. Deterministic, which is why it is testable, but arbitrary — and more arbitrary once keys are workspaces. Retiring the oldest would need a timestamp the entry does not carry.
- Projections stripe on `(journey_id, generation)` while the journal stripes on `(journey_id, 0)`. Two conversations in one Journey at the same generation number would share a projection stripe and serialize unnecessarily. Coarser than needed is safe, so this is contention, not correctness.

### Strategy

**Phase 0 — the capacity decision.** No code. The Navigator sets the per-Journey share. It changes the design, so it comes first and costs nothing.

**Phase 1 — prove the durable claim with a test rather than with the reading above.** Two concurrent turns in one Journey on different threads: both records admitted, transitioned and terminalized without aliasing, under the existing lock. This runs against *unchanged* code and should pass today. **It is the decision point.** If it passes, this CR is a registry re-key. If it fails, this CR stops, delivers the legible refusal its acceptance already permits, and the durable work becomes its own CR.

**Phase 2 — re-key the registry** with Phase 0's share: `WorkspaceKey`, the trait method, `RunTarget`'s third field, `DuplicateWorkspace`, per-workspace retirement. Every existing registry test is re-proved at the new grain, including the five capacity and terminal-handoff tests.

**Phase 3 — re-grain the TypeScript predicates** and re-derive CR132's shared-predicate property and CR115/CR116's recovery guard behaviourally.

**Phase 4 — field.**

Phase 1 is pure characterisation and changes no behaviour, so it could be run before the CR133–CR135 gate opens if the Navigator wants the feasibility answer sooner. That is a Navigator call; the gate is about risk sequencing, not about knowledge.

## Investigation Findings (2026-10-09)

The gate is open on both readings: CR133, CR134 and CR135 shipped in `v0.2.0-alpha.43`, and production now runs it — the installed binary `e8eda1258071f969c9e8177ed14d8c24d426a1570192c2ae5e68b0fc606ee665` is identical to the binary inside the independently hash-verified DMG, so the chain from build to installation is closed by hash with no attested link.

Items 1, 3, 4 and 5 were answered against source at `f335c14`. Item 2 was answered on 2026-10-08 and **stands** — the key is the workspace and the workspace is the thread. What follows changes the *cost* of that conclusion, not the conclusion.

### Finding 1 — the blocking constraint is a parser, not a predicate

`piInvocationOccupancy.ts:179`-`:181`:

```ts
const journeys = new Set(entries.map((entry) => entry.authority.journeyId));
const runs = new Set(entries.map((entry) => entry.authority.runId));
if (journeys.size !== entries.length || runs.size !== entries.length) return false;
```

**One entry per Journey is a validation invariant on the wire.** This is inside `isValidPiInvocationInspection`, the strict parse guard — not inside a predicate that decides admission. The consequence is mechanical and total:

1. the Rust registry admits two entries for one Journey;
2. the inspection payload fails validation as a whole;
3. the state degrades to `status: "unknown"`;
4. `hasBlockingPiInvocationOccupancy` returns `true` on `state.status !== "known"` (`:300`);
5. the Composer is disabled **app-wide** — the global behaviour already recorded as debt in CR134's findings.

So the system **fails closed**, which is the safe direction and is to its credit. But it means concurrency cannot be partially delivered: until this line changes, re-keying the registry alone does not produce concurrency, it produces an app-wide lockout.

**This invalidates Phase 1 as the decision point.** Phase 1 was written to characterise durability, and the durability reading of 2026-10-08 looks correct. But the *first* thing that would fail is not durability — it is the wire contract, one layer earlier. Phase 1 must characterise admissibility too, and that is cheap: assert what the validator does with two same-Journey entries, against unchanged code.

**One cost reducer found alongside it.** `AUTHORITY_KEYS` already contains `threadId` (`:89`-`:92`), and the key set is checked with `hasExactKeys`. The wire already carries the grain this CR needs; only the uniqueness rule and the index change. No authority field has to be added, which is the expensive kind of change.

### Finding 2 — the TypeScript runtime state is itself keyed per Journey

Phase 3 says "re-grain the TypeScript predicates." That understates it. `journeyRuntimeState.ts` holds

```ts
entries: Record<string /* journeyId */, JourneyRuntimeEntry>
```

and `register` refuses through `state.entries[journeyId]` (`:105`), which is where `serial_capacity_rejected` comes from. Measured: **18 indexed reads of `entries[...]`** in production code and **7 production files** that touch this state — `App.tsx`, `journeyRuntimeState.ts`, `journeyAgentStatus.ts`, `journeyWorkLocus.ts`, `settlementAbandonment.ts`, `journeyNavigationCoordinator.ts`, `journeyCancellation.ts`. Four of those reads are in `App.tsx` at `:1061`, `:2489`, `:3733`, `:5358`.

This is the same re-keying problem as the Rust registry, in a second language, in the app's central runtime state — including two modules CR134 just delivered.

### Finding 3 — the registry has three consumers, not one

`.reserve()` is called in exactly one place, and it is **not** the turn path: `suggest_desktop_conversation_title` (`main.rs:3856`, reserving at `:3911`). The turn path goes through `reserve_then_start` from `start_pi_invocation` (`:4155`). Compaction is the third consumer, by exclusion rather than reservation.

**The consequence for Phase 0 is concrete.** A background title suggestion reserves under the Desktop conversation's own `thread_id`. Today it collides with any turn in the Journey, because the key is the Journey. After re-keying it would collide only with that conversation's own turn — and would be free to occupy a **second slot of the Journey's share** while the parent workspace works. With a per-Journey sub-cap of two, a background title suggestion could consume the slot that this CR exists to open, and the Navigator would see the refusal this CR was built to remove.

So the per-Journey share must either be three, or title suggestions must be excluded from the share accounting. **This was not visible when the sub-cap of two was recommended on 2026-10-08, and it is the stronger argument for a different number.**

### Finding 4 — two per-Journey exclusions survive re-keying mechanically, and both become coarser than necessary

Turn and compaction are mutually exclusive in **both** directions, and both are written as scans over `journey_id` rather than as key lookups, so neither breaks when the map is re-keyed:

- compaction refuses when any registry entry has `entry.authority.journey_id == journey_id && entry.is_active_execution()` (`main.rs:4118`-`:4123`);
- the turn's admission closure refuses when `compaction_in_flight.contains(&run_authority.journey_id)` (`:4186`-`:4191`).

But compaction operates on `pi_session_for_active_generation(&app, &journey_id, &thread_id)` — a **per-thread** file. After re-keying, compacting workspace A would be refused because workspace B is running, and a turn in A refused because B is compacting, although they touch different files. **Coarser than needed is safe, so this is contention rather than a correctness problem** — the same character as the projection-stripe finding of 2026-10-08. It must be *named*, because the next reader will see an unnecessary refusal and treat it as a defect.

### Finding 5 — the lifecycle claim does not touch turns, but it does touch CR133's catalog load

`JourneyProvisioningState.active` is a per-Journey non-blocking refusal, not a queue: `if !active.insert(journey_id.clone()) { return Err("This Journey already has an active lifecycle operation.") }`, released by `Drop`. Six commands hold it: `load_desktop_conversation_catalog` (`:1419`), `delete_desktop_conversation` (`:1439`), `create_desktop_conversation` (`:1487`), `restart_desktop_conversation` (`:1595`), `provision_journey_thread` (`:1964`), `restart_journey_thread` (`:2059`).

Starting a turn takes none of them, so **two concurrent turns in one Journey would not contend here** — item 1's main worry is answered negatively, which is good news.

One thing noticed and deliberately not folded in: a **read**, `load_desktop_conversation_catalog`, holds the same exclusive per-Journey claim as the mutations. Expanding a Journey's conversations — CR133's path — while a conversation is being created in it would be refused. Pre-existing, unrelated to concurrency, and recorded here rather than acted on.

### Finding 6 — the durable layer is shaped correctly, and item 4's reading holds

Every durable artifact is a per-Journey **file or directory** holding per-authority **records**: `turn-journal/` 23 files, `settlement-timings/` 14, `dedicated-journey-conversations/` 23, `conversation-segments/` 18 directories. Combined with the 2026-10-08 characterisation — one journal lock per Journey at `stripe(journey_id, 0)`, records resolved by full `TurnJournalAuthority` equality, optimistic `expected_revision` and `expected_phase` — a per-Journey file holding per-authority records is the right shape for two concurrent turns.

Exactly one production call site stripes on a real generation: `main.rs:9031`, `persistence.stripe(&journey_id, generation)`. Every other call pins `0`.

The outbox could not be characterised empirically: `mirror-append-outbox.json` holds **0 items** right now, so its item shape was not read. Stated as unestablished rather than assumed.

### Item 5 — is the honest answer partial?

Yes, but not in the way the item anticipated. The question assumed the partial answer would be *which workspace pairs* to admit. The measurement says the real partition is by **layer**: the durable layer is ready, the Rust index is a designed change, and the TypeScript side is a second re-keying plus a wire contract that currently forbids the state entirely.

### Verdict: this is Story-sized

The CR's own promotion rule applies. Measured scope:

| Layer | Change |
|---|---|
| Rust registry | `WorkspaceKey`, trait method, `RunTarget` third field, `DuplicateWorkspace`, `JourneyShareExceeded`, per-workspace retirement |
| Rust exclusions | compaction both directions re-validated at the new grain, left coarse deliberately |
| Rust consumers | title suggestion's share accounting decided |
| TS wire contract | the uniqueness invariant in the parse guard — blocking, and fails closed into an app-wide lockout |
| TS runtime state | `entries` Record re-keyed; 18 indexed reads across 7 production files |
| TS predicates | `derivePiInvocationAdmission`, `hasActiveNativeExecution`, `isActivePiInvocationLease` callers, the `otherEntries` filter at `:258` |
| Shared properties | CR132's two-predicate agreement re-derived behaviourally; CR115 and CR116 recovery guard |
| Tests pinning the old grain | 8 files — 6 TypeScript, plus `pi_process_registry.rs` and `main.rs` |

Each of those is a reviewable boundary with its own acceptance, and several can be field-verified separately. **Recommendation: promote this CR into a Story**, with the wire contract and the TypeScript re-grain as the first slice — because that is where the system currently refuses the state outright, and because it can be proved before any authority changes.

**What is not recommended:** starting Phase 2 now. Re-keying the registry while the parse guard still rejects the result would produce an app-wide Composer lockout as its first observable effect.

### Decisions this investigation leaves to the Navigator

1. **Promotion.** Story, or kept as one CR against the measurement above.
2. **The per-Journey share**, now with Finding 3 in view: three, or two with title suggestions excluded from the share.
3. **Whether the coarse turn and compaction exclusion stays coarse.** Recommended: stays, named as deliberate contention.

## Acceptance

- Work in a Journey workspace is admitted while a child conversation works, wherever native admission and exact authority permit it.
- A genuine shared constraint names itself precisely — capacity, same workspace, generation or process authority — rather than a generic global busy state.
- Every invariant listed in investigation item 3 is re-validated with guard-level tests, and none of CR115, CR116 or CR132's behaviour regresses.
- No durable artifact is corrupted or interleaved by two concurrent turns in one Journey; the settlement model's guarantees hold per turn.
- Where concurrency is refused, the refusal is visible and explained on the surface rather than silent — this CR must not widen the gap CR132 named.
- If concurrency proves unsafe, that conclusion is recorded with its evidence and the refusal is made legible instead.

## Boundaries

No fabricated concurrency: distinct visual workspaces may run together only where native process capacity and exact Journey, thread and generation authority admit them. No change to transcript authority or Mirror Core. The Rust registry and the TypeScript reducer change together or neither changes. Capacity limits remain the Navigator's configured limits and are not raised to manufacture parallelism.
