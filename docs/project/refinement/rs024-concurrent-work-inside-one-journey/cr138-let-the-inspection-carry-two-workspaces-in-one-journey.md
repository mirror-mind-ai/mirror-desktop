[< RS024](index.md)

# CR138: Let the Inspection Carry Two Workspaces in One Journey

**Status:** planned
**Driver:** —
**Delivery:** —

## Friction

The renderer cannot represent two running workspaces in one Journey, and it fails closed when shown them.

`isValidPiInvocationInspection` (`piInvocationOccupancy.ts:179`–`:181`) requires the number of distinct `journeyId` values to equal the number of entries. A native inspection carrying two entries for one Journey is therefore **invalid as a whole**, degrades to `status: "unknown"`, and `hasBlockingPiInvocationOccupancy` (`:300`) treats `unknown` as blocking. The observable result would be a Composer disabled app-wide.

Behind the validator, `journeyRuntimeState.ts` holds `entries: Record<journeyId, Entry>` and `register` refuses a second same-Journey run through `state.entries[journeyId]` (`:105`) as `serial_capacity_rejected`. There are 18 indexed reads of that Record across 7 production files, including `journeyWorkLocus.ts` and `settlementAbandonment.ts`, which CR134 and CR132 delivered against the per-Journey grain. `derivePiInvocationAdmission` (`:289`) and `hasActiveNativeExecution` (`:314`) filter on `entry.authority.journeyId === journeyId`; the `otherEntries` filter at `:258` means "other Journeys" and would silently mean "other workspaces" after re-keying.

**One cost reducer, verified.** `AUTHORITY_KEYS` already contains `threadId` (`:89`–`:92`). The wire already carries the grain. Only the uniqueness rule and the indexes change; no authority field is added.

## Outcome

The renderer can carry, index and reason about two workspaces in one Journey, keyed by `(journeyId, threadId)`, while the native side still emits at most one entry per Journey. Nothing changes in the field; everything changes in what the field *could* show without locking the Composer.

## First Investigation

1. **Write the admissibility characterisation first, against unchanged code**: a synthetic inspection with two entries in one Journey and distinct threads must be shown to be rejected today, and shown to degrade to `unknown` and then to blocking. This is the Phase 1 step CR136's investigation found missing, and it is the cheap decisive test before the expensive change.
2. Enumerate every reader of `entries[...]` and classify each as *per workspace* or *per Journey aggregate*. CR134's `deriveJourneyWorkLocus` is an aggregate by design; `register`'s refusal is per workspace. Do not assume either way.
3. Re-derive CR132's two-predicate agreement (`isActivePiInvocationLease` versus the runtime predicate) behaviourally at the workspace grain, as RS023's record requires, rather than by argument.
4. Establish what `derivePiInvocationAdmission` should refuse at this grain: the same workspace running is a refusal; a sibling workspace running is not; the Journey share is **not** this CR's to compute, since it is enforced natively in CR139.
5. Name the 6 TypeScript test files that pin the per-Journey grain (`journeyWorkVisibility`, `journeyRuntimeState`, `postTerminalContinuityMatrix`, `journeyStartAvailability`, `piInvocationOccupancy`, `conversationAvailability`) and decide for each whether it is re-aimed or whether it pins a behaviour that must survive. Needing to delete one is the signal to stop.

## Investigation Findings and Plan (2026-10-09)

### Item 1 — admissibility characterised against unchanged code

A throwaway test (run, then removed, zero diff) fed `validatePiInvocationRegistryInspection` two `running` entries for `mirror-desktop` with distinct `threadId`s and distinct `runId`s:

| Probe | Result |
|---|---|
| validator on two workspaces, one Journey | `false` |
| validator on one entry | `true` |
| `applyPiInvocationInspection` after the two-entry payload | `status: "unknown"`, diagnostic *"Native Pi invocation occupancy inspection was invalid."*, `entries: []` |
| `hasBlockingPiInvocationOccupancy` on that state | `true` |
| `derivePiInvocationAdmission` for another Journey while one runs | `allowed: true` |

