# Delivery Story Plan — DS-009

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** story_by_story
**Plan state:** pending Navigator approval

## Delivery Story

Concurrent Journey Operations

## Objective

Enable bounded concurrent Journey operations by introducing correlated run authority, Journey-keyed frontend and backend runtime state, targeted cancellation, isolated settlement and per-Journey persistence while preserving a concrete rollback path to global concurrency limit 1 and validating only in the DEV channel before any stable promotion.

## Mandatory Execution Order

The child stories must be executed in this order. Concurrency must not be enabled before TS-4 is complete.

1. DS-009.TS-1 — Correlated Journey Run Contract: complete correlation while execution remains serial.
2. DS-009.TS-3 — Journey-Keyed Frontend Runtime State: migrate frontend runtime state while execution remains serial.
3. DS-009.US-1 — Navigate While Journeys Work: allow navigation during execution while execution remains serial.
4. DS-009.TS-2 — Per-Journey Tauri Process Registry: introduce the backend registry while the global process limit remains 1.
5. DS-009.TS-4 — Concurrent Persistence Guardrails: harden settlement and persistence while the global process limit remains 1.
6. DS-009.US-2 — Operate Multiple Journeys Concurrently: only then raise capacity to 2.
7. DS-009.US-3 — Targeted Journey Cancellation and Settlement: validate cancellation, failure and settlement under real concurrency.

## Scope

DS-009 delivers bounded local concurrency for Pi-backed Journey work through a staged migration that proves authority and isolation before allowing more than one simultaneous child process.

The initial local concurrency limit after enablement is exactly two active Pi executions across the app. The per-Journey limit is exactly one active execution. The rollback capacity is exactly one global active Pi execution while preserving all correlated APIs and Journey-keyed contracts.

The implementation must model a single `RunAuthority` structure constructed once at the beginning of the run. Its base is `TurnCorrelation`, but `TurnCorrelation` schema `0.2.0` does not currently contain `piSessionFile`. `RunAuthority` therefore derives correlation fields from `TurnCorrelation` and derives `piSessionFile` from the validated live identity or active generation used to authorize the run. After validation against the active generation, `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` are mandatory inside `RunAuthority` for live dedicated runs.

`RunAuthority` must not keep mutable copies or competing authority sources after construction. Runtime code may pass, serialize or project the constructed authority, but it must not recalculate individual identity fields from selected Journey, current conversation state, provider callbacks or event payloads. TS-1 must include an explicit compatibility analysis before changing the persisted `TurnCorrelation` schema; DS-009 planning does not authorize changing that persisted schema.

Provider configuration is captured as an immutable backend-owned snapshot at run start. It belongs to the process registry entry and must not be emitted in Tauri process events. Later Settings or Journey override changes affect only future runs.

The backend registry is keyed by `journeyId`. Each entry owns exactly one `RunAuthority`, one `runId`, one child process, one cancellation state, one terminalization state and one provider config snapshot. Start and cancel commands require both `journeyId` and `runId`. A command targeting a missing entry, wrong `runId`, inactive generation or mismatched session authority fails closed.

Every process event must carry `RunAuthority` or the bounded event authority derived from it: `journeyId`, `runId`, `turnId`, `threadId`, `generation`, `piSessionId`, `piSessionFile` when available, and `mirrorConversationId`. Frontend reducers must reject late events, events without authority, events for replaced runs and events whose generation or session no longer matches the owning Journey conversation.

Event dispatch must be central. The frontend should not mount one independent Tauri listener per run that receives every event. A single app-level dispatcher listens once, validates event authority, routes to Journey-keyed runtime state and closes cleanly on unmount. Stale events or events for a substituted run must not become diagnostics inside the current run for the same Journey. They are either discarded or written to a bounded diagnostic quarantine separated from current Journey run state.

Settlement and persistence always use the authority captured at run start. They must never use the Journey currently selected in the UI as destination authority. Saves and finalization are serialized per Journey so two background completions cannot overwrite a generation projection or Mirror append state for the same Journey.

## Native Run Lifecycle

Each native run follows an explicit lease lifecycle:

1. Construct `RunAuthority` once from `TurnCorrelation` plus validated active-generation live identity before registry reservation.
2. Atomically reserve `journeyId + runId` before spawn by inserting the registry entry with its `RunAuthority` and provider snapshot.
3. Reject concurrent start if the same Journey has an active or finalizing lease, or if the global capacity limit is reached.
4. Spawn the process only after reservation succeeds.
5. On every mutation or removal of a registry entry, compare the expected `runId`; stale cleanup cannot remove a substituted run.
6. Terminalization is idempotent. Repeated `done`, cancellation, process death or error signals may converge the same run, but cannot create a second terminal outcome.
7. Release process capacity when the child terminates, even if the Journey remains finalizing.
8. Keep the Journey unavailable for a new run while local finalization is pending.
9. Release the Journey lease only after durable local projection and successful enqueue of the Mirror append outbox item. The actual Mirror append may remain recoverably pending without blocking the next invocation.
10. Keep the Journey blocked if the outbox item cannot be created or enqueued, because there is no durable recovery handle for the completed answer.
11. Clear the finalization lease through explicit acknowledgement from the frontend or settlement coordinator after durable projection and outbox enqueue are confirmed.
12. Treat spawn failure after reservation, cancellation versus done races and process death as first-class lifecycle paths with deterministic cleanup.

## Lease Recovery

