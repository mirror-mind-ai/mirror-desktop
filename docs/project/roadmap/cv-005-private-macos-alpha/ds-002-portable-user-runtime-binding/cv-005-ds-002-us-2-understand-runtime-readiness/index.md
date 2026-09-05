[< Parent](../index.md)

# CV-005.DS-002.US-2 - Understand Runtime Readiness

**Status:** 🟠 In Progress
**Type:** User Story

## User Story

As a Mirror Desktop user,
I want a precise explanation of runtime readiness,
So that I can repair a missing or incompatible local prerequisite without an unexpected application exit or silent fallback.

## Outcome

Runtime Settings distinguishes unbound, invalid, incompatible and validated states and gives a bounded corrective route for root, home, user, database, Core, `pi` and `uv`.

## Acceptance Behavior

```text
Given my runtime binding is absent or invalid
When Mirror Desktop starts or revalidates it
Then the application remains available for diagnosis and repair
And each failed coordinate has an actionable non-secret status
And Journey import, mutation, Pi and Mirror actions remain unavailable
When every coordinate validates
Then the readiness surface says Validated and dependent actions become available
```

## Scope

- Typed readiness presentation in Runtime Settings.
- Recoverable unbound startup.
- Per-coordinate status and corrective guidance.
- Explicit gating of Mirror-dependent actions.
- Redacted diagnostics suitable for validation reports.

## Out Of Scope

- Automatic repair or runtime update.
- Provider authentication.
- Reading identity or conversation data to diagnose configuration.
- General first-run onboarding beyond the runtime binding.

## Validation

Component tests cover every readiness state and action gate. Desktop E2E confirms the app remains open through missing and incompatible fixture configurations.
