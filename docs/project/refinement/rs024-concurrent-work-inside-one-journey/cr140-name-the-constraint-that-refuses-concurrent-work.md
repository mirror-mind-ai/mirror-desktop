[< RS024](index.md)

# CR140: Name the Constraint That Refuses Concurrent Work

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs024-cr140-name-the-constraint-that-refuses-concurrent-work`

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

## Delivery Record (2026-10-10)

Delivered on `refinement/rs024-cr140-name-the-constraint-that-refuses-concurrent-work`, Driver
`@alissonvale`. RS024's third and final slice.

### The characterisation passed, which is how the defect was proved

Written first and against unchanged code, `admissionRefusalLegibility.test.ts` asserted the
opposite of what the repair should produce: that the started Composer explained exactly one of its
four possible refusals, by an allow-list of reasons rather than a search for an absence; that
`same_journey_occupied` reached a decision, disabled Send, and then said nothing; that
`conversationAvailability.condition` was computed and rendered nowhere; and that no single place
mapped a reason to a sentence. **It passed.** The same file now asks the same questions of the
repair, and the inversion is the record that the gap was real rather than argued.

The native layer was never the problem, and the plan said so after reading the route: a rejected
`start_pi_invocation` carries its sentence verbatim into the refused workspace's warnings through
`piProcessStream.ts:662` and `journeyRuntimeState.ts:412`, already workspace-local since CR138.
Pinned rather than built — a new case walks all five native refusal sentences, including CR139's
journal-full one, through the raw route and asserts each arrives unparsed and unrelabelled.

### Shipped shape

**New `src/app/admissionRefusal.ts`** — `describeAdmissionRefusal(reason, context)` returning
`{ title, sentence, waiting }`, total by `switch` so a new reason cannot compile without words.
Both surfaces read it: `journeyStartAvailability`'s private `startRefusal` is gone, and the
Composer's JSX no longer tests a reason at all. The share refusal names its occupants — the
Journey's own workspace as itself, a conversation by CR133's catalog title, an unnamed thread by
its id, which is not a nice name but is a true one.

**The inspection reports the share.** `PiInvocationRegistryInspection` gained
`journey_workspace_share`, emitted from `PER_JOURNEY_PI_WORKSPACE_SHARE`, and the renderer refuses
in the registry's own order: duplicate workspace, then the Journey's share, then global capacity.

**The grain is flipped and gone.** `NATIVE_ADMISSION_GRAIN` is removed, and with it
`same_journey_occupied` — by CR139's rule that a reason no code path can reach is debt, not safety.
The decision survives as prose at the constant's old site so the retirement is discoverable where
it was declared.

**The locus is a rule, not an order.** `deriveJourneyWorkLocus` took the first open lease; after
CR139 sorted the inspection by `(journeyId, threadId)`, *first* meant alphabetical, so a
`desktop-thread-…` conversation outranked a `nautilus-thread-…` root and the Journey row would have
said `inside` while the Journey's own workspace was working. The Journey's own workspace now wins
when it holds a lease. A test asserts both insertion orders agree, which they did not before.

### Three corrections to my own plan, found by building it

**The share must not be validated against `limit`.** The plan said `1..=limit`. That is wrong:
`reserve` compares against the constant first and capacity second, so a registry smaller than the
share is a legitimate configuration where capacity refuses. Clamping would have made the pre-check
claim a share was spent where the registry would have said capacity was. Validated on its own
terms, `1..=16`, and a test pins the small-registry case to `global_capacity_reached`.

**An `as never` cast hid a required key from the compiler.** `tsc` was clean while
`convergentTurnWorld.ts` produced an inspection without `journeyWorkspaceShare`, and only the
runtime validator caught it — as `mirror_outbox_native_lease_inspection_invalid` across seven
CR064 tests, which reads as a Mirror delivery failure rather than as a stale fixture. The validator
was right and the fixture was stale. Worth keeping on the record: **a cast that silences the
compiler moves the failure to a place where it describes the wrong thing.**

**Two of my asserts were wrong about my own writing.** Twice a script asserted that a retired
identifier was absent, and twice the new explanatory comment *mentioning* the retirement tripped
it. Nothing was damaged — the read-assert-write ordering stopped before any write — and the fix was
to assert against code with comments stripped rather than against the raw text. **A guard that
checks for a name must say whether it means the name or its use.**

### The widening, named rather than discovered

One sentence now serves both surfaces, so the not-started surface gained the clause the Composer's
capacity notice always carried — *"Native admission remains the atomic capacity authority."* A
deliberate widening: the claim is true on both, and two sentence sets for one refusal is how they
drifted apart in the first place. Recorded here rather than left to be found in a diff.

### Correction to Finding 3 (2026-10-10, after the first field attempt)

Finding 3 claimed Send was "already workspace-scoped through `conversationAvailability`". ~~That
half of the finding stands.~~ **It does not.** `conversationAvailability` is workspace-scoped in its
admission input and **global** in `recoveryInspectionActive`, which comes from `turnRecoveryBusy`
(`App.tsx:891`), a single `useState`. When it is true, Send is refused for whichever workspace is
selected, and `recovery_inspection` has no surface at all — computed and never rendered, exactly
like `journey_lease_occupied` before this CR.

Enumerating `runtimeBusy`'s two global predicates and concluding that Send was workspace-scoped was
the error; there is a third, it reaches Send, and it is silent. This changes no shipped code and is
not a defect this CR introduced, but it bounds what this CR may claim: the Acceptance criterion
that no refusal becomes silent **is met for every refusal `PiInvocationAdmission` can produce, and
is not met for `recovery_inspection`**. See
`docs/update/rs024-field-verification-baseline-2026-10-10.md`.

### The reach that was NOT narrowed, and why

Finding 3 corrected this CR's own Friction before delivery began, and delivery held to it.
`runtimeBusy` has two global sources — `hasBlockingPiInvocationOccupancy` and
`hasActiveOrFinalizingJourneyRuntime` — and it gates Journey administration, restart, file drop and
attachments, not Send. Narrowing one would have changed nothing. Untouched here; the finding is
appended to **CR099**, which owns it.

### Guards re-aimed, none deleted

Eleven suites: `runtimeWorkspaceKeying` (the grain guard now pins that the switch is gone and the
refusal order is the registry's), `workspaceGrainedOccupancy` (every Journey-grain verdict moved to
the workspace grain, plus the share, the finalizing exclusion, the reported bound and the
small-registry case), `postTerminalContinuityMatrix` (30 cases reclassified — same workspace, so
the verdict holds and the reason sharpens; one case gained the sibling that is now *admitted*, the
behaviour change the sharper reason would otherwise have hidden), `journeyStartAvailability`,
`journeyWorkVisibility` (CR134's D6 sentences retired and the property they protected re-asserted
on the replacement), `conversationAvailability`, `journeyRuntimeIntegration`, `piInvocationOccupancy`,
`settlementAbandonmentWorkspaceGrain`, `piInvocationInspectionConformance` (CR139's deliberately
open seam closed, re-aimed from *refuses a sibling* to *admits a sibling*), and the two shared
fixtures.

### Gates

`cargo test` **285 passed / 3 ignored** (from 283). Renderer **253 files / 1,928 tests** (from
252 / 1,906). `tsc --noEmit` exit 0, read directly. `npm run build` and `npm run tauri:build:dev`
clean. `roadmap:check` READY. Diff: 29 files, +593 / −193 plus two new files.

### Field verification

**Owed, and provocable for the first time** — by CR138, CR139 and this CR together. The sequence is
in the plan's Field Verification section, D1 through D5. D1 leaves a durable artifact: two
`turn-journal/` records for one `journey_id` with distinct `thread_id` and overlapping
`created_at`–`updated_at` windows. D2 through D5 are attested, and the refusal sentences have no
durable artifact by construction, because a refusal writes nothing. This CR is not closed until D1
is read from disk.

## Grain Reverted After the Field, and CR140 Closed (2026-10-10)

The grain flip was reverted. Everything else this CR delivered stands.

### What the field proved

With all three slices installed and hash-verified, a sibling send was admitted by the registry and
by this CR's pre-check, and then **threw** in `piProcessEventDispatcher.register`: *"Pi process
route already active for Journey mirror-desktop."* The dispatcher's `routes` map is keyed by
`journeyId` in seven places, decisively in `deliver`. `register` runs at `piProcessStream.ts:642`,
before `start_pi_invocation` at `:662`, so admission was never the binding constraint.

**This CR's own Acceptance criterion — "No existing refusal becomes silent or less specific" —
failed.** Before the flip the Navigator read a sentence and Send was disabled; after it, Send was
offered and they received a raw internal error about an event route. Not silent, but less legible,
and reading as a malfunction rather than a constraint. By this CR's standard that is a defect, and
it was mine: the flip moved the refusal from a layer that explains itself to a layer that throws.

### What was reverted, and what was not

Reverted: the grain. The constant is back, **renamed `PI_EVENT_TRANSPORT_GRAIN`** and documented
against the dispatcher rather than the registry, because a refusal blaming the registry would now be
false — the registry admits three. `same_journey_occupied` is reinstated, and it is reachable again,
so it is not the dead reason CR139's rule required removing.

Kept, because each stands on its own:

- `describeAdmissionRefusal` as the single source of both surfaces' words — and the restored
  Journey refusal now **names the occupant**, so it is *more* specific than the sentence it
  replaced, not merely restored;
- `journeyWorkspaceShare` reported by the inspection instead of assumed;
- the root-first locus rule;
- `turn_journal_full`'s sentence;
- the shared-sentence source guard and the totality `switch`, which **caught the revert**: removing
  the reason's sentence would not compile.

### Status

**`done` on files.** The field criterion in Acceptance cannot be collected while the transport
refuses a sibling, so by this project's rule it is named to the later slice that collects it:
**CR141**. That makes three consecutive slices closing on tests with their field evidence pooled
into CR141 — stated plainly rather than left to accumulate quietly.

Two captures came out of the same attempt: **CR141** for the per-Journey event route, and
**CR142** for a completed turn whose answer exists only in the turn journal.

### Guards re-aimed a second time, none deleted

`runtimeWorkspaceKeying` (the grain guard now pins the transport's bound and asserts the constant
names the dispatcher), `workspaceGrainedOccupancy` (every case asks the workspace question
explicitly and one new case asserts the transport grain beside it, so the distance between the two
is read together), `journeyStartAvailability`, `piInvocationInspectionConformance` (now asserts the
registry reports three available slots **while** the renderer refuses the second — the exact
distance CR141 must travel), `postTerminalContinuityMatrix`, `settlementAbandonmentWorkspaceGrain`,
`admissionRefusalLegibility`, `conversationAvailability`.

Gates: renderer **253 files / 1,931 tests**, `tsc --noEmit` exit 0, `cargo test` unchanged at 285.

## Acceptance

- Each native refusal reason maps to one surface sentence, and a guard asserts the mapping is total.
- The refused workspace's Composer says why it was refused and, where another workspace holds the slot, which one.
- `inspection_unknown` stays distinguishable from every specific refusal; it is never relabelled as busy.
- No existing refusal becomes silent or less specific.
- Field: on Dev, with two conversations running in one Journey, a third start is refused and the surface names the share; a start in one of the running conversations is refused and the surface names that workspace.

## Boundaries

No change to admission itself; this CR only surfaces what CR139 decides. No change to CR132's abandonment affordance.
