[< RS023](index.md)

# CR134: Name the Owner of Running Work Without Hiding That It Runs

**Status:** planned
**Driver:** —
**Delivery:** —

## Friction

`Working`, `Ready` and related signals are attached to the Journey even when the work is happening in one conversation below it. `JourneyRuntimeState.entries` is `Record<journeyId, Entry>` (`journeyRuntimeState.ts:50`), so a Journey workspace and every conversation inside it share one runtime entry and cannot be told apart by key. The sidebar, the Journey header and the area above the Composer therefore all report a Journey as working when the work belongs to one conversation within it — a parent impersonating its child. The Navigator cannot tell, from any surface, which workspace is actually busy.

**And the Journey signal is the only one that is always there.** That is the harder half of this CR, and it constrains the fix more than the attribution does.

- In `sidebar-compact`, the CSS hides `.focused-conversation-sidebar` and `.journey-conversation-toggle` outright, while `.journey-agent-status.placement-sidebar` keeps dedicated compact rules (`app.css:5196`–`:5208`, `:5303`–`:5329`). When the sidebar collapses, conversations disappear and the Journey status survives — CR082 chose that deliberately.
- A Journey's conversation list is only shown while that Journey is expanded, so an unexpanded Journey has no conversation row to carry anything.
- CR135 will add a third way for a conversation to be invisible: the Navigator hiding it.

So a conversation row is a surface the Navigator can remove in three independent ways, and a Journey row is not. Any design that moves the running-work signal down to the conversation hands the Navigator a way to run a process with no indication anywhere that it is running.

## Outcome

Every status surface says whose work it is, and no surface can be configured into silence about work that is running. The Journey row remains the guaranteed carrier: it always shows that work exists inside it, and it distinguishes work the Journey's own workspace owns from work a conversation below owns.

## Precedent

This tension has been resolved once already, in this function, for a different cause. `deriveJourneyAgentStatus` carries CR080's note: *a compaction is the agent working, but it owns no run and writes no journal, so runtime ownership cannot speak for it. The Journey is occupied for minutes either way, and a status that stayed idle would hide that work from the reader.* CR080 decided that an occupied Journey must say so even when runtime ownership cannot explain why. CR134 is the same rule applied to a different gap: the owner is known but is not this workspace.

CR102 supplies the vocabulary. It established that every state owns a shape, so the glyph alone identifies it, after measuring that colour and motion carried almost nothing — Working and Finishing sat 1.15 apart on the default theme and were identical on the light families under reduced motion. A new distinction must therefore be topological, not a colour or an animation.

## First Investigation

1. Confirm that `entry.identity.authority` reliably identifies the owning workspace in every runtime phase, including `reserved`, `running`, `finalizing` and the post-terminal recovery window, and including a restored entry after reload.
2. Separate the two questions that look like one. A sidebar row for any Journey asks *does this Journey's own workspace own the run, or does a conversation inside it?* The Composer and the selected-workspace header ask *is the run mine, or someone else's?* Both derive from the same authority and they are not the same comparison; establish what each needs, and what identifies a Journey's own workspace — its root thread, its active generation, or its `journey_workspace` selection.
3. Decide whether locus is a dimension or a state. Six statuses multiplied by two loci would be twelve glyphs; a `{status, locus}` pair keeps `deriveJourneyAgentStatus` orthogonal and needs one new topology rather than six. Establish which the surfaces can actually consume.
4. Design the `inside` topology against CR102's constraints: it must survive a shared colour register, stripped animation and greyscale, and it must remain legible at the compact sidebar's size.
5. Establish the route from the signal to the work. If the Journey row is the only visible carrier, it must lead to the owning conversation — including when that conversation is hidden, unexpanded, or the sidebar is compact.
6. Determine what a workspace with no live entry should read when its Journey has one, and confirm it is not a false `Ready` that invites a send the Journey will refuse.

## Investigation Findings (2026-10-09)

All six items answered against source at `main` `75828a5`.

### 1. The runtime entry is not a sufficient source, and the Story's recorded shortcut is wrong

RS023's Framing recorded a shortcut: *the runtime entry carries `identity.authority`, so the owner of the single active run is already identifiable without re-keying.* That is true and **insufficient**, in four ways, each of which lands exactly on a case this CR's visibility invariant requires.

- `JourneyRunIdentity` is a union (`journeyRuntimeState.ts:20`–`:22`). Only the `live` variant carries `authority`; the `mock` variant carries `journeyId` and `runId` **and no workspace coordinate at all**. It is production code, not test-only — `App.tsx:2946` builds it whenever `runAuthority` is absent.
- `identity` is **optional** on the entry (`:26`), and `createEmptyJourneyRuntime` leaves it undefined (`:86`–`:97`). `patch` and `append_warning` accept a bare `journeyId`, so an entry can exist with no identity.
- Runtime state is **in-memory only**. `createInitialJourneyRuntimeState()` returns `{ entries: {}, quarantine: [] }` (`:82`–`:84`) and the **only** `register` dispatch is in the send path (`App.tsx:2974`). So the runtime entry describes runs *this window started*, nothing else.
- Post-reload rehydration exists but is scoped to the **selected** Journey's lease (`App.tsx:1389`), and it rehydrates the event dispatcher without registering a runtime entry.

