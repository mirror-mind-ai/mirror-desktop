[< Parent](../index.md)

# CV-007.DS-002.TS-2 - Update Quiescence Guard

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to protect live Journey work during self-update,
As the installation guard,
I want update apply blocked while unsafe native operations are active,
So that no Pi run, conversation commit, projection write or file snapshot is interrupted by application replacement.

## Outcome

`updateQuiescence` returns safe only when there are no active Pi runs, pending conversation commits, pending projection writes or active file snapshots. Any unsafe count returns a bounded blocked reason.

## Acceptance Behavior

```text
Given native update readiness is inspected
When all unsafe operation counts are zero
Then apply may continue to verified planning
When any unsafe operation is active
Then apply is blocked with a bounded reason
```

## Validation

`npm test -- src/tests/updateInstallation.test.ts` covers safe and blocked quiescence decisions.
