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

## Acceptance

- Work in a Journey workspace is admitted while a child conversation works, wherever native admission and exact authority permit it.
- A genuine shared constraint names itself precisely — capacity, same workspace, generation or process authority — rather than a generic global busy state.
- Every invariant listed in investigation item 3 is re-validated with guard-level tests, and none of CR115, CR116 or CR132's behaviour regresses.
- No durable artifact is corrupted or interleaved by two concurrent turns in one Journey; the settlement model's guarantees hold per turn.
- Where concurrency is refused, the refusal is visible and explained on the surface rather than silent — this CR must not widen the gap CR132 named.
- If concurrency proves unsafe, that conclusion is recorded with its evidence and the refusal is made legible instead.

## Boundaries

No fabricated concurrency: distinct visual workspaces may run together only where native process capacity and exact Journey, thread and generation authority admit them. No change to transcript authority or Mirror Core. The Rust registry and the TypeScript reducer change together or neither changes. Capacity limits remain the Navigator's configured limits and are not raised to manufacture parallelism.
