[< RS024](index.md)

# CR140: Name the Constraint That Refuses Concurrent Work

**Status:** planned
**Driver:** —
**Delivery:** —

**Gate: not started before CR139 is merged.** The reasons this CR surfaces do not exist until the registry returns them.

## Friction

Today a refusal to start work reads as one of two strings, *"This Journey already has an active or finalizing Pi invocation"* or *"The global Pi process capacity is occupied"*, and the renderer's own pre-check collapses to `same_journey_occupied`, `global_capacity_reached` or `inspection_unknown`. After CR139 the native side can refuse for four distinct reasons — the same workspace is busy, the Journey's share of three is spent, global capacity is spent, or a compaction is in flight — and the surface has no place to say which.

CR132 left a named gap: a refusal the surface does not explain. RS023's Authority Contract forbids widening it, and the Navigator's stated outcome for CR136 was that where concurrency is refused, *the refusal must name its real constraint rather than a generic global busy state*.

~~Also in view, and recorded as debt since CR134: `hasBlockingPiInvocationOccupancy` is global, so any blocking state disables the Composer app-wide rather than for the workspace that is actually refused.~~ **Corrected 2026-10-10 (Finding 3):** `hasBlockingPiInvocationOccupancy` does not gate Send; it is one of two global sources of `runtimeBusy`, which gates Journey administration and attachments. That reach belongs to CR099.

## Outcome

Every refusal the native side can return is distinguishable on the surface, in the Composer of the workspace that was refused, and no refusal degrades to a generic busy state when a specific reason exists.

## First Investigation

1. Enumerate every refusal the native side can return after CR139 and every string the renderer currently shows for them; produce the mapping table before touching a surface.
2. Establish where the refusal belongs: the refused workspace's Composer footer, the Journey row, or both. RS023's visibility invariant means the Journey row remains the guaranteed carrier for *running* work; a *refusal* may be workspace-local.
3. Decide whether `hasBlockingPiInvocationOccupancy`'s global reach is narrowed here or captured separately. If narrowing, name what currently depends on it being global — CR115 and CR116's recovery paths read it.
4. Check CR134's `occupiedLocus` on `journeyStartAvailability`: with two workspaces admitted, the locus must name *which* sibling occupies, or say the share is spent.

## Investigation Findings and Plan (2026-10-10)

Planned against source with CR139 merged (`18bd069`). Every item of the First Investigation is
answered below, and three of the answers change the plan the capture implied.

### Finding 1 — the mapping table, and the refusal that is already silent today

Every refusal `start_pi_invocation` can return after CR139, and where each one lands:

| Native origin | Native sentence | Arrives in the renderer as |
|---|---|---|
| `ReserveError::DuplicateWorkspace` | *This conversation already has an active or finalizing Pi invocation.* | stream `error` → `warnings[]` of the refused workspace's entry |
| `ReserveError::JourneyShareExceeded` | *This Journey is already running as much work as it can at once.* | same |
| `ReserveError::CapacityReached` | *The global Pi process capacity is occupied.* | same |
| compaction in flight (`main.rs:4193`) | *Pi invocation admission failed: A compaction is in flight for this Journey; send after it completes.* | same |
| `admit_turn` journal full (CR139) | *Pi invocation admission failed: turn_journal_full* | same |
| delivery reconciliation failure | *Pi invocation admission failed: …* | same |
| `RegistryUnavailable` / `Worker` | *Could not reserve the Pi process registry.* / *Could not start the local Pi worker.* | same |

The route is `piProcessStream.ts:662`: the rejected invoke becomes `Could not invoke local Pi: <sentence>`
followed by `done`, and `journeyRuntimeState.ts:412` appends it to the entry keyed by the refused
workspace. **So no native refusal is silent, and every one is already workspace-local** — CR138's
re-keying did that. The native sentences are verbatim and specific. This half of the CR's Outcome
holds without a change, and will be pinned rather than built.

What the Navigator actually sees is **not** the native sentence, because the renderer refuses
first. `derivePiInvocationAdmission` runs before Send is enabled, and its reason feeds two surfaces:

- the **not-started** surface, through `journeyStartAvailability`, which has a sentence for every
  reason including CR134's locus wording;
- the **started** Composer, where `selectedInvocationAdmissionBlocked` disables Send and only two
  reasons have a notice — `inspection_unknown` (*Checking native operation occupancy*) and
  `global_capacity_reached` (*Global Pi capacity occupied*), at `App.tsx:6016`–`:6027`.

