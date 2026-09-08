[< Parent](../index.md)

# CV-007.DS-002.US-2 - Continue After Update or Rollback

**Status:** ✅ Done
**Type:** User Story

## User Story

As a Mirror Desktop user,
I want update success or rollback to preserve my Journey continuity,
So that self-update changes application bytes without disturbing my Mirror state.

## Outcome

The recovery contract explicitly preserves Mirror homes, `memory.db`, runtime binding, Journey registry and conversations, Mirror Desktop app data and Nautilus Harness state. Continuation after update or rollback is therefore scoped to launching the expected application version over the same durable state.

## Acceptance Behavior

```text
Given update apply succeeds or rollback is required
When the app continues after the operation
Then Journey continuity and runtime binding remain preserved
And rollback targets only last-known-good application bytes
And Mirror databases, credentials, identity and app data are not deleted or migrated
```

## Validation

`npm test -- src/tests/updateInstallation.test.ts` covers preservation targets in apply and rollback plans. `docs/update/trusted-self-update.md` documents the continuation boundary.
