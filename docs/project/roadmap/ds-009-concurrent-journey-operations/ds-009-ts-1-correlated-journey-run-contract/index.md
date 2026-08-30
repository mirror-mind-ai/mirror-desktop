[< Parent](../index.md)

# DS-009.TS-1 — Correlated Journey Run Contract

**Status:** 🟡 Planned
**Type:** Technical Story
**Order:** 1 of 7
**Concurrency:** serial only
**Plan:** [plan.md](plan.md)
**Test guide:** [test-guide.md](test-guide.md)

## Outcome

Every live dedicated run has mandatory correlated authority before process start, and every process event, frontend reduction, settlement step and persistence action can prove the owning Journey, run, turn and generation/session authority while execution remains globally serial.

## Scope

- Inventory current call sites for `start_pi_invocation`, `cancel_pi_invocation`, `PiProcessEvent` and `TurnCorrelation`.
- Correct mode characterization: `mockPiAgentStream` is the only non-dedicated runtime path, and every `livePiAgentStream` path is live dedicated.
- Record that `safeTestMode` changes only the process/provider and `invocationMode: raw` changes only prompt/runtime; neither removes authority.
- Define one versioned `RunAuthority` envelope constructed once at run start.
- Use `TurnCorrelation` as the base authority.
- Add `piSessionFile` from the validated live identity or active generation because persisted `TurnCorrelation` schema `0.2.0` does not contain that field.
- Require `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` inside `RunAuthority` for live dedicated runs after active-generation validation.
- Avoid mutable authority copies or competing identity sources after construction.
- Plan `start_pi_invocation(prompt, config, runAuthority)` as the production boundary.
- Remove independent `journeyId`, `sessionId`, `sessionFile` and `correlation` authority arguments, or require exact equality while a temporary duplicate exists inside TS-1.
- Validate `RunAuthority` again in the backend before spawn.
- Ensure all production process emit paths receive authority by construction.
- Attach bounded event authority derived from `RunAuthority` to serial process events.
- Keep provider config snapshot backend-owned and absent from emitted process events.
- Exclude prompt, assistant response transcript, secrets and environment from event authority.
- Include explicit compatibility analysis before changing the persisted `TurnCorrelation` schema.
- Introduce stale and unauthoritative event rejection rules without enabling concurrency.
- Require tests to construct valid authority or exercise pure functions, not preserve a Tauri production bypass without authority.

## Acceptance Behavior

```text
Given a live dedicated run starts for a ready Journey generation
When the run is reserved and process events are emitted
Then authority comes from one RunAuthority built once from TurnCorrelation plus validated active-generation live identity
And missing, stale or mismatched authority fails before it can mutate Journey state
And no persisted TurnCorrelation schema change occurs without explicit compatibility analysis.
```

## Out Of Scope

- Raising the global concurrency limit above 1.
- Replacing the backend child registry.
- Migrating the full frontend runtime state model.
- Creating any production Tauri non-dedicated test path without authority.

## Validation

The detailed tests are in [test-guide.md](test-guide.md). Unit and native validation cover single construction, mandatory live correlation, `piSessionFile` derivation from active generation, `start_pi_invocation` boundary shape, mandatory live dedicated authority fields, backend pre-spawn validation, authority-bearing emit paths, event authority projection, missing authority rejection, stale run rejection, provider snapshot non-emission, persisted compatibility and guardrails for any future `TurnCorrelation` schema change.
