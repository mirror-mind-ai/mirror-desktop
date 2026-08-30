[< Story](index.md)

# Test Guide — DS-009

## Aggregate Validation

DS-009 is validated only in the development desktop channel before any stable promotion. The expected channel evidence is:

```text
App name      Nautilus Harness Dev
Bundle        com.nautilus.harness.dev
Mirror code   $HOME/.mirror-journeys/mirror-mind/mirror-dev
Mirror home   $HOME/.mirror-minds/mirror-dev
Mirror user   mirror-dev
```

The stable app, stable app-data and production Mirror database must remain untouched during aggregate validation.

## Mandatory Story Order

Tests should accumulate in the same order as implementation:

1. TS-1 proves complete correlation while serial.
2. TS-3 proves Journey-keyed frontend state while serial.
3. US-1 proves navigation during execution while serial.
4. TS-2 proves backend registry with global limit 1.
5. TS-4 proves settlement and persistence guardrails with global limit 1.
6. US-2 raises and validates global limit 2.
7. US-3 validates cancellation, failure and settlement under real concurrency.

Concurrency must not be enabled before TS-4 passes.

## Child Work Packages

- DS-009.TS-1 — Correlated Journey Run Contract
- DS-009.TS-3 — Journey-Keyed Frontend Runtime State
- DS-009.US-1 — Navigate While Journeys Work
- DS-009.TS-2 — Per-Journey Tauri Process Registry
- DS-009.TS-4 — Concurrent Persistence Guardrails
- DS-009.US-2 — Operate Multiple Journeys Concurrently
- DS-009.US-3 — Targeted Journey Cancellation and Settlement

## Required Automated Coverage

Deterministic tests must prove the contract before desktop validation:

- `RunAuthority` is constructed once at run start from `TurnCorrelation` plus validated active-generation live identity;
- `piSessionFile` is required in `RunAuthority` for live dedicated runs even though it is not present in persisted `TurnCorrelation` schema `0.2.0`;
- `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` become mandatory after active-generation validation;
- no mutable authority copies or competing identity sources remain after `RunAuthority` construction;
- TS-1 includes compatibility coverage before any persisted `TurnCorrelation` schema change is attempted;
- live dedicated runs reject missing correlation before spawn;
- provider config snapshot is stored in the backend registry entry and not emitted in process events;
- a single app-level dispatcher routes events by authority without mounting one listener per run;
- listener mount and unmount do not duplicate event handling;
- stale or replaced-run events are discarded or quarantined separately and never become diagnostics inside the current run for the same Journey;
- frontend reducers keep run, stream, runtime projection, warnings, diagnostics, context usage, finalization and Mirror commit state keyed by Journey;
- interleaved events from two Journeys update only their owner state;
- runtime state cleanup does not remove active or finalizing Journeys;
- two simultaneous start attempts for the same Journey produce one reservation and one rejection;
- two simultaneous starts for different Journeys respect the injected global limit;
- spawn failure after reservation terminalizes idempotently, releases process capacity and clears or marks the Journey lease according to recoverability;
- backend start rejects a missing or mismatched `journeyId` plus `runId` pair;
- backend cancel requires `journeyId` plus `runId` and kills only the matching registry entry;
- cancellation versus done race converges to one terminal outcome;
- late removal or cleanup cannot delete a substituted run with a different `runId`;
- process death is detected, terminalized and cleaned up without leaking capacity;
- finalization can continue after the child has already released process capacity;
- Journey remains unavailable for a new run while finalization is pending;
- inability to create or enqueue the Mirror append outbox item keeps the Journey blocked;
- durable pending outbox after successful enqueue releases the Journey for a new invocation even when Mirror append remains recoverably pending;
- Mirror append success, retry, `existing` receipt and acknowledgement remain attached to the owning Journey;
- generation rollover rejects stale events, stale settlement and stale append attempts from a prior generation;
- app close with multiple children cancels or settles children through the same targeted registry path without corrupting Journey state;
- native lease inspection reports bounded running and finalizing leases without private prompts, responses or provider snapshots;
- dispatcher remount or reload reconciles inspected leases without duplicate listeners;
- finalization acknowledgement is idempotent when projection and outbox are already durable;
- missing durable recovery handle keeps the Journey blocked with a recoverable diagnostic;
- app restart uses persisted dedicated projection and outbox state as authority instead of trying to restore dead `Child` handles;
- rollback limit 1 and enabled limit 2 use the same registry implementation with injected limits in tests.

## Desktop Validation Route

Use two disposable Mirror Dev Journeys with ready dedicated Nautilus generations. Run the DEV app, start a live Pi-backed run in Journey A, switch to Journey B while Journey A is running, start a live Pi-backed run in Journey B, then observe both Journeys through stream, completion and persistence.

Cancel Journey A during one run while Journey B continues. Repeat with a controlled failure in Journey A while Journey B completes. Restart or roll over a Journey generation and confirm stale events from the prior generation do not mutate the replacement generation. Verify that durable local projection plus outbox enqueue releases the Journey even when Mirror append remains pending, and that missing outbox enqueue blocks the Journey until recovery. Reload or remount the frontend dispatcher and confirm lease inspection reconciles running or finalizing Journeys without duplicate event delivery. Restart the app after durable projection or outbox state exists and confirm recovery follows persisted projection/outbox authority rather than dead child handles.

## Navigator Validation

Expected observation: the DEV sidebar shows compact active state for both Journeys; navigation stays enabled; each Journey shows only its own deltas, runtime activity, warnings, diagnostics and terminal status; cancellation and failure are targeted; each completed answer persists to the owning generation projection and dedicated Mirror conversation; rollback to capacity 1 keeps the same directed APIs and correlated state.

Pass condition: automated checks pass and the DEV desktop route demonstrates two concurrent Journey runs with isolated event handling, targeted cancellation, isolated failure, correct Mirror append behavior, correct generation rollover behavior, outbox recovery semantics, app-close cleanup and no stable-channel mutation.

Fail condition: any event, assistant delta, operation, warning, diagnostic, terminal state, cancellation, settlement, Mirror append, outbox item or saved conversation is applied to the wrong Journey; stale events diagnose or mutate a replacement run; a second active or finalizing run is allowed in the same Journey; more than two global runs are allowed; concurrency is enabled before TS-4; rollback to limit 1 requires undoing the correlation contracts; or validation depends on promoting the stable app.

## Validation Evidence

Pending implementation and validation. This guide records the required route only; it is not validation evidence and does not approve implementation.
