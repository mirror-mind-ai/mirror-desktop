# Plan — DS-009.TS-1 Correlated Journey Run Contract

**Parent Delivery Story:** DS-009 — Concurrent Journey Operations
**Flow unit:** story_by_story
**Plan state:** pending Navigator approval
**Concurrency:** global serial execution remains in force

## Objective

Introduce the complete correlation contract for live dedicated Pi runs without enabling concurrency. TS-1 makes run authority explicit, versioned, constructed once, validated before spawn and projected into bounded process events while preserving existing persisted turn compatibility.

## Current Call Site Inventory

### `start_pi_invocation`

- Native command implementation: `src-tauri/src/main.rs`, `start_pi_invocation`, currently accepts `prompt`, `config`, `journey_id`, `session_id`, optional `session_file` and optional `correlation`; TS-1 plans to replace these diverging authority arguments with `prompt`, `config` and one `RunAuthority` envelope.
- Native command registration: `src-tauri/src/main.rs`, invoke handler includes `start_pi_invocation`.
- Frontend invoke call: `src/agent/piProcessStream.ts`, `livePiAgentStream`, currently invokes `start_pi_invocation` with packet Journey, live conversation Pi session, optional session file and optional correlation; after TS-1, every `livePiAgentStream` path is treated as live dedicated and must call Tauri with `RunAuthority`.
- Frontend provider wiring: `src/app/App.tsx`, `generatePacket`, currently passes `correlation` to `livePiAgentStream` only for live mode when a ready Journey thread exists; TS-1 makes this mandatory for live runs rather than optional fallback.
- Tests mentioning command boundary: `src/tests/conversationRestartLifecycle.test.ts`, `src/tests/journeyDocumentationBrowser.test.tsx`, `src/tests/agentProfileSettings.test.ts`.

### `cancel_pi_invocation`

- Native command implementation: `src-tauri/src/main.rs`, `cancel_pi_invocation`, currently targets the single global child process without `journeyId` or `runId`.
- Native command registration: `src-tauri/src/main.rs`, invoke handler includes `cancel_pi_invocation`.
- Frontend wrapper: `src/agent/piProcessStream.ts`, `cancelLivePiInvocation`, currently invokes `cancel_pi_invocation` without authority.
- UI call site: `src/app/App.tsx`, `cancelActiveRun`, currently cancels the global live run.

TS-1 records the mismatch but does not introduce the per-Journey registry or directed cancellation yet. It may define the future authority shape and add serial validation guards, but cancellation remains globally serial until TS-2.

### `PiProcessEvent`

- Native event name: `src-tauri/src/main.rs`, `PI_PROCESS_EVENT = "nautilus-pi-process"`.
- Native payload: `src-tauri/src/main.rs`, `PiProcessEvent`, currently contains `kind` and `content` only.
- Native emit helper: `src-tauri/src/main.rs`, `emit`, currently emits events without Journey/run authority.
- Frontend event type and listener: `src/agent/piProcessStream.ts`, `PiProcessEvent`, `PI_PROCESS_EVENT`, `livePiAgentStream`.
- Frontend mapping: `src/agent/piProcessStream.ts`, `mapPiProcessEventToStreamEvents` maps unowned process events into stream events.
- Tests: `src/tests/piProcessStream.test.ts` covers event mapping extensively with the current unowned event shape.

TS-1 changes the event contract so all production process emit paths receive authority by construction. `PiProcessEvent` without authority is not a production shape for `start_pi_invocation`; pure tests may construct mapping fixtures, but Tauri production events must be authority-bearing.

### `TurnCorrelation`

- Type definition: `src/agent/agentStream.ts`, `TurnCorrelation` schema `0.2.0`.
- Dedicated authority creation: `src/domain/dedicatedTurnAuthority.ts`, `createDedicatedTurnAuthority`, `validateDedicatedTurnAuthority`.
- Three-body commit helpers: `src/domain/threeBodyTurnCommit.ts`, `createTurnCorrelation`, staging and commit functions.
- Mirror append helpers: `src/domain/mirrorAppendOutbox.ts`, receipt and outbox functions use correlation to find messages and source turn.
- Native struct: `src-tauri/src/main.rs`, `TurnCorrelation` mirrors schema `0.2.0`.
- Native validation: `src-tauri/src/main.rs`, `validate_turn_correlation` and `validate_persisted_turn_authority` validate correlation against dedicated thread and persisted projection.
- Native Mirror event extraction: `src-tauri/src/main.rs`, `read_latest_pi_mirror_commit_events` and `extract_pi_mirror_commit_events` filter by correlation.
- Frontend creation site: `src/app/App.tsx`, `generatePacket`, creates correlation only for live mode and ready Journey thread.
- Tests: `src/tests/threeBodyTurnCommit.test.ts`, `src/tests/mirrorAppendOutbox.test.ts`, `src/tests/dedicatedTurnAuthority.test.ts`, `src/tests/piProcessStream.test.ts`.

