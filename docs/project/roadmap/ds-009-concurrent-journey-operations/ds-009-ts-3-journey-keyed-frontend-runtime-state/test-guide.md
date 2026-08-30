[< Story](index.md)

# Test Guide — DS-009.TS-3

## Test Boundary

Validate Journey-keyed frontend runtime state and one app-level process-event dispatcher while native execution remains globally serial at capacity 1.

Do not enable active-run navigation or concurrency to test this story. Selected-Journey changes are simulated at the pure reducer/selector boundary. The live smoke route remains a single-run route in the development channel.

## Automated Validation

### Journey-keyed reducer and selectors

Add focused tests for the new runtime model covering:

1. Register Journey A with a complete `RunAuthority`, then reduce deltas, operations, warnings, diagnostics, safety, context usage, finalization and terminal events into A only.
2. Change a synthetic selected-Journey presentation pointer from A to B while A is active; continue routing events to A and prove B is unchanged.
3. Derive the rendered state from the selected Journey without passing selection into mutation actions.
4. Keep the aggregate `any active or finalizing` selector true while the selected Journey has no active run.
5. Reject missing authority and every divergent authority dimension: Journey, run, turn, thread, generation, Pi session, Mirror conversation and Harness message identities.
6. Replace A1 with A2, then deliver A1 stdout, stderr, terminal and cleanup signals; prove A2 state and diagnostics are unchanged.
7. Keep rejected-event quarantine bounded, free of raw payload/private data and separate from current warnings/diagnostics.
8. Ignore duplicate terminalization without reopening or changing the settled outcome.
9. Prune only authority-matching terminal, non-finalizing entries; preserve active/finalizing A while cleaning B and preserve replacement A2 from stale A1 cleanup.
10. Keep mock-run state keyed without creating or requiring Tauri authority routes.

Expected suite: a new focused test such as `src/tests/journeyRuntimeState.test.ts` plus updates to existing status/projection tests where their inputs move to selectors.

### Central process-event dispatcher

Add dependency-injected dispatcher tests covering:

1. App mount calls Tauri `listen("nautilus-pi-process", ...)` exactly once.
2. Registering multiple sequential/replacement authority routes does not add listeners.
3. Matching raw events reach exactly one route and use mapping state isolated to that run.
4. Missing, unknown and divergent event authority is rejected before stdout/stderr mapping.
5. Rejected stderr never becomes a warning or diagnostic on the current route.
6. A terminal event closes only its matching route.
7. Removing A1 after A2 registration cannot remove or close A2.
8. Dispose calls `unlisten` exactly once, prevents later delivery and is safe when repeated.
9. Remount creates one fresh listener without duplicate delivery from the disposed instance.
10. Listener-attachment failure yields the existing bounded error path without starting an uncorrelated run.

Expected suite: a new focused test such as `src/tests/piProcessEventDispatcher.test.ts` and compatible updates to `src/tests/piProcessStream.test.ts`.

### Stream adapter compatibility

Retain or add tests proving:

- `livePiAgentStream()` validates provider configuration and invokes `start_pi_invocation` with `prompt`, `config` and the original immutable `runAuthority`;
- it registers an authority route with the shared dispatcher rather than importing/calling Tauri `listen` per invocation;
- route registration is released in success, invoke failure, cancellation and generator cleanup paths;
- event mapping still preserves ordered reasoning, operations, compaction, context usage and terminal semantics;
- `mockPiAgentStream` remains Tauri-free; and
- `cancelLivePiInvocation()` and `cancel_pi_invocation` remain unchanged and untargeted in TS-3.

### App integration and serial guardrails

Add behavioral tests where practical and narrow source guardrails only where component mounting is impractical. Prove:

- the global cluster of run presentation states has been replaced by one Journey-keyed reducer/model;
- selected presentation reads only the selected Journey entry;
- async event/finalization actions carry captured owner authority rather than `selectedJourney`;
- controls and invocation preflight use the aggregate active/finalizing selector, preserving capacity 1 app-wide;
- `selectJourney()` still blocks active/finalizing navigation pending DS-009.US-1;
- a selected-Journey reset does not clear another Journey's active/finalizing entry;
- composer status, runtime projection, warnings, diagnostics, context usage and terminal outcome come from the selected entry; and
- conversation settlement remains generation/owner checked and does not broaden persistence behavior.

