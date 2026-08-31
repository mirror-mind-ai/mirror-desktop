# Plan — DS-009.TS-3

## Objective

Move live and mock run bookkeeping from one selected-Journey-shaped group of React states into an authority-bound map keyed by Journey, and replace per-invocation Tauri listeners with one app-lifetime process-event dispatcher, while backend execution remains globally serial at capacity 1.

This story establishes frontend isolation only. It does not make background navigation available, add a backend process registry, change cancellation addressing, or enable concurrent Pi processes.

## Current-State Characterization

The implementation starts from these observed constraints:

- `App.tsx` currently owns global `isStreaming`, `isFinalizingTurn`, `agentRun`, `agentRunJourneyId`, stream mode, mission projection, warnings, diagnostics, safety, runtime projection and runtime-message identity.
- Stream callbacks mutate those globals and the currently loaded `conversation`; several asynchronous paths use `selectedJourneyRef` as a mutation guard.
- `selectJourney()` resets runtime globals and currently refuses selection while streaming or finalizing.
- `livePiAgentStream()` mounts and removes one `nautilus-pi-process` listener per invocation. Each listener receives the shared event channel and filters against its expected `RunAuthority` only after receipt.
- TS-1 already makes bounded `PiProcessEventAuthority` available on production events and provides exact comparison against the immutable `RunAuthority`.
- `cancel_pi_invocation` is still a global command, and the native backend still owns one global child slot.

These are characterization facts, not authorization to change adjacent lifecycle contracts.

## Scope

### 1. Journey-keyed runtime model

Introduce a pure frontend runtime model keyed by `journeyId`. One current entry per Journey is bound to the immutable `RunAuthority` for a live dedicated run (or to an explicit mock-run identity that never enters the Tauri dispatcher) and owns the run-scoped presentation and lifecycle state now held globally:

- agent run status and terminal outcome;
- streaming and finalization phases;
- stream mode;
- assistant/runtime message identity and streamed presentation data;
- mission draft, warnings, diagnostics and safety;
- ordered runtime projection, operations and context usage;
- the owner conversation/generation identity needed by captured-authority callbacks;
- bounded quarantine metadata, separate from current-run diagnostics.

The model must expose pure actions/selectors for registering a run, reducing an authority-bearing stream event, entering/leaving finalization, settling a run, replacing an eligible terminal Journey run, deriving selected-Journey presentation and pruning eligible terminal entries. Registration must reject replacement while the current entry is active or finalizing, preserving one frontend run app-wide in this serial phase.

`selectedJourney` must not be an input to mutation routing. It may only select which map entry is rendered. A separate aggregate selector must continue to report whether any run is active or finalizing so existing global-capacity-1 controls remain blocked even when the selected Journey has no active entry.

### 2. Authority and stale-event rules

For live dedicated runs, registration captures the existing `RunAuthority` once. Every raw process event is routed by its bounded event authority and must match the current entry's complete expected authority, not merely `journeyId` or `runId`.

The reducer/dispatcher must fail closed when an event:

- has no authority;
- names an unknown Journey or run;
- differs in run, turn, thread, generation, Pi session, Mirror conversation or Harness message identity;
- belongs to an entry replaced by a newer run for the same Journey; or
- arrives after its route has been closed, except for explicitly supported idempotent terminal handling.

Rejected events must never be converted into warnings, diagnostics, runtime operations, assistant deltas or terminal state for the current run. They may be discarded or recorded in a small bounded quarantine keyed by rejected authority/reason; quarantine must not be rendered as current-run diagnostics and must not retain prompts, provider configuration, private session paths, raw stdout/stderr or secrets.

### 3. One app-level Tauri dispatcher

Extract the `nautilus-pi-process` subscription from `livePiAgentStream()` into a central dispatcher mounted once for the app lifetime and removed once on unmount. The dispatcher must:

- own exactly one Tauri `listen` subscription regardless of the number of registered or replaced runs;
- register and remove authority-bound run routes without adding listeners;
- keep mapping state isolated per registered run;
- map accepted raw process events into stream events only for the matching route;
- keep the matching route open through `run_status: completed`, `error` and `cancelled` stream events;
- close the matching route only after receiving and delivering the authority-matching native `PiProcessEvent.kind === "done"`, so post-`agent_end` context, compaction and Mirror evidence emitted before native `done` cannot be lost;
- close no other Journey route when native `done` arrives;
- tolerate React remount/unmount without duplicate listeners or delivery after disposal; and
- expose dependency-injected listener/dispatch seams for deterministic tests.