Finding 1 of CR136 is confirmed end to end, and one more consequence surfaced: `releaseAndReinspectPiInvocationLease` (`:186`–`:206`) **throws** on an invalid reinspection, so cleanup after a settled turn would also fail hard while a sibling workspace runs. Two paths fail closed, not one.

### Item 2 — every `entries[...]` reader, classified

| Reader | Grain | Disposition |
|---|---|---|
| `register` refusal, `journeyRuntimeState.ts:105` | workspace | re-key; the refusal reason is renamed `same_workspace_occupied` because `serial_capacity_rejected` describes the Journey grain truthfully and would describe the new one falsely |
| `patch` / `append_warning` / `reset`, `:130`, `:140`, `:150` | workspace, addressed by bare `journeyId` | each action gains a workspace; **15 dispatch sites in `App.tsx`**, 5 addressed by `selectedJourney` and 10 by `ownerJourneyId` or none |
| `selectJourneyRuntime`, `:195` | workspace | callers: `App.tsx` ×1, `journeyNavigationCoordinator.ts` ×1 |
| `selectJourneyRuntimeOwnerPhase`, `:222` | **aggregate** | 5 callers in `App.tsx`, all feeding CR134's locus; becomes *the phase of any workspace in the Journey*, with the owner identity selected alongside it |
| `selectJourneyRuntimeConversation`, `:233` | workspace | 2 + 3 callers; the snapshot belongs to one run |
| `App.tsx:1061`, `:5358` `entries[id]?.identity` | aggregate | both are `runtimeIdentity` inputs to `deriveJourneyWorkLocus`; the locus needs *an* owner, and with two it needs a rule — recorded below |
| `App.tsx:2489` `entries[authority.journeyId]?.identity` | workspace | the event carries full authority, so the workspace key is at hand |
| `App.tsx:3733` `entries[ownerJourneyId]` | workspace | post-terminal recovery of one run |
| `selectedNativeLease`, `App.tsx:1205` | workspace | finds by `journeyId` alone; the selected workspace's thread is already derived at `:1044` and `:1057` |
| `retainExpectedPiInvocationLease`, `piInvocationOccupancy.ts:258` | workspace | `otherEntries` filters by `journeyId`, so it would **erase a sibling workspace's lease** at the new grain; must filter by workspace key |
| `derivePiInvocationAdmission`, `:289` | workspace | callers `App.tsx` ×2, `settlementAbandonment.ts` ×1 |
| `hasActiveNativeExecution`, `:314` | **both** | callers `App.tsx` ×3, `settlementAbandonment.ts` ×2; split into a workspace form and a Journey aggregate, each caller classified at delivery |
| `resolveExactSettlementRecovery`, `:334` | workspace | already matches full authority; only the sort order changes |
| `shouldRehydratePiProcessRoute`, `:350` | workspace | takes one lease; which lease is the caller's choice and must be the selected workspace's |
| sort in `applyPiInvocationInspection` `:231` and `:267` | — | sort by `journeyId` then `threadId`, or two sibling entries have unstable order |

**The mock identity has no `threadId`** (`JourneyRunIdentity` `mock` is `{ journeyId, runId }`). A mock run is keyed to its Journey alone. Mock and live never share a session, so the keys cannot collide; recorded rather than discovered.

**Two workspaces and one locus.** `deriveJourneyWorkLocus` receives a single `runtimeIdentity`. With two live workspaces in one Journey the question "is the work inside or at the root" has two answers. Rule for this CR: the locus reports **`inside` if any live workspace is a conversation, otherwise `root`**, and the owner identity passed to the status surface is the **selected workspace's own run if it is live, else the first live sibling by thread order**. Not a UX decision this CR may take alone, so it is written down to be overruled; CR140 owns the surface.

### Item 3 — CR132's shared property at the new grain

