[< Story](index.md)

# Test Guide — DS-004

## Aggregate Validation

DS-004 passes when live local Pi invocations have explicit run state and can be cancelled or retried without restarting the app.

## Automated Validation

Run from the Harness project root:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

Pass condition:

- agent run state tests pass;
- Pi process stream cancellation mapping tests pass;
- existing provider, conversation, protocol, packet, stream, normalizer and rendering tests pass;
- TypeScript/Vite build succeeds;
- Tauri Rust shell compiles.

## Navigator Validation

Run the app:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm run tauri -- dev
```

Validate:

- App card shows `Run: idle` before invocation;
- after clicking `Invoke live Pi`, App card shows `Run: running`;
- live invocation controls prevent another concurrent run;
- `Cancel run` is enabled only while a live run is active;
- cancelling changes the run state to `cancelled`;
- chat content remains visible after cancellation;
- `Retry last` becomes enabled after cancellation or failure;
- retry starts a new run from the last user request;
- no Mission execution, file mutation, persistence or Mirror invocation happens.

## Fail Condition

DS-004 fails if:

- concurrent live runs can be started;
- cancellation requires restarting the app;
- cancellation deletes chat messages;
- retry is available while a run is still active;
- cancellation/retry persists state, mutates files, executes Missions or invokes Mirror.

## Validation Evidence

Initial local validation passed:

```text
npm test
9 test files passed, 31 tests passed

npm run build
tsc and vite build succeeded

cargo check
Tauri Rust shell compiled successfully
```