When `live` and present, `RunAuthority` does carry the full workspace coordinate — `threadId`, `generation`, `piSessionId`, `mirrorConversationId` (`runAuthority.ts:5`–`:21`). The shortcut is real; it just cannot be the only source.

### 2. The right source is the occupancy inspection, which already carries the workspace

`piInvocationOccupancy` is the native registry's own inspection, reconciled through `inspectPiInvocations()` (`App.tsx:1331`–`:1349`). It covers **every** Journey, it **survives a reload** because it is read from the registry rather than from renderer state, and every entry carries `PiInvocationAuthorityInspection` with `journeyId, runId, turnId, threadId, generation, piSessionId, mirrorConversationId` and both harness message ids (`piInvocationOccupancy.ts:3`–`:13`). `leasePhase` is `"reserved" | "running" | "finalizing"` (`:17`), which maps onto `JourneyRuntimeOwnerPhase` without loss.

RS023's Framing warns that the inspection carrying `threadId` invites the false conclusion that native authority is already per-workspace. That trap is about **CR136**, which wants to admit two runs. CR134 only wants to *name* the owner of the one run there is, and for that the inspection is exactly the right instrument.

### 3. A visibility hole already exists, and no invisibility route is needed to reach it

The sidebar row derives its status from four inputs and **none of them is occupancy** (`App.tsx:5235`–`:5240`): `runtimePhase` from `selectJourneyRuntimeOwnerPhase`, `finishedAttention`, `compacting`, `turnOutcome`. `selectJourneyRuntimeOwnerPhase` reads only `state.entries[journeyId]` (`journeyRuntimeState.ts:218`–`:226`), and after a reload that map is empty.

**Therefore: after a relaunch, a Journey with a live native Pi run reads `Idle` in the sidebar.** `deriveJourneyAgentStatus({})` returning `"idle"` is pinned by an existing test (`journeyAgentStatus.test.ts:15`), so this is the designed behaviour of a function that is simply not being told.

The disagreement between surfaces is sharper than the hole itself. `runtimeBusy` includes `hasBlockingPiInvocationOccupancy` (`App.tsx:1048`–`:1050`), which is **global** — true if *any* lease anywhere is active (`piInvocationOccupancy.ts:299`–`:301`). So after a reload with a run live in Journey A while the Navigator is in Journey B:

| surface | says | true? |
|---|---|---|
| A's sidebar row | Idle | no — A owns a live run |
| B's Composer | busy | yes, but it cannot say which Journey |
| admission for B | `same_journey_occupied` / `global_capacity_reached` | correct, and never surfaced as a name |

**The only surface that knows cannot say which Journey; the only surface that names a Journey does not know.** The refusal is correct and the surface is silent — the same shape as the debt CR132 recorded. This is reachable with no compact sidebar, no collapsed disclosure and no hidden conversation: a relaunch is enough.

This raises the CR's standing rather than widening it: sourcing status from occupancy is what the locus distinction needs **anyway**, and it closes this hole as a consequence rather than as an extra.

### 4. The two comparisons, and what identifies a Journey's own workspace

They are genuinely different and the code already proves it.

- A sidebar row asks *does this Journey's own workspace own the run, or a conversation inside it?* — a comparison between the run's `threadId` and the Journey's **root thread id**.
- The Composer asks *is the run mine?* — `deriveComposerTurnStatus` already takes `runBelongsToSelectedJourney` (`composerTurnStatus.ts`), a boolean at **Journey** grain. For a conversation to answer honestly it needs the same comparison at thread grain.

The Journey's own workspace is its **root thread**, and the app already guarantees root and child threads are distinct: `parseConversationCatalog` seeds `seenThreads` with `authority.rootThreadId` and rejects any child entry that reuses it. So comparing `authority.threadId` against the root thread id is a sound test, not a heuristic.

Cost: `rootThreadId` is only known once that Journey's catalog has loaded, which CR133 made per-Journey and lazy. But **locus only matters where there is work, and `PRODUCTION_PI_PROCESS_LIMIT` is 4**, so at most four Journeys can need a root-thread lookup at any moment. A lazy, cached, read-only resolution bounded by the occupied set is cheap and sufficient.

### 5. Locus is a dimension, and it costs one topological operation

