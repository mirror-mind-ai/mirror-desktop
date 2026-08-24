[< Story](index.md)

# Test Guide — CV-002.DS-004.US-3

## Purpose

Prove that a Nautilus-origin turn is durably correlated across Harness, Pi and Mirror; that normal success is quiet; and that partial Mirror failure is visible and idempotently recoverable without model execution.

## Automated Validation

### Harness

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

### Mirror

Use `uv run` for targeted and affected Python suites. At minimum:

```bash
uv run pytest tests/unit/memory/cli/test_conversation_logger.py
uv run pytest tests/unit/memory/cli/test_conversation_logger_discard.py
```

Run any extension-specific contract suite added by implementation.

## Contract Scenarios

### 1. Correlation payload

Expected:

- one `turnId` and `runId` are generated before Pi spawn;
- Journey, Harness conversation, Pi session and generation match TS-6 authority;
- only allowlisted non-secret ids enter the child environment;
- mismatched or malformed authority is rejected before spawn.

### 2. Structured commit parsing

Exercise user/assistant committed and failed events plus malformed, wrong-version, wrong-turn and ANSI-contaminated lines.

Expected:

- certified events become dedicated stream events;
- mismatches become bounded diagnostics/errors;
- no event becomes assistant text, operation output, Ariad activity or reasoning;
- no raw traceback/content is persisted.

### 3. Mirror idempotency

Write the same correlated user and assistant records twice.

Expected:

- deterministic native ids are stable;
- message count increases once per role;
- duplicate returns the existing ids;
- collision with different authority/role/content is rejected;
- uncorrelated terminal logging remains backward compatible.

### 4. Successful three-body commit

Send one short command from Nautilus.

Expected:

- staged reconciliation is durable before spawn;
- native Pi user/assistant and Mirror user/assistant ids are captured;
- Harness evidence commits after terminal settlement;
- aggregate classification becomes `in_sync`;
- initial Mirror conversation id is atomically bound when necessary;
- no permanent sync notice or duplicate Mirror record appears.

### 5. Mirror user failure

Inject failure before the Mirror user write.

Expected:

- Pi may continue and its answer remains visible if the provider succeeds;
- Mirror state is pending/failed, never falsely synchronized;
- the notice appears after settlement;
- Retry writes the eligible missing records once without invoking Pi/provider.

### 6. Mirror assistant failure

Allow user commit and inject assistant failure.

Expected:

- proven user evidence remains;
- assistant failure is actionable;
- Retry writes only the assistant record;
- duplicate retry is a no-op success.

### 7. Relaunch recovery

Relaunch with unresolved and already-repaired turns.

Expected:

- status lookup runs only for unresolved Nautilus turns;
- native Mirror evidence completes the local ledger when already present;
- still-missing evidence keeps the notice;
- synchronized conversations perform no repair query.

### 8. Cancellation and provider failure

Cancel before assistant completion and induce a provider failure.

Expected:

- no fabricated Harness/Mirror assistant commit;
- partial native evidence is retained honestly;
- Retry is disabled when no eligible durable assistant exists;
- first-terminal-outcome semantics remain latched.

### 9. Spawn/pre-agent failure

Fail preparation or process spawn before Pi starts.

Expected:

- visible conversation returns to its prior state;
- no correlated completed turn is invented;
- no Mirror repair action appears.

### 10. Sanitization

Inspect persisted reconciliation, environment, protocol events, diagnostics and UI.

Expected:

- no prompt, response content, token, secret, private reasoning or arbitrary environment appears in correlation metadata;
- UI reveals only bounded state/reason and action;
- reasoning summaries remain ephemeral.

## Navigator E2E Route

1. Send a short successful command and confirm no sync notice remains.
2. Verify sanitized evidence shows one correlated user/assistant pair in Harness, Pi and Mirror.
3. Quit the dev app and relaunch it from the Harness root with `NAUTILUS_MIRROR_TEST_FAIL_PHASE=assistant npm run tauri dev`. This hook is explicit, development-only and not persisted.
4. Send a second command; confirm the Pi answer remains and the incomplete-commit notice appears.
5. Press `Retry`; confirm the notice disappears without a new Pi run or provider usage.
6. Relaunch around one unresolved boundary and confirm recovery remains deterministic.

## Pass Condition

All automated checks pass; successful turns are quiet and exactly-once; partial Mirror failures are honest and recoverable; Retry invokes neither Pi nor provider; relaunch resolves native evidence; and no sibling US-4/US-5 behavior is introduced.

## Fail Condition

Any turn is declared synchronized without native evidence; Mirror duplicates messages; logging failure discards the Pi answer; Retry reruns the model; relaunch silently loses partial state; cancellation fabricates assistant completion; correlation leaks content/secrets; or permanent success noise appears.