`settlementAbandonmentOffer` consults `derivePiInvocationAdmission` and `hasActiveNativeExecution` for the Journey it is abandoning. At the workspace grain the offer must be computed for the **abandoning workspace**, and the property RS023 required — *two predicates that agree* — is re-derived by a behavioural test with a sibling live: the offer for workspace A must not be withheld because workspace B is executing.

### Item 4 — what admission refuses in the intermediate state

This is the plan's load-bearing decision. During CR138 the native registry still refuses a second same-Journey run with `DuplicateJourney`. If the renderer's pre-check admitted a sibling workspace, the Navigator would lose today's specific refusal (*"A conversation in this Journey already has native work in progress"*) and get the native string instead — a legibility regression inside a CR that must change nothing in the field.

So the renderer's admission carries an explicit grain:

```ts
export const NATIVE_ADMISSION_GRAIN: "journey" | "workspace" = "journey";
```

While it is `"journey"`, `derivePiInvocationAdmission` refuses a sibling workspace with the existing `same_journey_occupied`, exactly as today. When CR139 lands it flips the constant to `"workspace"`, and `same_journey_occupied` is retired in CR140. A guard asserts the constant's value, so flipping it is a visible decision and not a side effect. **The invariant is made true by construction**: the only way the renderer admits a sibling is a one-line change that a test names.

### Item 5 — the six tests that pin the old grain

| Test file | Tests | What it pins | Disposition |
|---|---|---|---|
| `piInvocationOccupancy.test.ts` | 13 | validator uniqueness; `same_journey_occupied` at `:171` | re-aim uniqueness to the workspace pair; keep the `same_journey_occupied` case **alive under the `"journey"` grain** and add the sibling case |
| `journeyRuntimeState.test.ts` | 16 | `serial_capacity_rejected` at `:190`; same-generation snapshot refusal `:329` | re-aim: same workspace twice → `same_workspace_occupied`; sibling → admitted; snapshot test unchanged |
| `journeyStartAvailability.test.tsx` | 9 | the `same_journey_occupied` sentence `:97` | unchanged — the sentence survives until CR140 |
| `journeyWorkVisibility.test.tsx` | 17 | admission fixture `:163` | unchanged in verdict; fixture gains `threadId` where the key needs it |
| `postTerminalContinuityMatrix.test.ts` | 5 | `same_journey_occupied` in a 4-reason matrix | unchanged — matrix is over native reasons, which do not change here |
| `conversationAvailability.test.ts` | 10 | `nativeAdmission: "same_journey_occupied"` `:124` | unchanged |

None is deleted. Three are re-aimed, three are untouched. **Needing to delete one is the signal to stop.**

### Scope

Renderer only. Introduce the workspace grain into occupancy parsing and runtime state, keep every field-visible behaviour identical through the explicit `"journey"` admission grain, and prove identity by replay.

### Files