`deriveJourneyAgentStatus` returns a single string consumed by three places. Six statuses times two loci would be twelve glyphs. `JourneyAgentStatusIndicator`'s vocabulary (`:31`–`:80`) is: ring for idle, dot for working, annulus for finishing, and a filled `r=9` disc carrying a knocked-out mark for the three terminal states — quiet states small and centred, terminal ones filling the badge.

`inside` can therefore be **one operation applied to the existing glyph**: draw the status mark at reduced radius and enclose it in a thin containing contour, so the mark reads as nested. Topological, no colour, no motion, survives greyscale, and legible at compact size because it adds a contour rather than detail.

### 6. A non-owner workspace currently reads busy without a reason

`derivePiInvocationAdmission` already distinguishes `same_journey_occupied` from `global_capacity_reached` (`piInvocationOccupancy.ts:281`–`:296`), so the data to say *occupied elsewhere* rather than *free* exists and is simply not named on the surface. Nothing needs to be computed for acceptance item 6; something needs to be said.

## Plan

### Scope

**D1 — `src/app/journeyWorkLocus.ts` (new).** One pure function:

```ts
deriveJourneyWorkLocus({ occupancy, runtimeEntry, journeyId, journeyRootThreadId })
  -> { phase?: "running" | "finalizing";
       locus: "here" | "inside" | "unknown";
       owner?: { threadId: string; generation: number; mirrorConversationId: string } }
```

It unions the two sources — the runtime entry for runs this window started, the occupancy inspection for everything else — and resolves locus by comparing the owning `threadId` against `journeyRootThreadId`. `unknown` is returned when the root thread id is not yet resolved, and **`unknown` must never read as `here`**: an unresolved locus says *work is running inside this Journey* without claiming where.

**D2 — bounded root-thread resolution.** `journeyRootThreadIds: Record<journeyId, string>`, filled from `conversationCatalogs[journeyId].rootThreadId` when CR133 already loaded it, and otherwise by a lazy `loadNautilusJourneyThread` **only for Journeys that appear in occupancy**. Bounded by the registry limit of 4. Read-only; it must not provision, matching CR133's established read-only disclosure path.

**D3 — tell the status function what it does not know.** `deriveJourneyAgentStatus` is **not modified**; its eight existing tests are the guarantee that nothing else moved. The two call sites (`App.tsx:1029`, `:5235`) pass `runtimePhase: selectJourneyRuntimeOwnerPhase(...) ?? locus.phase`. CR080's compaction precedence, `finishedAttention` and `turnOutcome` ordering are untouched.

**D4 — `JourneyAgentStatusIndicator` gains an optional `locus` prop.** One new topology (the nesting contour), applied over the existing glyph for `working` and `finishing` only. `aria-label` gains the owner: *"<Journey> agent is working in a conversation"* for `inside`, unchanged for `here`. Absent `locus` renders exactly as today, so every other call site is unaffected.

**D5 — the route from the signal to the work.** The sidebar indicator becomes a control when `locus === "inside"`. Activating it reuses CR133's one-act semantics: `selectJourney(ownerJourneyId)` plus a conversation selection. Because CR133 separated selection from expansion, **reaching the owning conversation does not require its list to be visible**, which is what makes this work under a compact sidebar, an unexpanded Journey and a CR135-hidden conversation alike. Resolving `threadId` to a Desktop `conversationId` needs that Journey's catalog, so activation loads it lazily through the existing read-only path and then selects the matching entry; if the owner is the root thread, it selects the Journey workspace instead.

**D6 — say *occupied elsewhere*, not *busy*.** The Composer's existing `same_journey_occupied` reason gains the owner's name, so a non-owner workspace distinguishes free from occupied-elsewhere instead of reading as a bare disabled state.

### Files

- `src/app/journeyWorkLocus.ts` — D1 (new).
- `src/app/App.tsx` — D2, D3, D5, D6 wiring; the two `deriveJourneyAgentStatus` call sites and the sidebar row block.
- `src/app/JourneyAgentStatusIndicator.tsx` — D4.
- `src/styles/app.css` — the nesting contour, including its compact-sidebar size.
- Tests below. **No Rust**: `src-tauri/` must show a zero diff and `cargo test` must be unchanged.

### Guards

New, all at guard level over a pure function: work here; work inside; nothing working; locus `unknown` never reading as `here`; a `mock` identity with no workspace coordinate; an entry with no `identity`; **occupancy-only** (empty runtime state, i.e. the post-reload case) resolving to working rather than idle; and each of the three invisibility routes — compact sidebar, unexpanded Journey, CR135-hidden conversation — still showing that work runs inside.

Component: the `inside` glyph differs from `here` with colour and animation stripped, and at compact size. Source: the indicator renders unchanged when `locus` is absent; D2 never calls a provisioning command.

Re-aimed: `journeyAgentStatus.test.ts` is expected to pass **unmodified**; if it needs editing, D3 has overreached and that is the signal to stop. `collapsedSidebarPolish.test.ts:58` pins the call-site shape and will need its new input admitted deliberately.

