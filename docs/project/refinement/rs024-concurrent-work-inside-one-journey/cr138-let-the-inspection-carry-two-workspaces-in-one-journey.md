[< RS024](index.md)

# CR138: Let the Inspection Carry Two Workspaces in One Journey

**Status:** captured
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

## Acceptance

- An inspection with two entries in one Journey and distinct `threadId`s parses as `known`; one with two entries sharing `(journeyId, threadId)` is rejected; one with duplicate `runId`s is still rejected.
- `register` admits a second run in the same Journey under a different thread and refuses a second run under the same thread, with the refusal reason renamed from `serial_capacity_rejected` to one naming the workspace.
- `derivePiInvocationAdmission` refuses only the same workspace; `hasActiveNativeExecution` answers for a workspace, with a Journey-level aggregate available where CR134's locus needs it.
- Every existing per-Journey reader is either re-keyed or explicitly marked as an aggregate, and a guard asserts the Record is no longer indexed by bare `journeyId`.
- With the native side unchanged, every existing test that exercises one run per Journey still passes with the same verdicts. Replay, not argument.
- **No field verification is owed.** Rust emits at most one entry per Journey until CR139, so no Dev run can provoke this change. Stated here so it is not asked for later.

## Boundaries

No Rust change. No change to what the native side emits. No per-Journey share computed in the renderer. No change to CR133's expansion, CR134's locus semantics or CR135's visibility beyond re-keying the entries they read.