`livePiAgentStream()` remains the invocation adapter and async stream surface, but consumes an authority-bound route from the central dispatcher instead of calling Tauri `listen` itself. It must complete authority-route registration before calling `start_pi_invocation(prompt, config, runAuthority)`. This ordering is a hard start barrier: an event emitted immediately by the native invocation must find the registered route, and registration failure must prevent `start_pi_invocation` from being called. Once invocation begins, `run_status: completed`, `error` and `cancelled` may update run presentation but may not release the route or end stream consumption; only the matching native `done` closes that route. The mock stream must remain Tauri-free and must not register with the process-event dispatcher.

### 4. App integration under serial execution

Refactor `App.tsx` so run callbacks dispatch against the start-captured Journey/run authority and owner state rather than whichever Journey is selected when the callback fires. Rendering, composer status, diagnostics, runtime activity and context usage read the selected Journey entry. Durable conversation updates and finalization continue to use the run's captured conversation identity and existing dedicated-turn authority.

The integration must preserve these serial-era boundaries:

- keep the existing UI prohibition on switching Journeys while a run is streaming/finalizing; reopening navigation belongs to DS-009.US-1;
- keep all invocation, retry, restart, settings and attachment controls governed by the aggregate active/finalizing selector so selecting another entry cannot bypass global capacity 1;
- do not permit a second frontend run registration while any run is active or finalizing;
- do not change when process capacity or finalization is released;
- do not redesign conversation persistence, Mirror append/outbox settlement or reconciliation;
- do not infer mutation authority from `selectedJourney`, `conversationRef.current`, provider callbacks or event payload fragments.

Tests may change a synthetic selected-Journey presentation pointer during an active entry to prove reducer independence. That test seam does not authorize enabling the corresponding user navigation yet.

### 5. Safe cleanup

Cleanup is authority-conditional. A stale completion, unsubscription or async `finally` for run A must not delete a replacement run B in the same Journey. Pruning may remove only an entry whose expected authority still matches and which is neither active nor finalizing. Cleanup of one Journey must not remove active/finalizing entries for another Journey.

## Planned Files and Responsibilities

Expected implementation surface (exact names may be adjusted without changing responsibilities):

- `src/app/journeyRuntimeState.ts` — Journey-keyed types, reducer, selectors, bounded quarantine and authority-conditional cleanup.
- `src/agent/piProcessEventDispatcher.ts` — single-listener lifecycle, route registration and authority-bound delivery.
- `src/agent/piProcessStream.ts` — consume dispatcher routes instead of mounting a Tauri listener per invocation; retain mapping and invocation behavior.
- `src/app/App.tsx` — replace global run states with keyed reducer/selectors and captured-owner callbacks while retaining global serial guards.
- Focused tests under `src/tests/` for reducer isolation, dispatcher lifecycle, app/source guardrails and existing process mapping compatibility.

No Rust source change is expected. Any discovered need to alter the native command contract, registry, capacity, cancellation signature or persistence protocol is a scope-change stop condition.

## Acceptance Behavior

```text
Given Journey A owns the only active RunAuthority
And the presentation selector points to Journey B in a reducer fixture
When an authority-matching delta, operation, warning, diagnostic or context update arrives
Then only Journey A's runtime entry changes
And Journey B's selected presentation remains unchanged
And the aggregate serial-execution guard remains active.
```

```text
Given Journey A run 1 has been replaced by Journey A run 2
When a late event or cleanup arrives with run 1 authority
Then run 2 is not mutated, diagnosed, settled or removed
And the rejected signal is discarded or placed only in bounded quarantine.
```

```text
Given the app dispatcher is mounted
When run routes are registered, completed, replaced or removed
Then exactly one nautilus-pi-process listener exists
And unmount removes it exactly once
And remount does not duplicate event delivery.
```

```text
Given an authority route receives agent_end, error or cancelled-derived stream state
When post-processing context, compaction or Mirror evidence arrives before native done
Then the route remains open and delivers that evidence
And only an authority-matching PiProcessEvent.kind === "done" closes the route.
```

```text
Given livePiAgentStream is ready to start a native invocation
When route registration succeeds
Then registration completes before start_pi_invocation is called
And an immediately emitted started event is delivered
But when registration fails, start_pi_invocation is not called.
```

```text
Given backend execution remains globally serial
When any Journey entry is active or finalizing
Then a second invocation remains blocked across the app
And the native cancellation and process contracts remain unchanged.
```

## Implementation Sequence

