[< RS024](index.md)

# CR141: Key the Pi Event Route by Workspace

**Status:** planned
**Driver:** —
**Delivery:** —

**This is the slice RS024 was missing.** CR138, CR139 and CR140 are each delivered and each
correct, and the Story's Desired Outcome is still not achieved, because the layer that actually
refuses concurrency was never in scope.

## Friction

On 2026-10-10, with CR138, CR139 and CR140 all merged and installed on Dev, the Navigator started a
turn in one conversation and a second turn in a sibling conversation of the same Journey. Both the
native registry and the renderer's pre-check **admitted** it. The send then failed with:

> Message was not sent
> Message returned to the composer: Could not attach to the Pi process event stream: Pi process
> route already active for Journey mirror-desktop.

`piProcessEventDispatcher.ts` holds `routes` as a `Map` keyed by `authority.journeyId` — one event
route per Journey. It is keyed by Journey in seven places: `register` (`:168`, `:174`), `rehydrate`
(`:187`, `:196`), the route-handle close (`:97`, `:157`), `rememberClosedAuthority` (`:68`, which
replaces by Journey), and decisively **`deliver` (`:81`)**, where an arriving event finds its route
by `routes.get(event.authority.journeyId)`.

Re-keying `register` alone would not help: delivery would still find one route per Journey, so a
sibling's events would have nowhere to go, or worse, the wrong place.

`livePiAgentStream` calls `register` at `piProcessStream.ts:642`, **before**
`invokeCommand("start_pi_invocation")` at `:662`. So this layer refuses first, and it refuses by
throwing — after the Navigator has pressed Send.

## Why this was missed, recorded rather than smoothed over

Four First Investigations — CR136, CR138, CR139, CR140 — surveyed the **admission** path: the Rust
registry and its three consumers, the TS runtime state, the inspection validator, the turn journal,
the compaction exclusion, the journal reconciliation. None surveyed the **event transport** path.
CR136's "three registry consumers" enumerated consumers of the registry, not of the event stream.

`git log` over `src/agent/piProcessEventDispatcher.ts` shows zero commits from CR138, CR139 or
CR140. This is a pre-existing per-Journey bound, not a regression — and the investigations should
have found it, because "what else is keyed by Journey?" was exactly their question.

## Outcome

Two workspaces in one Journey each receive their own Pi process events, with no event delivered to
the wrong workspace and no route refused for a sibling that the registry admitted.

## First Investigation

1. Establish whether `PiProcessEventAuthority` carries `thread_id` on **every** event kind, not
   only the ones the journal path reads. The fix is only mechanical if the routing coordinate is
   always present; where it is absent, delivery must fail closed rather than guess a route.
2. Enumerate every per-Journey key in the dispatcher and decide each one separately. `deliver` and
   `register` must become per-workspace; `rememberClosedAuthority` replaces by Journey today, which
   at workspace grain would forget a sibling's closure — establish what that replacement was for.
3. Establish what `rehydrate`'s authority-mismatch error protects. It currently throws when a
   route exists for the Journey with a different authority; at workspace grain the comparison
   narrows, and the question is whether the old error was catching a real condition.
4. Decide where the refusal lives once the transport allows siblings. With this CR merged, the
   renderer's `PI_EVENT_TRANSPORT_GRAIN` flips to `"workspace"` and
   `same_journey_occupied` becomes unreachable again — this time for real. Removing it is the
   decision this CR inherits from CR140, and it should be taken here rather than assumed.
5. Establish whether anything else in the stream path is per-Journey. `piProcessStream.ts`, the
   App's stream consumption, and the terminal-handoff files are all candidates. **This item exists
   because the previous four investigations stopped at admission; it is the correction.**

## Investigation Findings and Plan (2026-10-10)

All five items answered against source. Item 5 found a second defect, and found why the guard that
should have caught it could not.

### Item 1 — the routing coordinate is always present

