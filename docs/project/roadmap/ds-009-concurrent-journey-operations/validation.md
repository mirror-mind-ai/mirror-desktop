# Validation — DS-009

## Status

Passed

## Aggregate Outcome

All seven mandatory child stories are Done and collectively satisfy the Delivery Story outcome:

| Child | Aggregate contribution | Closure evidence |
| --- | --- | --- |
| DS-009.TS-1 | Immutable start-captured `RunAuthority` and correlated process-event authority while execution remained serial | Done |
| DS-009.TS-3 | Journey-keyed frontend runtime, event, diagnostics and presentation state | Done |
| DS-009.US-1 | Navigation and Journey-keyed drafts while serial work continues | Done |
| DS-009.TS-2 | Exact `journeyId + runId` native registry, directed control and bounded inspection at limit 1 | Done |
| DS-009.TS-4 | Per-Journey settlement queues, durable persistence frontiers, outbox isolation and model-free recovery at limit 1 | Done |
| DS-009.US-2 | Exactly two concurrent different-Journey runs, atomic native admission and blocked third-Journey submission | Done |
| DS-009.US-3 | Owner-targeted cancellation/process death, first-terminal precedence, sibling-safe settlement and bounded shutdown/restart | Done |

The staged order was preserved. Capacity was not raised to 2 until TS-4 was complete. The selected Journey remains presentation-only; start-captured authority governs events, control, settlement and persistence.

## Definition Of Done

- Two different Journeys can execute Pi-backed work concurrently.
- At most one reserved, running or finalizing lease exists per Journey and at most two global children exist.
- Events, reasoning/runtime activity, deltas, warnings, diagnostics and terminal outcomes remain Journey-keyed.
- Cancellation, process failure, cleanup, settlement and persistence target exact `journeyId + runId` authority.
- Durable projection/outbox frontiers and per-Journey queues prevent cross-owner writes.
- Shutdown controls at most two captured exact handles outside the registry lock.
- Restart restores no dead child or phantom route and performs only exact model-free recovery.
- Rollback changes only `PRODUCTION_PI_PROCESS_LIMIT` from `2` to `1`; directed APIs and isolation contracts remain.

All conditions are satisfied by the child closure artifacts, accepted DEV validation and current architecture.

## Parent-Level Checks

- `npm test`: 82 files, 461 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 73 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --features development-channel`: 73 tests passed.
- Markdown links, schema/capacity/static scope and `git diff --check`: passed.
- Production capacity has one private definition: `PRODUCTION_PI_PROCESS_LIMIT: usize = 2`.

No new implementation, DEV process signalling, fault scenario or stable app-data mutation was used for parent validation.

## Accepted Child Evidence

US-2 proved two natural concurrent direct children, owner-correct completion, third-Journey capacity blocking, empty outbox and safe restart. US-3 proved visible exact cancellation and exact-child process death while the sibling completed naturally, plus bounded two-child shutdown and model-free independent restart classification. Stable app-data and production Mirror remained unchanged during accepted DEV validation.

## Missing Evidence

- none