Expected updates may include `src/tests/composerTurnStatus.test.ts`, `src/tests/runtimeProjectionComponent.test.tsx`, `src/tests/journeyManagementGuardrails.test.ts` and one focused app runtime integration suite.

## Required Commands

Run from the Harness repository:

```bash
npm test -- --run src/tests/journeyRuntimeState.test.ts src/tests/piProcessEventDispatcher.test.ts src/tests/piProcessStream.test.ts
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --features development-channel
git diff --check
```

If final test names differ, record the equivalent focused command in `validation.md`.

Also inspect scope explicitly:

```bash
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD -- src-tauri docs/project/roadmap/rs-015
git status --short
```

The second diff must show no Rust source, sibling roadmap package or RS015 change unless the Navigator explicitly re-plans the story. Documentation lifecycle artifacts inside the TS-3 package are expected after implementation.

## Deterministic Interleavings

Use fixed authority fixtures and explicit event order. At minimum include:

```text
register A1
select presentation B
deliver A1 started/delta/diagnostic/context
assert only A1 changed and aggregate busy remains true
settle A1 and finish its finalization
register A2 as the eligible current replacement
deliver late A1 stderr/done/cleanup
assert A2 unchanged and no current diagnostic leakage
deliver A2 terminal
mark A2 finalizing
attempt cleanup
assert A2 preserved
finish finalization
cleanup A2
assert eligible removal only
```

Listener lifecycle fixture:

```text
mount dispatcher
register A1
close A1
register A2
assert listen count = 1
dispose twice
assert unlisten count = 1
remount
assert total active listeners = 1
```

## Navigator Validation

### Fixture route — authoritative for TS-3

1. Run the focused reducer and dispatcher command.
2. Inspect the named test output for:
   - selected presentation switched to Journey B while A receives matching events;
   - stale A1 stderr/terminal/cleanup rejected after A2 replacement;
   - one listener across route registration/replacement;
   - active/finalizing cleanup preservation; and
   - aggregate serial guard remaining active.
3. Review the implementation diff to confirm no backend registry, capacity, directed cancellation, navigation enablement or RS015 change.

Expected observation: every test passes; updates remain attached to captured Journey/run authority independent of selection; stale diagnostics are absent from the replacement run; listener counts are exact; and capacity remains 1.

Pass condition: focused and full gates pass, the scope diff is clean, and the repository is clean after the story commits.

Fail condition: any current entry changes from stale/missing/divergent authority; selection changes mutation destination; listener count exceeds one; cleanup removes active/finalizing or replacement state; a second invocation is unblocked; or out-of-scope files/contracts change.

### Development-channel smoke route — non-promoting

Use only **Nautilus Harness Dev** and disposable development data:

1. Open one ready Journey and start one live run.
2. Observe ordered runtime activity, warnings/context status if emitted, assistant output and finalization through completion.
3. Confirm Journey selection remains disabled while active/finalizing.
4. After settlement, select another Journey and confirm the prior Journey's terminal presentation does not appear as the new Journey's current diagnostics/runtime state.
5. Do not launch a second process, change stable data or promote the app.

Expected observation: the serial user experience remains coherent while the internal listener and state ownership have changed.

This smoke route is supplementary because the active-run selection scenario intentionally remains inaccessible until DS-009.US-1.

## E2E Decision

No new automated desktop E2E is required for TS-3. Pure reducer/dispatcher fixtures are more direct and do not violate the mandated story order. Full UI navigation during active work is validated in DS-009.US-1; real multi-Journey concurrency is validated only after TS-4 in DS-009.US-2/US-3.

## Regression Invariants

- Backend execution remains globally serial at capacity 1.
- `start_pi_invocation(prompt, config, runAuthority)` is unchanged.
- `cancel_pi_invocation` remains unchanged.
- Persisted `TurnCorrelation` remains schema `0.2.0`.
- Event authority excludes `piSessionFile` and provider/private data.
- Provider arguments cannot override the validated RunAuthority session.
- Mock streaming remains Tauri-free.
- Navigation is not enabled in this story.
- No backend registry, persistence redesign, sibling story, RS015, promotion or release change lands.

## Validation Evidence

Pending implementation and validation. Record exact commands, test counts, DEV smoke observations, changed-file scope, link checks, `git diff --check`, tree cleanliness and commit hashes during the later Validation lifecycle phase.
