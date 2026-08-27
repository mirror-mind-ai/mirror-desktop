[< Parent](../index.md)

# CV-004.DS-002.TS-1 — Atomic Dedicated Pair Provisioner

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to start one Nautilus-owned Journey thread without ambiguous partial authority,  
As the Harness native lifecycle boundary,  
I want an idempotent provisioner for one dedicated Pi session and one dedicated Mirror conversation,  
So that retries create exactly one recoverable native pair before readiness is published.

## Outcome

A Journey-scoped operation reserves generation 1, creates both native resources without a provider call, and either advances with exact returned IDs or remains rollback-safe/explicitly recoverable.

## Acceptance Behavior

```text
Given an absent Journey and one start operation
When native provisioning succeeds
Then exactly one Pi session and one Mirror conversation are created for that operation
And no provider request or transcript turn is created
```

```text
Given provisioning is retried, double-clicked or resumed
When the same operation runs again
Then it reuses its operation and owned native IDs
And no duplicate pair is created
```

```text
Given one native side fails
When the provisioner settles
Then ready authority is not published
And owned resources are safely rolled back or retained in an explicit recoverable state
```

## Scope

- Pure provisioning state machine and bounded failure codes.
- Journey/generation-scoped operation identity.
- Tauri/native adapter orchestration.
- Supported native Pi and Mirror creation boundaries.
- Idempotency, partial failure and application-restart recovery.
- Atomic handoff to activation; not final readiness by creation alone.

## Out Of Scope

- Provider invocation or synthetic initialization.
- Journey activation semantics and receipt verification (TS-2).
- Desktop interaction (US-1).
- Turn commit/repair (DS-003), restart generation (DS-004), legacy cleanup (DS-005).

## Expected Areas

- `src/domain/journeyThreadProvisioning.ts`
- `src/app/journeyThreadProvisioningStorage.ts`
- `src-tauri/src/main.rs`
- focused Vitest and Rust tests

## Validation

Characterize the supported native APIs first. Use controlled fakes to prove exact call counts, idempotency, partial failure recovery, no-provider behavior, cross-Journey confinement and preservation of legacy files.