`PiProcessEventAuthority` (`main.rs:323`) declares `thread_id: String` — required, not `Option`.
Every Pi event of every kind leaves through one function, `emit()` at `main.rs:8228`, which clones
the whole authority. On the renderer side `PiProcessEventAuthority.threadId` is a required `string`
(`runAuthority.ts:28`) and `samePiProcessEventAuthority` already compares `threadId` and `runId`
(`:106`, `:104`), so the `authority_mismatch` check in `deliver` keeps its meaning at the new grain.
**The re-key is mechanical.** The one event that can lack a coordinate is one with no authority at
all, which `deliver` already quarantines as `missing_authority`; that stays.

### Item 2 — the seven sites, each decided

The route key becomes `runtimeWorkspaceKey(workspaceOfAuthority(authority))`, imported from
`../app/journeyWorkspaceKey`. That import direction already exists (`piProcessStream.ts:15` imports
from `../app/piInvocationOccupancy`), so it introduces no new layering; moving the helper to
`domain/` is **not** done here.

| Site | Today | Decision |
|---|---|---|
| `rememberClosedAuthority` `:68` | dedupes closed authorities **by Journey** | dedupe **by workspace**. This list is what stops a closed route from being resurrected by a late `rehydrate` (commit `dafd3c9`, 2026-09-01). Deduping by Journey at workspace grain would let a sibling's closure *evict this workspace's* closure, reopening exactly the resurrection that commit prevents. The global `CLOSED_ROUTE_LIMIT = 20` stays. |
| `deliver` `:81` | `routes.get(journeyId)` | by workspace key; the `unknown_route` and `authority_mismatch` rejections unchanged |
| `deliver` `:97` | delete by Journey on `done` | delete by workspace key, same identity check |
| `abortBeforeInvocation` `:157` | delete by Journey | by workspace key |
| `register` `:168`–`:169` | refuses a live route **for the Journey** | refuses a live route **for the workspace**; sentence names both coordinates: *"Pi process route already active for workspace <journey>/<thread>."* This is the fail-closed backstop behind `same_workspace_occupied`, which admission refuses first with a sentence. |
| `register` `:174` | `routes.set(journeyId)` | by workspace key |
| `rehydrate` `:187`, `:196` | get/set by Journey | by workspace key; see item 3 |

`reject()` records `{ journeyId, runId, reason }`; it gains `threadId`, and the `quarantine()` type
widens accordingly, so a quarantined event is legible at the grain it was routed at.

### Item 3 — what `rehydrate`'s mismatch protects

The error fires when a live route exists under the key with a different authority. Its only
caller is the effect at `App.tsx:1473`, which has already proved `samePiProcessEventAuthority`
against the native lease before calling. At Journey grain the error therefore catches two
things: a stale lease against a newer run **in the same workspace** (real, and still caught at
workspace grain, because the fixture-equivalent `authority("run-2")` shares the thread), and **a
live sibling** — which is not an error, and which the effect reports as
`settlement_route_rehydration_failed` on the selected workspace. After a restart with two live
leases in one Journey, that false error is what the second workspace to rehydrate would receive.
The re-key narrows the comparison to the real condition. The test at
`piProcessEventDispatcher.test.ts:153` pins the real condition and passes unchanged.

### Item 4 — where the refusal lives: a two-stage delivery

Once the transport routes by workspace, `PI_EVENT_TRANSPORT_GRAIN` reads `"workspace"` and
`same_journey_occupied` is unreachable in production. CR139's rule says an unreachable reason is
debt. CR140's experience says removing it before the field confirms is how this Story lost a
sentence. Both are honoured by ordering:

- **Stage A — re-key and flip.** The dispatcher and `App.tsx:1252` are re-keyed; the constant
  flips to `"workspace"` with its docblock rewritten; the `grain` parameter and the reason **stay**.
  Gates run; the Dev app is built, installed under the hash discipline, and the D0–D5 sequence from
  `docs/update/rs024-field-verification-baseline-2026-10-10.md` runs.