1. Add characterization tests for current stream mapping, listener ownership and global runtime fields before refactoring.
2. TDD the Journey-keyed runtime reducer and selectors, including authority replacement, stale quarantine and safe cleanup.
3. TDD the dependency-injected central dispatcher lifecycle, per-route mapping-state isolation and native-`done`-only route closure.
4. Refactor `livePiAgentStream()` to complete authority-route registration before native invocation, keep the route open until matching native `done`, and leave mock execution independent of Tauri.
5. Integrate the keyed reducer/selectors into `App.tsx`, first preserving global capacity guards, then moving selected presentation reads and captured-owner callback writes.
6. Add regression tests proving selected presentation cannot become mutation authority and stale diagnostics cannot leak into a replacement run.
7. Run the story validation matrix and inspect the diff for native, sibling-story and RS015 changes.

## Validation Route

The primary route is deterministic fixture-level validation because the behavior delivered here is infrastructure and DS-009.US-1 deliberately keeps user Journey navigation disabled during active/finalizing work. A desktop E2E that switches Journeys during a run would implement or bypass the next user story and is therefore not required for TS-3.

Navigator-visible evidence consists of the focused Vitest suites named in `test-guide.md`, including a synthetic selected-Journey switch, listener mount/unmount counts, stale replacement events, cleanup isolation and aggregate capacity-1 selectors. A development-channel smoke check confirms one live run still renders and settles normally without exposing active-run navigation.

Pass condition: the focused tests show Journey A alone receives its correlated updates while Journey B is selected in the fixture; stale run A1 signals cannot affect A2; only one listener is mounted; mock mode never uses Tauri; active/finalizing cleanup is preserved; all repository gates pass; and no concurrency or navigation is enabled.

Fail condition: selection determines a mutation target; missing/divergent authority becomes current-run diagnostics; a stale event or cleanup changes a replacement run; more than one Tauri process listener is attached; a second invocation becomes possible; mock mode requires Tauri; or the change touches backend registry/capacity, persistence semantics, sibling roadmap items or RS015.

## E2E Decision

A new automated desktop E2E is **not required** for this technical story. Pure reducer/dispatcher tests are the authoritative route, supplemented by a non-promoting DEV smoke check. Full navigation and multi-Journey desktop evidence belongs to DS-009.US-1 and later DS-009 concurrency stories.

## Non-Goals

- DS-009.US-1 navigation enablement or sidebar running-state UX.
- DS-009.TS-2 backend Journey registry, directed start/cancel APIs or lease inspection.
- DS-009.TS-4 persistence serialization, finalization acknowledgement or recovery changes.
- DS-009.US-2/US-3 capacity 2, concurrent execution or targeted cancellation.
- Any `cancel_pi_invocation` contract change.
- Persisted `TurnCorrelation` schema changes or `RunAuthority` redesign.
- Provider settings, context-accounting, reconciliation or Mirror protocol redesign.
- RS015 changes, app promotion, release or deployment.

## Risks and Mitigations

- **Global state migration can accidentally make inactive Journeys bypass capacity 1.** Keep an explicit aggregate active/finalizing selector and test every invocation/control guard against it.
- **Async closures can still target the loaded conversation.** Capture owner authority/conversation identity at registration and route all callback actions through it; retain generation checks for durable updates.
- **Late stderr can poison a replacement run.** Validate raw event authority before mapping stderr to warning/diagnostic and keep quarantine structurally separate.
- **React lifecycle can duplicate listeners.** Make dispatcher mount/dispose idempotent and assert exact listen/unlisten counts across remount fixtures.
- **Stream-level terminal state can close a route too early.** Treat only matching native `PiProcessEvent.kind === "done"` as route closure; test post-`agent_end`, error and cancellation evidence delivery.
- **Native invocation can race route registration.** Await registration before invocation and test an immediate `started` emission plus fail-closed registration errors.
- **Terminal cleanup can erase finalization state.** Separate process terminal state from frontend finalization and require authority match plus inactive/non-finalizing eligibility before pruning.
- **The refactor may drift into US-1.** Preserve the active/finalizing selection guard and validate selection independence only through pure fixtures.

## Implementation Contract

- Use TDD for reducer, dispatcher and integration behavior.
- Keep backend process execution globally serial at capacity 1.
- Preserve `cancel_pi_invocation`, `RunAuthority` and persisted `TurnCorrelation` contracts.
- Keep mock execution Tauri-free.
- Do not edit sibling roadmap packages or RS015.
- Do not use `git add .`; commit only story-scoped implementation and evidence.
- Use descriptive English commit messages explaining why.
- Do not promote, release or deploy the app.

## Stop Conditions

- A native registry, capacity, cancellation or persistence contract change appears necessary.
- Navigation must be enabled to complete the implementation.
- Event authority cannot be validated before diagnostic mapping.
- Safe keyed updates require changing persisted `TurnCorrelation` schema `0.2.0`.
- A required check fails without a story-scoped fix.
- Navigator clarification or scope approval is needed.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until explicit Navigator approval through Ariad.