### Validation

1. `tsc` and `npm test` green; `cargo test` unchanged; zero `src-tauri/` diff.
2. Dev build, then: start a turn, quit mid-run, relaunch — **the Journey must not read Idle while its process lives.** This is the field proof of finding 3 and it is provocable on demand, unlike CR132's.
3. Dev: run a turn inside a conversation, collapse the sidebar, confirm the Journey row still shows work running inside; activate the indicator and land on the owning conversation.
4. `npm run roadmap:check` READY.

### Exclusions

- No change to runtime keying, admission, occupancy derivation or capacity. Reading occupancy is not changing it, and nothing here makes anything concurrent — CR136 remains gated.
- No locus on the three terminal statuses. `interrupted`, `failed` and `finished` describe what already happened; attributing them to a workspace is a separate question and is not folded in.
- No rehydration of `journeyRuntimeState` from occupancy. D3 tells the status function what it does not know; it does not fabricate a runtime entry, because a fabricated entry would carry a false `agentRun` and a false identity.
- No change to `hasBlockingPiInvocationOccupancy` being global. That it disables the Composer app-wide is a real finding, recorded here, and it is a separate decision from naming the owner.
- No change to transcript authority or Mirror provenance.

### Risks

- D3 changes what a sidebar row says in a situation that previously said nothing. The post-reload case is the point of the change, but it also means a Journey can now read `working` with **no conversation snapshot and no transcript to show** — D5's route must therefore tolerate an owner it can name but not yet open.
- D5 makes a `role="status"` element interactive. It sits inside a row whose click selects, so it needs the same `stopPropagation` treatment CR133 had to give the disclosure, including the Enter and Space path that CR133 found broken.

### Decisions for the Navigator before `in_progress`

1. Driver and Delivery. Proposed: `@alissonvale`, `refinement/rs023-cr134-name-the-owner-of-running-work`.
2. **Does D3 belong to this CR?** Sourcing status from occupancy closes the post-reload `Idle` hole, which is beyond this CR's literal text but is the same invariant and the same data. My recommendation is yes, because the alternative is to build the locus derivation on a source that is empty after every relaunch. If you prefer, D3 becomes its own CR and CR134 ships locus only — honest, but it leaves the larger hole open and the locus signal unavailable precisely when it matters most.
3. **Should the indicator become interactive** (D5), or should reachability be delivered through an existing control instead? Making a status element a button changes the sidebar row's interaction model.

## Acceptance

- The sidebar, the selected-workspace header and the Composer say whose work is running: the Journey's own workspace, or a conversation inside it.
- ~~A parent Journey does not read `Working` merely because a child conversation is working.~~ **Superseded 2026-10-08 — see Correction.** A Journey whose conversation is working always indicates that work is running inside it; what it must not do is present that work as its own workspace's.
- Running work is never representable only on a surface that can be hidden, collapsed or left unexpanded. With the sidebar compact, the conversation list hidden, the Journey unexpanded, and the owning conversation hidden by CR135, the Journey row still shows that work is running inside it.
- The `inside` distinction is topological and survives a shared colour register, stripped animation and a greyscale display, at compact sidebar size.
- From the Journey's indicator the Navigator can reach the owning conversation, including when it is hidden, unexpanded or the sidebar is compact.
- A workspace that is not the owner does not read `Ready` in a way that implies a send would be admitted while the Journey is occupied; the surface distinguishes *free* from *occupied elsewhere*.
- Status derivation is a pure function of the asking surface and the durable runtime entry, covered by guard-level tests for: work here, work inside, nothing working, and each of the three invisibility routes.

## Correction (2026-10-08)

The Navigator rejected this CR's original framing before any work began, and the objection stands: *Journeys are always visible in the sidebar, so the working icon is easy to see. At the conversation level it is different — the conversation may be hidden or the sidebar may be collapsed. That would mean I could have a process running without visibility over it.*

The original acceptance criterion — that a parent Journey must not read `Working` merely because a child is working — treated the Journey signal as a falsehood to remove. It is instead the only carrier that survives every way a conversation can become invisible, and removing it would have produced exactly the blind spot the Navigator named. The criterion is struck through above rather than deleted, because it was this CR's premise and the correction is the useful part of the record.

What changed: the CR now carries a visibility invariant alongside the attribution one, the Journey indicator is extended rather than demoted, and reachability from the signal to the owning conversation became an acceptance criterion rather than an afterthought. The scope grew, and the growth is real work, not restatement.

## Boundaries

No change to how runtime is keyed, no change to admission or occupancy, and no new concurrency — this CR makes ownership legible, not parallel. No change to transcript authority. It must not present an occupied Journey as available, and it must not reduce the visibility of running work on any surface, in any sidebar or visibility configuration.