- **Stage B — remove, gated on D1's durable claim.** Only after two journal records with distinct
  `threadId` and intersecting `piExecution` windows exist: the constant, the `grain` parameter, the
  `if (grain === "journey")` branch, `same_journey_occupied` in both unions and its `case` arm in
  `describeAdmissionRefusal` are removed, and the guards are re-aimed a third time.

If the field fails at Stage A, the flip is one line to revert and nothing has been removed. That is
the affordance the constant exists to provide, used as intended this time.

The refusal order at workspace grain is `same_workspace_occupied` → `journey_share_exceeded` →
`global_capacity_reached`, each with a sentence in `admissionRefusal.ts`. **Nothing becomes
silent.** The transport throw remains as a backstop only, behind a refusal that already spoke.

### Item 5 — the rest of the stream path, surveyed this time

- **`piProcessStream.ts`**: no map keyed by anything. Its `journeyId` uses are prompt text and the
  `(journeyId, runId)` arguments of `cancel_pi_invocation` and `release_pi_invocation_lease`, which
  CR139's `resolve_key` resolves by run. Clean.
- **The Pi session file is per thread.** `pi-sessions/` in the Dev data directory holds one JSONL
  per Desktop conversation (`…_desktop-mirror-desktop-18d58ef5a20a4938.jsonl`,
  `…_18d5cf4842b669b0.jsonl`), provisioned by `recover_pending_desktop_conversation_creation`
  (`main.rs:1017`) and re-provisioned per generation (`:1210`). Two siblings do not share a Pi
  session, so concurrency cannot interleave one transcript. **This was the item's largest risk,
  and it is clear by measurement.**
- **`terminal-handoffs/`** holds `mirror-recall-<hex>.sh` launcher scripts
  (`cleanup_stale_terminal_handoffs`, `main.rs:1818`). Unrelated to Pi events.
- **One listener.** `PI_PROCESS_EVENT` is subscribed in exactly one place, the dispatcher's
  `mount()`; nothing else in `src/` listens to it.
- **Every occupancy read outside App is exact or deliberately per-Journey with its reason
  written**: `journeySettlementRecovery.ts:48` compares the full authority; `piInvocationOccupancy.ts`
  `:328` and `:425` are workspace-keyed since CR138; `:440` `hasActiveNativeExecutionInJourney` is
  per-Journey by design for CR134's status rows; `:469` `resolveExactSettlementRecovery` narrows
  through `sameRecoveryAuthority`, which compares `threadId` and `runId`.
- **`App.tsx:1252` is Journey-keyed, and it is a defect at the new grain.**

  ```ts
  const selectedNativeLease = piInvocationOccupancy.entries.find((entry) => (
    entry.authority.journeyId === selectedJourney
  ));
  ```

  With two live leases in one Journey this returns whichever sorts first — alphabetical by
  `thread_id` after CR139's sort — regardless of which workspace is selected. Its blast radius:
  `selectedActiveNativeLease` (`:1255`), `deriveBlockingTurnPresentation`'s `activeNativeRunId`
  (`:1266`), `retainedLeaseWithoutRecovery` (`:1271`), `exactNativeLeaseActive` into
  `decideConversationAvailability` (`:1376`), the rehydrate effect (`:1473`–`:1519`), two
  recovery effects' dependencies and `findBlockingTurnJournalRecord` arguments (`:1980`, `:1998`,
  `:2029`), and the restart guard (`:3952`).

  **Measured consequence, not destructive.** `findBlockingTurnJournalRecord` (`turnJournal.ts`)
  returns `undefined` unless the record's `runId` equals `activeNativeRunId`; with a sibling's
  `runId` it finds nothing. So the selected thread's own blocking record is **hidden**, its
  rehydration **never runs** (the evidence lookup at `:1478` fails on the sibling's ids and
  returns silently), and availability reports a lease active on a surface whose lease is the
  sibling's. No path acts on the sibling's run by its id. The shape is silence and wrong
  presentation — the same shape as CR142, produced deterministically by one `find`, and the
  reason a restart with two live leases would strand the second one.