**`same_journey_occupied` has no notice on the started Composer.** A Navigator sitting in a
Journey's own workspace while a conversation inside it runs sees Send disabled and nothing that
says why. `conversationAvailability.condition` is produced and never rendered: no file outside the
domain module and its tests mentions `journey_lease_occupied`. This is the silent refusal CR132
left named, it exists **today**, before any grain flips, and it is exactly this CR's subject. The
first delivery test characterises it against unchanged code.

### Finding 2 — the pre-check cannot know the share, so the inspection must say it

At the workspace grain `derivePiInvocationAdmission` has two refusals, *same workspace* and
*global capacity*. A Journey whose share of three is spent while global capacity is not would pass
the pre-check, be sent, and be refused on the raw route with the native sentence — correct, but it
turns the one new reason this Story introduced into the only one the Navigator meets **after**
pressing Send rather than before.

The renderer cannot compute the share: `PiInvocationRegistryInspection` carries `schemaVersion`,
`limit`, `processCapacityInUse` and `entries`, and nothing about the per-Journey share. Two routes:

- hardcode `3` in TypeScript — two sources of truth for one number, drifting silently;
- **the inspection emits `journeyWorkspaceShare`** — one more field in `inspect()`, the validator's
  exact-key list grows by one, and CR139's golden fixture pins both sides.

The second. It is a small native change in a CR the Story did not declare renderer-only, and it is
the same discipline as `limit`, which the renderer already reads from the inspection rather than
assuming. **Admission itself does not change**; the inspection reports one more thing the
registry already knows.

### Finding 3 — `runtimeBusy` has two global sources, and it does not gate Send

The CR's Friction says `hasBlockingPiInvocationOccupancy` is global *so any blocking state
disables the Composer app-wide*. Measured against `App.tsx:1106`–`:1108`, that is imprecise twice.

First, `runtimeBusy` is the OR of **three** things: `runStartReservation`,
`navigationPresentation.runtimeBusy` — which is `hasActiveOrFinalizingJourneyRuntime(runtimeState)`,
any entry anywhere — and `hasBlockingPiInvocationOccupancy`. Narrowing the registry predicate alone
would change nothing while the runtime-state predicate still answers for the whole process.

Second, `runtimeBusy` does not gate Send. Send is gated by `selectedInvocationAdmissionBlocked`,
derived from `conversationAvailability`, which is already workspace-scoped through
`sameConversationExecutionActive` and the admission reason. What `runtimeBusy` gates is **Journey
administration and attachments**: file drop (`:2603`), conversation restart (`:3910`, `:3917`),
reload tree (`:4479`), create and edit Journey (`:4559`, `:4568`), appearance (`:4581`), and
`attachmentsBlocked`. Those are the subject of **CR099 "Allow Safe Editing During Another
Journey's Work"**, which is captured and undriven.

**Decision: not narrowed here.** Item 3 asked whether to narrow or capture separately; the answer is
that the capture already exists and this finding is appended to CR099 so it plans against two
predicates rather than one. CR140 keeps its scope to the refusal surface. The Friction paragraph is
corrected at its source, dated, with the superseded sentence struck through.

### Finding 4 — the locus picks the first open entry, which with siblings is a sort artifact

`deriveJourneyWorkLocus` resolves the registry's view with
`entries.find(journeyId matches && terminalState === "open")`. CR139 sorts entries by
`(journey_id, thread_id)`, so with the root workspace and a conversation both running, the
conversation's thread (`desktop-thread-…`) sorts before the root's (`nautilus-thread-…`) and the
locus says `inside` **while the Journey's own workspace is also working**. Not wrong today, because
two cannot be live; wrong the moment the grain flips, and the Journey row is RS023's guaranteed
carrier.

CR138 left a provisional rule at `App.tsx:1070`: *the selected workspace's own run wins when live,
otherwise the aggregate's choice stands*. The aggregate's choice is the `find`, which is order.
**Decision: confirm the first half, replace the second with a rule.** When the Journey's root
thread holds a live lease the locus is `here`, whatever else runs; otherwise `inside`. No new locus
value, no change to the indicator's glyph, and `JourneyWorkOwner` keeps naming one owner — the
root's when it runs, else the first sibling. RS024's Boundaries say CR134's derivation changes only
by re-keying; RS024's Work Shape says this CR confirms or overrules CR138's locus rule. The Work
Shape is the more specific instruction and this is the overrule it anticipated, named here so it
is a decision rather than a drift.

