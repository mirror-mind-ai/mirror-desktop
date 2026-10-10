[< RS024](index.md)

# CR139: Key the Native Registry by Workspace

**Status:** planned
**Driver:** —
**Delivery:** —

**Gate: not started before CR138 is merged.** Re-keying the registry while the renderer's validator still forbids two entries per Journey produces an app-wide Composer lockout as its first observable effect (CR136, Finding 1).

## Friction

`PiProcessRegistry.entries` is a map keyed by `journey_id` inside `reserve` (`pi_process_registry.rs:263`–`:292`), with capacity accounting and `retire_finalizing_journey` on that key. A second reservation in the same Journey returns `ReserveError::DuplicateJourney`, mapped at `main.rs:3913` and `:4219` to *"This Journey already has an active or finalizing Pi invocation."*

Three consumers share that key. The turn path reserves through `reserve_then_start` from `start_pi_invocation` (`:4155`). `suggest_desktop_conversation_title` reserves directly (`:3856`, `:3911`) under the Desktop conversation's own `thread_id`, so after re-keying it occupies a workspace slot of its own. Compaction does not reserve; it excludes by scanning `entry.authority.journey_id == journey_id && entry.is_active_execution()` (`:4118`–`:4123`), and the turn's admission closure excludes compaction by `compaction_in_flight.contains(&journey_id)` (`:4186`–`:4191`). Both scans survive re-keying mechanically and both become coarser than the per-thread session file compaction actually rewrites.

The durable layer is already shaped for this. Journal records resolve by full `TurnJournalAuthority` equality; the journal lock stripes on `(journey_id, 0)`; every durable artifact is a per-Journey file holding per-authority records. Exactly one production call site stripes on a real generation (`main.rs:9031`). That characterisation was made by reading, not by test, and this CR must turn it into a test before changing the key.

## Outcome

The registry indexes by `(journey_id, thread_id)`, admits up to three live entries per Journey, refuses the same workspace by name, retires per workspace, and keeps turn and compaction mutually exclusive per Journey — deliberately coarse, and guarded as such.

## First Investigation

1. **Durability characterisation against unchanged code**: two `RunAuthority` values in one Journey with distinct `thread_id`s, journaled, settled and compacted in interleaved order, must leave both records intact with correct revisions. CR136's Phase 1 as originally written, now sequenced after CR138.
2. Design `WorkspaceKey` and the trait method that yields it from `RunAuthority`; establish whether `RunTarget` gains a third field or carries the key, and what `inspect()` emits — it must still satisfy CR138's validator byte for byte.
3. Define `ReserveError::DuplicateWorkspace` and `ReserveError::JourneyShareExceeded`, map both at `:3913` and `:4219`, and keep `CapacityReached` global.
4. Establish how `retire_finalizing_journey` becomes per-workspace without stranding a `finalizing` sibling — CR116's recovery guard pins the current semantics and must be re-aimed, not deleted.
5. Write a guard that asserts the compaction exclusion scans by `journey_id` and names the coarseness in its description, so that narrowing it later is a visible decision.
6. Confirm `materialize_completed_journal_delivery_debt` (inside the admission closure, per Journey) is safe to run while a sibling workspace is live.

## Investigation Findings and Plan (2026-10-10)

All six First Investigation items answered against source. Two findings change the plan's shape:
one large cost reducer, and one defect this CR would otherwise introduce.

### Finding 1 — `RunTarget` must not gain a field, and the IPC boundary does not change

The plan asked whether `RunTarget` grows a third field or carries the key. **Neither.** `RunTarget`
is `(journey_id, run_id)` and that pair is already unique, because `run_id` is minted per turn. Only
the *map* is keyed by Journey; every target lookup goes through `self.entries.get(&target.journey_id)`
and then compares `run_id`. Keying the map by workspace requires changing the lookups, not the target.

This matters well beyond ergonomics. `RunTarget` is built at three sites in `main.rs`
(`:5577`, `:5641`, `:5690`), and two of those are Tauri commands whose parameters come straight from
the renderer: `cancel_pi_invocation(journey_id, run_id)` and
`release_pi_invocation_lease(journey_id, run_id)`. Growing `RunTarget` would change both command
signatures and every renderer call site, which would drag the renderer back into a slice that was
ordered to be purely native. Resolving by `(journey_id, run_id)` instead keeps **CR139's renderer
diff at zero**.

The lookups become exact-authority resolution over `entries.values()`. A scan is honest here: the map
is bounded at `limit` = 4 (see Finding 3), so this is a walk over at most four records under a lock
already held. The `Missing`/`Stale` distinction must be preserved deliberately: today a present
Journey with a different `run_id` is `Stale` and an absent Journey is `Missing`. The replacement rule
is *no entry with that run, but some entry in that Journey → `Stale`; no entry in that Journey at all
→ `Missing`*, which reproduces today's verdicts exactly at the Journey grain and extends to siblings
without inventing a third outcome.

### Finding 2 — Steering would break for a sibling workspace, silently and with a misleading message

