[< Parent](../index.md)

# CV-004.DS-004.TS-1 — Generation Restart Transaction

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

One durable restart operation provisions and verifies the next dedicated native pair while the prior ready generation remains authoritative, then publishes closure, append and active-pointer movement atomically.

## Acceptance Behavior

```text
Given generation N is ready and has no unresolved turn
When restart provisions generation N+1
Then N remains unchanged until N+1 is fully verified
And one atomic publication closes N, appends N+1 and activates N+1
And failure or retry cannot create duplicate generations or native pairs
```

## Scope

- Durable restart operation and exact authority coordinates.
- Monotonic next-generation reservation.
- Idempotent Pi/Mirror pair creation and activation.
- Atomic thread transition and rollback-safe failure.
- Crash recovery and stale-result confinement.
- Characterize and isolate durable-empty Pi session persistence.

## Out of Scope

- History UI; TS-2/US-1.
- Old generation reactivation or deletion.
- Concurrent Journey restart; DS-009.

## Validation

Pure transition tables, controlled native-adapter failures and Rust persistence tests at every transaction boundary.