### Finding 5 — the grain flip, and what becomes unreachable

`NATIVE_ADMISSION_GRAIN` is pinned to `"journey"` by four guards: `runtimeWorkspaceKeying.test.ts:42`–`:44`
(value and declaration text), `workspaceGrainedOccupancy.test.ts:98` and the *keeps today's Journey
reason for its own workspace* case at `:111`, and `piInvocationInspectionConformance.test.ts:89`.
All four are re-aimed, none deleted.

Once the grain is `"workspace"`, the `"journey"` branch of `derivePiInvocationAdmission` and the
reason `same_journey_occupied` can be produced by no code path. By CR139's own rule — *a refusal
reason no code path can reach is debt, not safety* — the grain parameter and the dead reason are
**removed**, not left as a switch nobody will flip back. `journeyStartAvailability`'s
`same_journey_occupied` case carried CR134's locus sentence; that case is re-aimed to the new
`journey_share_exceeded` reason, where the locus question becomes *which workspaces hold the share*.
CR134's D6 sentence was already recorded as unreachable in the field by construction; its guard is
re-aimed to the sentence that replaces it, and the retirement is recorded in CR134, dated.

### Finding 6 — `selectJourneyRuntime`'s Journey fallback

With one live entry it returns that entry for any workspace in the Journey; with two it declines.
The fallback exists for a workspace whose exact key misses — and the only candidate is a selected
workspace with `threadId: null` (`App.tsx:1055`, `selectedThreadId ?? null`) while the entry was
written under the real thread. Whether that happens is a measurement, not a reading: delivery runs
a throwaway characterisation of every `dispatchJourneyRuntime` site that could carry a null thread.
If none can, the fallback is removed and the exact lookup stands; if one can, the fallback stays
with that site named in a comment and a test. Either way the two-live case is pinned: the selected
surface of a workspace with no run of its own is **empty**, never a sibling's stream.

### Finding 7 — the background title suggestion is not silent either

`suggest_desktop_conversation_title` holds the only direct `.reserve()` and now consumes one unit
of the Journey's share. Its refusal reaches `setMirrorRenameError` (`App.tsx:4385`) and is shown in
the rename dialog verbatim. Pinned, not changed.

### Planned work

**Renderer, `piInvocationOccupancy.ts`** — `INSPECTION_KEYS` gains `journeyWorkspaceShare`, validated
as a safe integer in `1..=limit`; `derivePiInvocationAdmission(state, workspace)` loses its `grain`
parameter and refuses in this order: `inspection_unknown` → `same_workspace_occupied` →
`journey_share_exceeded` (live entries in the Journey `>= journeyWorkspaceShare`) →
`global_capacity_reached`. Share before capacity, for the same reason CR139 checks it first
natively. `same_journey_occupied` removed from the union. New `liveWorkspacesInJourney(state,
journeyId)` returning the occupying authorities in inspection order, for the sentence to name them.

**Renderer, `journeyWorkspaceKey.ts`** — `NATIVE_ADMISSION_GRAIN` removed; the module's comment
records that CR138 pinned it and CR140 retired it.

**Renderer, new `src/app/admissionRefusal.ts`** — one pure function,
`describeAdmissionRefusal(reason, { occupants, rootThreadId, catalog })`, returning
`{ title, sentence, waiting }` for every reason in the union, with a `switch` the compiler checks
for totality. Occupants are named through CR133's catalog: a root thread is *the Journey's own
workspace*, a conversation is its title, an unknown thread is its id. Used by both
`journeyStartAvailability` and the started Composer, so the two surfaces cannot disagree. Sentences:

| Reason | Sentence |
|---|---|
| `inspection_unknown` | *Checking native operation occupancy before starting.* (unchanged, waiting) |
| `same_workspace_occupied` | *This conversation already has native work in progress.* (unchanged, waiting) |
| `journey_share_exceeded` | *This Journey is already running as much work as it can at once — <occupants>. Send becomes available when one of them finishes.* (waiting) |
| `global_capacity_reached` | *All native Pi slots are in use. Starting becomes available once one is free.* (unchanged, waiting) |

**Renderer, `App.tsx`** — the started Composer gains one notice, rendered for every refusing reason
except `inspection_unknown`, which keeps its own; the `global_capacity_reached` block at `:6022`
is replaced by it rather than duplicated. `journeyStartAvailability` reads its sentences from the
same function. `deriveJourneyWorkLocus` gains the root-first rule of Finding 4. The provisional
comment at `:1070` is rewritten as the confirmed rule.