- **New** `src/app/journeyWorkspaceKey.ts` — `JourneyWorkspace = { journeyId, threadId }`, `runtimeWorkspaceKey(workspace)` as `` `${journeyId}|${threadId}` `` (`|` is outside `IDENTIFIER_PATTERN`, so the key is unambiguous), `workspaceOfIdentity(identity)` (mock → Journey-only key), `workspaceOfAuthority`, and `NATIVE_ADMISSION_GRAIN`.
- `src/app/piInvocationOccupancy.ts` — validator uniqueness over `(journeyId, threadId)` and `runId`; both sorts by `journeyId` then `threadId`; `derivePiInvocationAdmission(state, workspace)` honouring the grain; `hasActiveNativeExecution(state, workspace)` plus `hasActiveNativeExecutionInJourney(state, journeyId)`; `retainExpectedPiInvocationLease` filtering by workspace key; `PiInvocationAdmission` gains `same_workspace_occupied`.
- `src/app/journeyRuntimeState.ts` — `entries: Record<WorkspaceKey, Entry>`; `register` refuses on the key; `patch` / `append_warning` / `reset` take a `workspace`; `selectJourneyRuntime(state, workspace)`; `selectJourneyRuntimeOwnerPhase(state, journeyId)` as aggregate returning `{ phase, identity }`; `selectJourneyRuntimeEntries(state, journeyId)`; `JourneyRuntimeQuarantineItem.reason` gains `same_workspace_occupied` and drops `serial_capacity_rejected`.
- `src/app/journeyStartAvailability.ts` — a sentence for `same_workspace_occupied`: *"This conversation already has native work in progress."*
- `src/app/journeyWorkLocus.ts`, `settlementAbandonment.ts`, `journeyNavigationCoordinator.ts`, `journeyCancellation.ts`, `journeyAgentStatus.ts` — re-keyed reads per the table above.
- `src/app/App.tsx` — the 4 reads, the 15 dispatches, `selectedNativeLease`, and the 13 helper calls, each addressed by the selected or owning workspace.
- **Tests, new**: `workspaceGrainedOccupancy.test.ts` (item 1's probes become assertions; the `"journey"`-grain refusal; the sibling case under `"workspace"` by overriding the constant), `workspaceGrainedRuntime.test.ts` (same workspace twice refused, sibling admitted, aggregate phase with two live, mock keying), `settlementAbandonmentWorkspaceGrain.test.ts` (item 3), and the source guard `runtimeWorkspaceKeying.test.ts` (no `entries[` indexed by a bare `journeyId` outside the two modules; `NATIVE_ADMISSION_GRAIN === "journey"`; the runtime state module exports no selector taking a bare `journeyId` that returns a single entry).
- **Tests, re-aimed**: `piInvocationOccupancy.test.ts`, `journeyRuntimeState.test.ts`, `journeyWorkVisibility.test.tsx` fixtures.

### Validation

- `npx tsc --noEmit` clean, with its exit code read directly.
- Full `vitest` run; the four new files added; **every pre-existing test file keeps its verdict** — the replay is the acceptance, and the count moves only by the new files.
- `git diff --stat -- src-tauri/` is empty; `cargo test` stays at 269 passed / 3 ignored.
- `npm run build` and `npm run tauri:build:dev` clean.
- A Dev field run is **not** asked for: Rust emits at most one entry per Journey until CR139, so no sequence the Navigator can perform exercises this change. Closed on tests, by design.

### Exclusions

- No Rust change; nothing changes in what the native side emits or refuses.
- No per-Journey share computed in the renderer.
- `NATIVE_ADMISSION_GRAIN` stays `"journey"`; flipping it is CR139's act.
- `hasBlockingPiInvocationOccupancy` keeps its global reach; narrowing it is CR140's question.
- No narrowing of the turn/compaction exclusion.
- No change to CR133's expansion, CR135's visibility, or CR137.
- The two-workspace locus rule above is provisional and is CR140's to confirm on the surface.

## Acceptance

- An inspection with two entries in one Journey and distinct `threadId`s parses as `known`; one with two entries sharing `(journeyId, threadId)` is rejected; one with duplicate `runId`s is still rejected.
- `register` admits a second run in the same Journey under a different thread and refuses a second run under the same thread, with the refusal reason renamed from `serial_capacity_rejected` to one naming the workspace.
- `derivePiInvocationAdmission` refuses only the same workspace; `hasActiveNativeExecution` answers for a workspace, with a Journey-level aggregate available where CR134's locus needs it.
- Every existing per-Journey reader is either re-keyed or explicitly marked as an aggregate, and a guard asserts the Record is no longer indexed by bare `journeyId`.
- With the native side unchanged, every existing test that exercises one run per Journey still passes with the same verdicts. Replay, not argument.
- **No field verification is owed.** Rust emits at most one entry per Journey until CR139, so no Dev run can provoke this change. Stated here so it is not asked for later.

## Boundaries

No Rust change. No change to what the native side emits. No per-Journey share computed in the renderer. No change to CR133's expansion, CR134's locus semantics or CR135's visibility beyond re-keying the entries they read.
