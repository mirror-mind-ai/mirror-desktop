[< Parent](../index.md)

# CV-007.DS-002.TS-3 - Atomic Apply and Last-Known-Good Recovery

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to recover from failed update application or launch verification,
As the updater apply boundary,
I want an apply plan that preserves the current application as last-known-good,
So that rollback targets previous application bytes without touching Mirror state.

## Outcome

`createUpdateApplyPlan` defines the safe apply sequence after verification, and `createRecoveryPlan` targets only the last-known-good application path while preserving Mirror homes, databases, runtime binding, Journey data, app data and Nautilus Harness state.

## Acceptance Behavior

```text
Given a staged artifact has been verified
When an apply plan is created
Then it names staging, last-known-good and expected version verification
And it preserves Mirror and predecessor state
When recovery is needed
Then rollback restores from last-known-good application bytes only
```

## Validation

`npm test -- src/tests/updateInstallation.test.ts` covers apply-plan and recovery preservation targets.