`steer_pi_invocation` (`main.rs:5577`–`:5584`) resolves the inspection entry with
`.find(|entry| entry.authority.journey_id == target.journey_id)` — **matching on the Journey alone and
ignoring `run_id`**, unlike `cancel_pi_invocation` (`:5644`), which matches on both. With one entry per
Journey that is correct by accident. With two, it finds whichever sibling the inspection sorts first,
`exact_steering_authority_matches` then rejects it, and the Navigator is told *"Steering authority does
not match the exact active turn."* — a sentence that is false about the turn they are actually steering.

This is a defect **this CR creates**, not a pre-existing one made visible, so it is fixed inside CR139
rather than captured: the `find` gains the `run_id` comparison, and a test steers the second workspace
of a Journey and asserts the line reaches *its own* child.

### Finding 3 — the truncation risk was refuted by measurement, not by argument

`inspect()` sorts by `journey_id` and then `truncate(self.limit)`. I expected this to be able to drop
a *live* entry once a Journey held several, and that a Journey's share of three would make it routine.
**A throwaway probe refuted it.** Four live entries plus one finalizing entry deliberately named to
sort first produced `entries_in_map=4`, `inspected_len=4`, `live_visible=4`: nothing was dropped,
because the `while self.entries.len() >= self.limit` loop in `reserve` (`:280`–`:289`) retires
finalizing entries *before* inserting. `entries.len() <= limit` is an invariant that `reserve` keeps,
so `truncate` can never reach a live entry. The probe was run and removed; the repo carries the fact
rather than a manufactured diff.

The sort still has to change, for a different reason: with two entries in one Journey, ordering by
`journey_id` alone is **unstable between siblings**, so the inspection's entry order — and therefore
the renderer's — would vary between calls. It becomes `(journey_id, thread_id)`. CR138 already sorts
the renderer side by the same pair.

### Finding 4 — the eviction loop is what keeps a finalizing sibling from being stranded, and the share makes it routine