- **Why CR138's guard could not see it.** `runtimeWorkspaceKeying.test.ts:103` matches
  `/\.entries\[[^\]]+\]/` — index expressions only. A predicate scan (`.entries.find(`,
  `.some(`, `.filter(`) is a different syntactic shape, and this read was already in that shape
  when CR138 declared App free of Journey-keyed entry reads. **The guard enumerated what it was
  told to enumerate.** It is widened here with a second allow-list, not replaced.

### The fix for `App.tsx:1252`

A pure `selectWorkspaceNativeLease(state, workspace)` in `piInvocationOccupancy.ts`, so it is
testable and guardable rather than inline. Rule, mirrored from `selectJourneyRuntime` by name
rather than invented: the exact workspace match when the selected thread is resolved; when
`selectedThreadId` is `null` (a Journey whose root thread is unresolved — the Dev catalog has
`rootThreadId: null` today), exactly one live entry in the Journey answers for it, and two or more
yield `undefined` rather than a guess. Each downstream consumer then asks about the workspace it
is rendering.

### Scope

- `src/agent/piProcessEventDispatcher.ts` — seven sites re-keyed per the table; `reject` and
  `quarantine()` carry `threadId`; both `register` sentences name the workspace.
- `src/app/piInvocationOccupancy.ts` — new `selectWorkspaceNativeLease`; **Stage B**: `grain`
  parameter, `"journey"` branch and `same_journey_occupied` removed.
- `src/app/App.tsx` — `:1252` replaced by the helper applied to `selectedWorkspace`; no other
  App change.
- `src/app/journeyWorkspaceKey.ts` — **Stage A**: constant flips to `"workspace"`, docblock
  rewritten to record the flip and its evidence; **Stage B**: constant removed, decision kept as
  prose.
- `src/app/admissionRefusal.ts`, `src/domain/conversationAvailability.ts` — **Stage B** only.
- `src/tests/fixtures/readyThread.ts` — optional second parameter `threadId`; when given,
  `piSessionId` and `mirrorConversationId` derive from the **thread**, as CR139 corrected the Rust
  fake. All 53 existing callers pass one argument and are unaffected.
- `src-tauri/` — **no change expected; the native diff is asserted to be zero**, as CR139 held
  the renderer at zero.

### Tests

New, in `piProcessEventDispatcher.test.ts`:
- two concurrent **workspaces in one Journey** route independently and no event crosses (the
  sibling twin of the existing two-Journey case at `:52`);
- a second `register` for the **same workspace** is refused with a sentence naming both
  coordinates, while a sibling is admitted;
- `rehydrate` of a sibling does not raise `authority mismatch`;
- closure memory is per workspace: a sibling's `done` does not forget this workspace's closure, so
  a late `rehydrate` of a closed workspace still returns a closed handle;
- quarantine entries carry `threadId`; an event with no authority is still quarantined.

**The five same-workspace cases at `:98`, `:153`, `:169`, `:188` and `:200` must pass
unchanged.** They are all same-thread through the fixture. Needing to edit any of them is the
signal that the key is wrong, and the signal to stop.

New source guards:
- on the dispatcher: comment-stripped, every `routes.get(`, `routes.set(` and `routes.delete(`
  argument is in an allow-list of workspace-key expressions, and no argument mentions `journeyId`;
- widening CR138's: a second allow-list over `.entries.(find|some|filter)(` in App source, each
  entry required to reach `threadId` or a workspace helper.

New unit tests for `selectWorkspaceNativeLease`: exact match with two live siblings; `null` thread
with one live entry; `null` thread with two live entries returns `undefined`; a finalizing sibling
does not count as live.