The native registry must expose bounded inspection of running and finalizing leases. The inspection surface reports only run identity, Journey identity, lifecycle phase, terminalization state, finalization state and recovery diagnostics; it does not expose prompts, responses, provider snapshots, secrets or arbitrary process environment.

Frontend dispatcher remount or reload must reconcile inspected leases through the same central dispatcher without adding duplicate listeners. A remounted dispatcher reattaches to the shared event source, rebuilds Journey-keyed runtime projections from bounded lease inspection plus durable projection/outbox state, and does not attempt to own one listener per run.

Finalization acknowledgement is idempotent. If durable local projection and outbox enqueue already exist, the acknowledgement may be repeated and should leave the Journey released. If no durable recovery handle exists, the Journey remains blocked with a recoverable diagnostic until projection or outbox recovery succeeds. App restart uses persisted dedicated projection and outbox state as authority; it does not try to restore dead `Child` handles or infer process continuity from stale native handles.

## Phased Migration

- TS-1 lands full correlation while the runtime remains serial.
- TS-3 moves frontend runtime state to Journey-keyed reducers while the runtime remains serial.
- US-1 reopens Journey navigation while execution remains serial.
- TS-2 replaces the global backend child slot with the registry while keeping global limit 1.
- TS-4 moves settlement and persistence to captured-authority finalization while keeping global limit 1.
- US-2 raises the internal capacity constant to 2.
- US-3 validates selective cancellation, failure and settlement under real two-Journey concurrency.

Rollback is concrete and capacity-only. The registry accepts an injected limit in tests so the same implementation is exercised with limit 1 and limit 2. Production capacity is defined in one internal profile or constant. There is no arbitrary environment override. Rolling back means changing only that internal capacity from 2 to 1 while preserving `RunAuthority`, correlated events, Journey-keyed state, directed start/cancel APIs and captured-authority settlement.

## Non-Goals

DS-009 does not introduce more than two concurrent Pi executions, remote orchestration, multi-user coordination, provider-specific scheduling, Journey-specific provider settings beyond the existing override model, new Mirror capabilities, imported conversation reconciliation, context accounting redesign, Pi compaction redesign, release automation or stable-app promotion.

DS-009 does not alter `RS015`. Sidebar organization and personalization refinements remain parked and out of this Delivery Story except for the minimal running-state indicator required by concurrent operations.

DS-009 does not approve this plan, start implementation, push, release, deploy or promote the application. Stable promotion remains a later explicit Navigator gate after DEV validation.

## Acceptance Behavior

```text
Given TS-1 through TS-4 are complete under global limit 1
When the internal capacity is raised to 2 in US-2
Then two different Journeys can run concurrently
And the same Journey still cannot start a second active or finalizing run.
```

```text
Given a live dedicated run starts
When backend and frontend exchange events
Then each event routes through the central dispatcher by RunAuthority
And selected Journey never determines the mutation target.
```

```text
Given a child process terminates before Mirror append completes
When durable local projection and outbox enqueue succeed
Then process capacity is released
And the Journey lease is released for another invocation
And the pending Mirror append remains recoverable through the outbox.
```

```text
Given durable local projection succeeds but outbox enqueue fails
When the run reaches finalization
Then the Journey remains blocked
And the app exposes recovery state instead of allowing a new invocation without a durable append handle.
```

```text
Given a stale cleanup or late event arrives for an old runId
When a replacement run exists for the same Journey
Then the stale signal cannot mutate, remove or diagnose the current run
And it is discarded or quarantined outside current run state.
```

## Validation Route

Aggregate validation is required in the development desktop channel only. The validation route must use **Nautilus Harness Dev** with bundle `com.nautilus.harness.dev`, Mirror Dev coordinates and disposable development Journeys. No stable app promotion is part of DS-009 validation.

Expected Navigator observation: in the DEV app, after TS-4 and US-2, two different Journeys can show active work at the same time; switching between them shows the correct live or completed content; cancelling or failing one does not alter the other; Mirror append and outbox notices remain attached to the owning Journey; restarting or rolling over a Journey generation does not absorb late events from the prior run.

Pass condition: automated checks pass, the DEV desktop route demonstrates concurrent Journey A and Journey B execution with isolated events and persistence, and no stable app files, stable app-data or production Mirror database are touched.

Fail condition: any event, assistant delta, runtime projection, warning, cancellation, settlement, Mirror append, outbox item or saved conversation lands in a Journey other than the start-captured owner; a second run can start inside the same Journey; global concurrency exceeds 2; concurrency is enabled before TS-4; a late event mutates or diagnoses a replacement run; rollback to limit 1 requires reverting the correlation contracts; or validation requires stable-channel promotion.

## Test Strategy

Unit and integration tests should be written around pure reducers, central event dispatch and bounded native command contracts before desktop validation. Required coverage is defined in `test-guide.md` and includes deterministic interleavings, simultaneous starts, spawn failure after reservation, cancellation versus done, stale cleanup, process death, finalization after child capacity release, failed outbox enqueue, durable pending outbox release, listener mount/unmount, runtime cleanup, app close with multiple children and limit 1/limit 2 using the same implementation.

## Implementation Contract

Work remains under the child packages listed above and in the mandatory order. Behavior changes require TDD. Each phase must leave the app coherent and testable before moving to the next phase. Do not silently expand scope into RS015, provider settings redesign, Mirror runtime changes, stable promotion or release work.

The plan is not approved. Implementation remains blocked until the Navigator explicitly approves the relevant story plan through Ariad. No child story is started by this aggregate planning document.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