Item 4 asked how `retire_finalizing_journey` becomes per-workspace without stranding a `finalizing`
sibling. The answer is that nothing is stranded, and the mechanism is already there in two parts.
`reserve`'s duplicate check doubles as a retirement trigger: `existing_is_terminal_finalization ==
Some(true)` retires that key before inserting (`:273`–`:276`), which at workspace grain means *a new
turn in the same workspace retires that workspace's finalizing lease* — exactly CR116's semantics,
narrowed correctly. A finalizing lease in a *different* workspace is left alone by that path and is
reclaimed either by `release_lease` or by the eviction loop.

What does change is frequency. A Journey allowed three live workspaces presses `entries.len()`
against the limit of four routinely, where today it is rare, so **the eviction loop goes from an edge
case to an ordinary path**. That has one consequence worth testing rather than asserting:
`remember_released` bounds `released_targets` at `limit * 2` = 8 (`:435`–`:440`), and that memory is
what turns a late `release_lease` into `AlreadyReleased` instead of `Missing`. Three workspaces
churning in one Journey consume that memory faster than one did. The delivery must **measure**
whether eight is still enough and widen it only if a test shows a forgotten target; guessing upward
would be a cap no measurement supports.

### Finding 5 — a finalizing sibling must not count toward the Journey's share

The share of three is counted by scanning `entries.values()` for the Journey, and the scan must
exclude `is_terminal_finalization` entries. A finalizing entry consumes no `process_capacity_in_use`
(`terminalize` releases it at `:376`–`:379`), so letting it count would let a corpse refuse the
Journey's third workspace — a refusal with no resource behind it. The share counts live entries only,
which keeps it aligned with the global capacity rule it sits under.

### Finding 6 — the Journey-wide journal reconciliation cannot touch a live sibling

`materialize_completed_journal_delivery_debt` runs inside the admission closure, per Journey, and
reads every record in the Journey's journal. It is safe beside a live sibling for a reason in its own
filter: candidates require `terminal_outcome == Some(Completed)` and a phase in
`{TerminalDurable, Projected, OutboxEnqueued}`. A sibling that is still streaming has no terminal
outcome and matches none of those phases, so it is not a candidate. Concurrent writes are serialised
by the Journey's journal lock, which it takes. Answered from the code's own logic, and pinned by a
test rather than left as reasoning.

### Planned work

**`pi_process_registry.rs`**

| Change | Why |
| --- | --- |
| `RegistryAuthority` gains `fn thread_id(&self) -> &str` | `RunAuthority` already carries `thread_id`, so the production impl is one line (`main.rs:338`) |
| `WorkspaceKey` (private) and `fn workspace_key(authority: &A) -> String` | the map key; separator chosen outside the identifier alphabet, matching CR138's `\|` |
| `entries: HashMap<String, …>` keyed by workspace | the point of the slice |
| `reserve`: duplicate check per workspace; new per-Journey live count against a share of three | `DuplicateWorkspace`, `JourneyShareExceeded` |
| `matching_entry`/`matching_entry_mut`/`terminalize`/`release_lease`: resolve by `(journey_id, run_id)` over `values()`, preserving `Missing` vs `Stale` | Finding 1 |
| `retire_finalizing_journey` → `retire_finalizing_workspace` | per workspace, Finding 4 |
| `inspect()` sort → `(journey_id, thread_id)` | sibling order must be stable, Finding 3 |
| `running_child_handles()` sort → `(journey_id, thread_id)` | same reason; shutdown must drain deterministically |
| `ReserveError` gains `DuplicateWorkspace` and `JourneyShareExceeded`; `CapacityReached` stays global | Item 3 |
| `PER_JOURNEY_PI_WORKSPACE_SHARE: usize = 3` with its rationale in a comment | not configurable, per Boundaries |

**`main.rs`**

- `:338` — `thread_id()` in the `RegistryAuthority` impl.
- `:3913` and `:4219` — map both new errors. `DuplicateWorkspace` → *"This conversation already has
  an active or finalizing Pi invocation."*; `JourneyShareExceeded` → *"This Journey is already running
  as much work as it can at once."* `DuplicateJourney` is **removed**, not retained as dead:
  at workspace grain nothing can produce it, and a reason no code path can reach is debt.
- `:5584` — the steering `find` gains `run_id`, Finding 2.
- `:4118`–`:4123` and `:4186`–`:4191` — unchanged by design, with a guard naming the coarseness.

**Renderer: zero diff.** `NATIVE_ADMISSION_GRAIN` stays `"journey"` in this CR. CR138 built the
renderer to carry two workspaces, and it already does; flipping the grain so it *admits* a sibling is
CR140's first act, together with the surface that explains the refusals. This keeps CR139 reviewable
as one language's change, and keeps the flip a one-line decision a test names.

**Tests** — `pi_process_registry.rs`, all new, none deleted:

1. Durability characterisation first, against unchanged code: two authorities in one Journey with
   distinct `thread_id`s, journaled, settled and compacted interleaved, both records intact with
   correct revisions. Item 1, and it must pass **before and after** the key change with identical
   verdicts.
2. Two workspaces in one Journey reserve, attach, cancel, terminalize and release independently,
   and a targeted cancel leaves the sibling's bytes and handle untouched.
3. The same workspace twice → `DuplicateWorkspace`; a fourth live workspace in one Journey →
   `JourneyShareExceeded`; four live entries across Journeys → `CapacityReached`, unchanged.
4. A finalizing sibling does not count toward the share (Finding 5) and does not consume capacity.
5. A new turn in the same workspace retires that workspace's finalizing lease and leaves a
   finalizing sibling alone (Finding 4, CR116's semantics re-aimed).
6. `released_targets` measurement: churn three workspaces in one Journey and assert a late
   `release_lease` still answers `AlreadyReleased` — the bound is widened only if this fails.
7. `inspect()` emits both siblings in stable `(journey_id, thread_id)` order and parses as `known`
   under CR138's validator — pinned by a golden inspection fixture emitted by the Rust side and read
   by the renderer suite, so two independently written rule sets are pinned together.
8. Steering reaches the second workspace's own child (Finding 2).
9. A guard asserting the compaction exclusion scans by `journey_id`, with the coarseness named in the
   test's own description so narrowing it later is a visible decision. Item 5.
10. `materialize_completed_journal_delivery_debt` leaves a live sibling's record untouched. Item 6.

**Excluded**, and why: no narrowing of the turn/compaction exclusion to the thread; no change to
`JourneyProvisioningState`, including the catalog-load read claim noticed in CR136's Finding 5; no
transcript authority change; the share is not configurable; no renderer change.

### Validation

`cargo test` grows from 269 by the new cases with no existing case re-aimed except CR116's
retirement test, which is re-aimed and not deleted. The renderer suite must stay at **251 files /
1,900 tests with an unchanged verdict**, which is the check that CR139 really is native-only;
`git diff --stat -- src/` must be empty apart from the golden inspection fixture.

**A field verification is owed here, and it is provocable** — unlike CR138. Once the grain is flipped
in CR140 the Navigator can start a turn in a Journey workspace while a conversation in that Journey
runs. In CR139 alone the renderer still refuses the sibling, so the native change is **not** field-
observable, and the honest sequence is: close CR139 on tests, and collect the field evidence named in
this CR's Acceptance as part of CR140. Said up front rather than discovered at closure.

## Acceptance

- Two workspaces in one Journey reserve, run and retire independently; the same workspace twice returns `DuplicateWorkspace`; a fourth live entry in one Journey returns `JourneyShareExceeded`; global capacity is unchanged.
- A title suggestion counts toward the Journey's share of three and never toward a refusal of its own parent workspace's turn.
- Compaction is refused while any workspace in the Journey runs, and a turn is refused while the Journey compacts, with a guard naming that as deliberate.
- The durability characterisation from item 1 passes before and after the key change with identical verdicts.
- `cargo test` and the renderer suite are green together; the inspection emitted by the new registry parses as `known` under CR138's validator.
- Field: on Dev, a turn started in the Journey workspace while a conversation in that Journey runs is admitted; the Dev turn journal shows two records with distinct `threadId`s and overlapping `createdAt`/`updatedAt` windows.

## Boundaries

No narrowing of the turn/compaction exclusion to the thread. No change to `JourneyProvisioningState`. No change to transcript authority. The share is three and is not configurable.