Persisted `TurnCorrelation` schema `0.2.0` does not contain `piSessionFile`. TS-1 preserves that schema unless implementation proves a migration is necessary and records a compatibility analysis before any schema change.

## Mode Characterization

`mockPiAgentStream` is the only non-dedicated runtime path in the app. It does not invoke `start_pi_invocation`, does not spawn Pi and does not need native Journey generation authority.

Every path that calls `livePiAgentStream` is a live dedicated path for TS-1 purposes. `safeTestMode` changes only the process or provider used for test execution; it does not remove the need for authority at the Tauri boundary. `invocationMode: raw` changes the prompt/runtime shape; it does not remove authority. Therefore every production `start_pi_invocation` call must require a valid `RunAuthority`.

TS-1 must not create a Tauri production path named or shaped as a non-dedicated test bypass without authority. Tests should either construct valid `RunAuthority` and exercise the live boundary, or test pure functions that do not call Tauri. Legacy mapper tests may continue as pure unit tests only when they are explicit about not representing production `start_pi_invocation` events.

## RunAuthority Contract

`RunAuthority` is a versioned runtime envelope constructed exactly once at the beginning of a live dedicated run. Its base is `TurnCorrelation`. Because `TurnCorrelation` schema `0.2.0` does not include `piSessionFile`, construction also consumes the validated live identity or active generation for `piSessionFile` and activation receipt evidence.

For live dedicated runs, `RunAuthority` requires:

- `schemaVersion` for the `RunAuthority` envelope;
- embedded or referenced `TurnCorrelation` schema `0.2.0`;
- `journeyId`;
- `runId`;
- `turnId`;
- `threadId`;
- `harnessConversationId`;
- `generation`;
- `piSessionId`;
- `piSessionFile` from validated live identity or active generation;
- `mirrorConversationId`;
- activation receipt evidence from the active generation;
- `harnessUserMessageId`;
- `harnessAssistantMessageId`.

After construction, runtime code must not keep mutable copies of these fields or recalculate them from selected Journey, current conversation, packet defaults, provider output or process events. The constructed `RunAuthority` is the authority source passed to backend validation, event projection, transcript inspection, Harness settlement and Mirror append preparation.

## Boundary Signature and Backend Pre-Spawn Validation

The planned production boundary for `start_pi_invocation` is:

```text
start_pi_invocation(prompt, config, runAuthority)
```

`journeyId`, `sessionId`, `sessionFile` and `correlation` must not continue as independent arguments capable of diverging from each other. After backend validation, `journeyId`, `runId`, `piSessionId` and `piSessionFile` are derived only from `RunAuthority`. If any duplicate argument must remain temporarily during TS-1 for compatibility, the implementation must document its removal inside TS-1, require exact equality with `RunAuthority` while it exists, and avoid adding new behavior that depends on the duplicate source.

Before spawning Pi, backend validation must prove:

- the run is live dedicated and therefore has `RunAuthority`;
- `RunAuthority` was constructed from `TurnCorrelation` plus validated live identity;
- `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` are present;
- the stored dedicated thread has the same Journey, active generation, Pi session, Pi session file, Mirror conversation and activation receipt;
- the persisted dedicated conversation projection matches the same live identity;
- no independent `journeyId`, `sessionId`, `sessionFile` or `correlation` argument is accepted as authority after `RunAuthority` exists;
- provider config snapshot exists in backend state but is not part of event authority.

Failure happens before spawn and leaves the global serial process slot available. TS-1 does not create a per-Journey registry.

## Event Authority Projection

TS-1 introduces a bounded event authority projection derived from `RunAuthority`. It may include only:

- `schemaVersion`;
- `journeyId`;
- `runId`;
- `turnId`;
- `threadId`;
- `generation`;
- `piSessionId`;
- `piSessionFile` when needed for settlement correlation;
- `mirrorConversationId`;
- Harness message IDs when needed by frontend reducers.

It must not include provider config, prompt content, assistant response content beyond the existing event `content`, private reasoning beyond existing event mapping, secrets, environment variables or arbitrary process metadata.

Events without authority in a live dedicated run are rejected before they can be reduced into current state. Rejection must not depend on the Journey currently selected in the UI. In TS-1, because execution remains serial and frontend state is not yet Journey-keyed, rejection may surface as a bounded run-level error attached to the validated serial `RunAuthority` or as ignored stale input, but it must not route by selected Journey as a substitute for authority. All process emit paths in production must receive authority by construction, avoiding authority-less `PiProcessEvent` from `start_pi_invocation`.

## Out of Scope

TS-1 does not introduce the per-Journey backend registry, directed cancel API, Journey-keyed frontend state, navigation during a run, concurrent persistence semantics, capacity 2, stable promotion or RS015 sidebar refinements.

TS-1 does not change persisted `TurnCorrelation` schema `0.2.0` unless a documented compatibility analysis proves that migration is required. If that happens, the implementation must stop and update the plan before changing persisted shape.

## TDD Plan

These tests should fail before implementation:

- `RunAuthority` construction rejects live dedicated input when `TurnCorrelation` is missing.
- `RunAuthority` construction rejects live dedicated input when `threadId` is missing.
- `RunAuthority` construction rejects live dedicated input when `mirrorConversationId` is missing.
- `RunAuthority` construction rejects live dedicated input when activation receipt evidence is missing.
- `RunAuthority` construction derives `piSessionFile` from validated live identity or active generation because `TurnCorrelation` does not contain it.
- `RunAuthority` construction rejects mismatched `session_file` and active-generation `piSessionFile`.
- Backend pre-spawn validation rejects a live dedicated run whose `RunAuthority` does not match the stored active generation.
- Backend pre-spawn validation rejects a live dedicated run whose persisted projection live identity does not match `RunAuthority`.
- Bounded `PiProcessEvent` projection includes Journey, run, turn, thread, generation, Pi session and Mirror conversation authority.
- Bounded `PiProcessEvent` projection does not include provider config, prompt, assistant response transcript beyond event content, secrets or environment variables.
- Live dedicated event mapping rejects events without authority before state reduction.
- Live dedicated stale event mapping rejects mismatched `runId` without consulting selected Journey.
- `safeTestMode` still requires valid `RunAuthority` at `start_pi_invocation`.
- `invocationMode: raw` still requires valid `RunAuthority` at `start_pi_invocation`.
- `mockPiAgentStream` remains the only non-dedicated runtime path and never calls `start_pi_invocation`.
- Tests either construct valid `RunAuthority` or exercise pure functions without Tauri bypass.
- Existing persisted `TurnCorrelation` schema `0.2.0` fixtures still parse and existing staged turns remain compatible.
- No test expects global concurrency above 1 in TS-1.

## Rollback

Rollback for TS-1 is to keep the existing global serial process execution while disabling the stricter live dedicated event authority projection. Persisted `TurnCorrelation` stays at schema `0.2.0`, so rollback must not require data migration. Any partially introduced `RunAuthority` code should be removable without touching stored dedicated thread, generation projection, Mirror append outbox or existing conversation reconciliation records.

## Done Criteria

TS-1 is done when the codebase has a single `RunAuthority` construction path for every `livePiAgentStream` run, `start_pi_invocation` receives `prompt`, `config` and one `RunAuthority` as its production authority boundary, backend pre-spawn validation requires the active generation evidence including `piSessionFile`, bounded process events carry run authority without provider config or private data, live dedicated events without authority are rejected, `mockPiAgentStream` remains the only non-dedicated runtime path, tests do not preserve an optional Tauri authority bypass, existing persisted turn records stay compatible and automated tests prove all of the above while global execution remains serial.

## Approval Boundary

This TS-1 plan is not approved yet. Implementation, `approve-plan`, TS-3 planning, concurrent execution, stable promotion and RS015 changes remain blocked.