Re-aimed, never deleted — **Stage A**: cases in `journeyStartAvailability.test.tsx`,
`postTerminalContinuityMatrix.test.ts`, `piInvocationInspectionConformance.test.ts` (*"reports
three available slots while the renderer still refuses the second"* becomes *"…and the renderer
admits the second"*), `workspaceGrainedOccupancy.test.ts`, `runtimeWorkspaceKeying.test.ts` (grain
guard asserts `"workspace"`), `conversationAvailability.test.ts`, `admissionRefusalLegibility.test.ts`.
**Stage B**: the explicit `"workspace"` arguments and the `same_journey_occupied` entries in
`REASONS` and in the order guard are retired.

### Validation

Stage A gates: `tsc` 0; `vitest` green; `cargo test` 285 unchanged with **0 native diff lines**;
both builds; `roadmap:check` READY. Then the Dev install under the hash discipline, then the field.

**Field, Stage A.** D0–D5 from the baseline document. The durable claim is D1's: two
`turn-journal` records for `mirror-desktop` with distinct `threadId` and intersecting
`piExecution` windows. Additionally observable: the *"Could not attach to the Pi process event
stream"* sentence does not appear on D1B, and both conversations receive their own answers.
**Limits stated in advance**: the dispatcher's quarantine cannot be read in the field (the release
build has no developer console); a second settlement-timings record is expected *unless* either
turn settles through recovery, in which case CR129's gap applies and is recorded, not debited
here; if D1A stalls again as on 2026-10-10, that is CR142's reproduction and is **recorded, not
fixed, inside this CR**.

### Exclusions

No change to admission order, the share, the registry key, compaction or the refusal sentences.
`hasBlockingPiInvocationOccupancy` stays global; `recovery_inspection` stays unrendered;
`hasActiveNativeExecutionInJourney` stays per-Journey. The `agent → app` import direction is used,
not repaired. CR142's mechanism and CR129's ledger are out of scope even if this CR's field run
reproduces them.

### Three decisions written so they can be overruled rather than discovered

1. **Two-stage delivery**, with removal gated on the durable claim rather than on the merge.
2. **The null-thread lease rule mirrors `selectJourneyRuntime`** — one live entry answers, two
   decline. The alternative, always `undefined` when the thread is unresolved, would blank the
   Journey surface during the catalog load for every Journey with one running turn.
3. **The key helper is imported from `app/`**, matching the existing direction, rather than moved
   to `domain/` inside a slice whose subject is routing.

## Acceptance

- Two concurrent turns in one Journey each receive their own `message_delta`, `run_status` and
  `done` events, asserted by a test that interleaves two routes and checks no event crosses.
- An event whose authority carries no routing coordinate is quarantined, not delivered to a guess.
- `App.tsx:1252` no longer selects a native lease by Journey: with two live siblings, the selected
  workspace sees its own lease, its own blocking record and its own rehydration, asserted on
  `selectWorkspaceNativeLease` and by a widened source guard that covers predicate scans.
- The five same-workspace dispatcher cases pass **unchanged**, and the native diff is **zero**.
- `PI_EVENT_TRANSPORT_GRAIN` flips to `"workspace"` and the guard in
  `runtimeWorkspaceKeying.test.ts` is re-aimed; `same_journey_occupied` is removed only if no path
  can reach it.
- **Field: the D1–D5 sequence in `docs/update/rs024-field-verification-baseline-2026-10-10.md`
  runs to completion.** D1's durable claim — two `turn-journal` records for one `journey_id` with
  distinct `thread_id` and intersecting `piExecution` windows — is this CR's closing evidence, and
  it carries the evidence owed by CR138, CR139 and CR140.

## Boundaries

No change to admission, the share, the registry key or the compaction exclusion. No change to the
refusal sentences, which CR140 already unified. The lost-turn defect observed in the same field
attempt is **CR142**, not this CR.
