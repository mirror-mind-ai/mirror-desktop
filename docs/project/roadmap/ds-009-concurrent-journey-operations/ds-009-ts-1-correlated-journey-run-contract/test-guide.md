[< Story](index.md)

# Test Guide — DS-009.TS-1

## Validation Scope

TS-1 validates correlation only. Execution remains globally serial. The per-Journey backend registry, navigation during run, Journey-keyed frontend state, concurrency limit 2, TS-3 and RS015 are out of scope.

## Tests That Must Fail Before Implementation

- `RunAuthority` construction rejects live dedicated input when `TurnCorrelation` is missing.
- `RunAuthority` construction rejects live dedicated input when `threadId` is missing.
- `RunAuthority` construction rejects live dedicated input when `mirrorConversationId` is missing.
- `RunAuthority` construction rejects live dedicated input when activation receipt evidence is missing.
- `RunAuthority` construction derives `piSessionFile` from validated live identity or active generation because `TurnCorrelation` schema `0.2.0` does not contain it.
- `RunAuthority` construction rejects mismatched temporary `session_file` and active-generation `piSessionFile` if duplicate arguments still exist during TS-1 migration.
- `start_pi_invocation` production boundary accepts `prompt`, `config` and one `RunAuthority` authority envelope.
- `start_pi_invocation` does not accept independent `journeyId`, `sessionId`, `sessionFile` or `correlation` as authority after `RunAuthority` exists.
- Any temporary duplicate boundary argument requires exact equality with `RunAuthority` and is documented for removal inside TS-1.
- Backend pre-spawn validation rejects a live dedicated run whose `RunAuthority` does not match the stored active generation.
- Backend pre-spawn validation rejects a live dedicated run whose persisted projection live identity does not match `RunAuthority`.
- Bounded `PiProcessEvent` projection includes Journey, run, turn, thread, generation, Pi session and Mirror conversation authority.
- Bounded `PiProcessEvent` projection excludes provider config, prompt, assistant response transcript beyond event content, secrets and environment variables.
- Live dedicated event mapping rejects events without authority before state reduction.
- Live dedicated stale event mapping rejects mismatched `runId` without consulting selected Journey.
- Every production emit path for `start_pi_invocation` receives authority by construction and cannot create authority-less `PiProcessEvent`.
- `mockPiAgentStream` remains the only non-dedicated runtime path and never invokes `start_pi_invocation`.
- `safeTestMode` still requires valid `RunAuthority` because it changes the process/provider only.
- `invocationMode: raw` still requires valid `RunAuthority` because it changes prompt/runtime only.
- Tests either construct valid `RunAuthority` or test pure functions; no Tauri production bypass without authority is preserved.
- Existing persisted `TurnCorrelation` schema `0.2.0` fixtures still parse.
- Existing staged turns, Mirror append outbox items and conversation reconciliation records remain compatible.
- Global execution remains serial and tests do not require a second simultaneous child process.

## Suggested Test Locations

- `src/tests/dedicatedTurnAuthority.test.ts` for frontend authority construction around ready active generations.
- `src/tests/threeBodyTurnCommit.test.ts` for persisted `TurnCorrelation` compatibility.
- `src/tests/piProcessStream.test.ts` for bounded event mapping and rejection of unauthoritative live dedicated events.
- `src/tests/agentRun.test.ts` or a new focused runtime authority reducer test for stale run rejection without selected-Journey fallback.
- `src-tauri/src/main.rs` tests for backend pre-spawn validation, active generation checks and event authority projection.

## Navigator Validation

Expected observation: there is no user-visible concurrency yet. The app should behave as before in serial live runs, but the implementation evidence should show that every live dedicated run has `RunAuthority` before spawn and every process event used by the frontend carries bounded authority.

Pass condition: all TS-1 automated tests pass, existing persisted correlation fixtures remain valid, no persisted `TurnCorrelation` schema migration was required, `mockPiAgentStream` remains the only non-dedicated runtime path, `safeTestMode` and `invocationMode: raw` still require authority at the live boundary, and a serial live dedicated run still completes through the existing Harness, Pi and Mirror settlement path.

Fail condition: a live dedicated run can spawn without `RunAuthority`, `start_pi_invocation` keeps independent diverging authority arguments, authority is rebuilt from selected Journey after run start, `piSessionFile` is treated as if it already existed in `TurnCorrelation 0.2.0`, process events expose provider config or private data, unauthoritative events reduce into live state, a Tauri production test bypass without authority is introduced, existing persisted turns break, or implementation enables concurrency before TS-4.

## Evidence

Pending implementation. This guide is planning only and does not approve TS-1 implementation.