**Native, `pi_process_registry.rs`** — `PiInvocationRegistryInspection` gains
`journey_workspace_share: usize`, emitted from `PER_JOURNEY_PI_WORKSPACE_SHARE`. `main.rs` maps
`turn_journal_full` to a sentence at the admission site: *This Journey's turn journal is full; it
compacts when a running turn finishes.* No other native change.

**Records** — CR140's Friction corrected (Finding 3); CR099 gains the two-predicate finding; CR134
records the D6 retirement; CR138's delivery record gains a one-line resolution of its provisional
locus rule.

### Tests

New, none deleted:

1. **Characterisation first, against unchanged code**: the started Composer with
   `same_journey_occupied` renders no refusal sentence. Expected to pass before and fail after —
   the inverse of the usual shape, because it pins the defect so the fix is visibly a fix.
2. `admissionRefusal.test.ts` — every reason yields a sentence; a type-level exhaustiveness check
   so a new reason cannot compile without one; occupants named by title, root as the Journey's own
   workspace, unknown thread by id.
3. `piInvocationOccupancy` / `workspaceGrainedOccupancy` — share refusal before capacity; a
   finalizing sibling does not count; `journeyWorkspaceShare` validation bounds; guards re-aimed
   to the workspace grain.
4. `piInvocationInspectionConformance.test.ts` — the regenerated golden fixture validates with the
   new field; the share test from CR139 flips from *refuses a sibling* to *admits a sibling*.
5. `journeyWorkLocus.test.ts` — root and conversation both live → `here`; two conversations live,
   root idle → `inside`; owner is the root's when it runs.
6. `workspaceGrainedRuntime.test.ts` — two live siblings, a third workspace selected → empty
   surface; plus the fallback decision from Finding 6.
7. `piProcessStream.test.ts` — a rejected `start_pi_invocation` carries the native sentence
   verbatim into the `error` event; no parsing, no relabelling.
8. A source guard that `App.tsx` renders no refusal sentence except through
   `describeAdmissionRefusal`, so the two surfaces cannot drift apart again.
9. Rust: `inspect()` emits the share; the golden fixture regenerated with `CR139_WRITE_FIXTURE=1`
   and committed; `turn_journal_full` maps to its sentence.

### Validation

`cargo test` from 283; renderer suite from 252 / 1,906; `tsc` exit 0; both builds; `roadmap:check`
READY. `git diff --stat -- src-tauri/` limited to the inspection field, the fixture test and the
journal-full sentence.

### Field verification — this is where RS024's evidence is collected

Owed by CR138, CR139 and this CR, and **provocable for the first time** once the grain flips. On
Dev, in one Journey with two conversations:

- D1: start a turn in conversation A, then in conversation B while A runs — **both run**; the
  Journey row says working `inside`; durable evidence is two `turn-journal/` records for the same
  `journey_id` with distinct `thread_id` and overlapping `created_at`–`updated_at` windows.
- D2: with A and B running, start a turn in the Journey's own workspace — admitted (third of
  three); the Journey row says `here`.
- D3: with three running, start a fourth conversation's turn — refused **before Send**, the
  Composer naming the share and the three occupants by title.
- D4: send again in A while A runs — refused naming *this conversation*.
- D5: let one finish — the refused workspace's Send returns without a reload.

D1's record is durable; D2–D5 are attested unless the Navigator chooses to also send in D3 to
collect the raw-route sentence, which lands in that workspace's warnings and is attested too. Said
up front: **the refusal sentences have no durable artifact**, by construction, because a refusal
writes nothing.

### Boundaries, restated against the findings

No change to native admission, the share, the registry key or the compaction exclusion. The
inspection reports one more field. `runtimeBusy` is not narrowed — CR099. No change to CR132's
abandonment affordance. No change to CR135's visibility.

## Acceptance

- Each native refusal reason maps to one surface sentence, and a guard asserts the mapping is total.
- The refused workspace's Composer says why it was refused and, where another workspace holds the slot, which one.
- `inspection_unknown` stays distinguishable from every specific refusal; it is never relabelled as busy.
- No existing refusal becomes silent or less specific.
- Field: on Dev, with two conversations running in one Journey, a third start is refused and the surface names the share; a start in one of the running conversations is refused and the surface names that workspace.

## Boundaries

No change to admission itself; this CR only surfaces what CR139 decides. No change to CR132's abandonment affordance.
