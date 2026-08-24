[< Story](index.md)

# Test Guide — CV-002.DS-003.TS-3

## Automated Validation

### Runtime projection

Exercise full event sequences rather than isolated terminal events:

- success with all operations completed;
- success with an unresolved operation;
- `cancelled → done → agent_end → late operation_end`;
- `error → agent_end → done → late operation_end`;
- duplicate terminal events;
- operation updates after settlement;
- terminal state is never active.

Expected: first terminal state wins and no operation remains `preparing` or `running`.

### Agent-run state

Verify success, cancellation, and failure transitions are idempotent and cannot overwrite an existing terminal outcome. Retry remains available only after cancellation/failure.

### Process stream

Characterize:

- Rust process `cancelled → done` mapping;
- process error/non-zero exit `error → done` mapping;
- Pi assistant-stream error followed by `agent_end`;
- listener/setup failure emits `error` before `done`.

### Component

Render completed, cancelled, and failed projections with and without operations. Assert:

- terminal label/message is visible;
- no Working indicator or live dots remain;
- unresolved operations show inert terminal status;
- assistant content is not part of the runtime component;
- no carousel/history is introduced.

### Full checks

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

## E2E Decision

Required because settlement depends on the real Tauri process boundary and cancellation event order.

## Navigator Validation

### Success

Run the TS-1 Mirror prompt. Confirm `Working → Completed`; operations and response become static.

### Cancellation

Start a real Mirror run and cancel while it is active. Confirm `Cancelled`, no operation remains running, and the subsequent process `done` does not change the outcome.

### Failure

Temporarily set the provider executable to a definitely missing local command and invoke once. Confirm `Failed` is visible even without assistant/tool output and no Working animation remains. Restore provider defaults afterward.

## Pass Condition

Each route reaches exactly one visible terminal outcome; unresolved operations settle; late events do not change the result; no animation or activity survives settlement.

## Fail Condition

A terminal status is overwritten, an operation remains active, the failure/cancellation is represented only by an empty assistant shell, or Working survives termination.

## Validation Evidence

Automated implementation evidence:

- RED characterization failed in the expected terminal-precedence, unresolved-operation, terminal-visibility, and agent-run-idempotence cases.
- GREEN focused suite passed: 4 files, 27 tests.
- Full suite passed: 19 files, 97 tests.
- `npm run build` passed.
- `cd src-tauri && cargo check` passed.
- Rust source inspection confirmed the real cancellation order is `Cancelled → Done`; no Rust change was required.
- First Navigator success validation found `Working` persisted after assistant completion because `agent_end` had been suppressed while awaiting wrapper `done`.
- A regression test reproduced the event-boundary defect; Pi `agent_end` now settles success immediately while wrapper `done` remains idempotent.
- Post-fix full suite passed again: 19 files, 97 tests; build and Cargo check passed.

Navigator success re-test plus cancellation/failure E2E validation remain pending.
