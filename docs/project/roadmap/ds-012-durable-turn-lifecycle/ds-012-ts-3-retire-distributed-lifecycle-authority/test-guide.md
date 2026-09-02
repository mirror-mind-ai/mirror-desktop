[< Story](index.md)

# Test Guide — DS-012.TS-3 Retire Distributed Lifecycle Authority

## Automated Authority Matrix

Focused tests must prove:

- completed, cancelled, spawn-failed and process-died settlement branches come only from an exact terminal journal record;
- stream errors, cancellation events, route closure and stale occupancy cannot select a durable outcome;
- journal terminal evidence, not Pi JSONL reconstruction, supplies execution IDs and final assistant output;
- admitted/running restart state without an exact live child becomes durably interrupted;
- a journal-free pending projection remains an explicit legacy gap without fabricated completion or interruption;
- cancellation intent persists before directed child control;
- successor admission is not blocked by stale frontend occupancy or projection heuristics;
- native capacity and same-Journey reservation still fail atomically with draft-preserving rollback;
- stale or replacement authority cannot read or advance another journal record;
- terminal evidence excludes prompts, raw Pi protocol events and encrypted reasoning payloads;
- dispatcher tombstones remain bounded transport quarantine and cannot settle or recover a turn.

## Characterization Gates

Retain the DS-009 tests for exact `RunAuthority`, directed cancellation, first-terminal-wins, stale callbacks, bounded shutdown, Journey-keyed runtime state, persistence serialization and route quarantine.

Retain DS-005 projection/outbox tests for atomic save, exact enqueue, generation-scoped receipt, acknowledgement and authority-free monotonicity.

## Commands

During implementation:

```bash
npm test -- src/tests/turnJournal.test.ts src/tests/conversationRestartLifecycle.test.ts src/tests/piProcessEventDispatcher.test.ts src/tests/piInvocationOccupancy.test.ts
cd src-tauri && cargo test turn_journal
```

At child completion:

```bash
npm test
npm run build
cd src-tauri && cargo test
cargo check
```

Run `git diff --check` and source guard searches proving removed helpers have no lifecycle callers.

## Desktop Policy

No desktop smoke is planned for TS-3. The accepted serial/restart smoke remains valid because this story narrows authority without adding a new desktop behavior. If implementation changes a user-visible or unproven desktop boundary, stop and request a revised smoke decision rather than rerunning automatically.

## Pass Condition

One exact journal record chooses every durable lifecycle branch; all other components are validated adapters or transport evidence. Capacity remains one, full deterministic suites pass, no transcript lifecycle reconstruction remains and no production coordinates are touched.
