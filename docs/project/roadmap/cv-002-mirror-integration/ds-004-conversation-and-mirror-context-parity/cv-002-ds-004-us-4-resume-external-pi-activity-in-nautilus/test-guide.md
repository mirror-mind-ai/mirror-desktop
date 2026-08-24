[< Story](index.md)

# Test Guide — CV-002.DS-004.US-4

## Automated Validation

Run:

```text
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Prove:

1. file metadata fast path returns unchanged without parsing;
2. changed exact JSONL is parsed off the UI thread;
3. startup, window focus/visibility and Journey activation coalesce;
4. only complete descendant user/assistant turns are projected;
5. multiple turns preserve native order and deterministic ids;
6. repeated checks are idempotent;
7. partial/truncated tails remain waiting;
8. tool/custom/compaction/reasoning content remains non-chat;
9. stale generation, replaced file, missing base leaf, non-descendant ancestry,
   local message divergence and cross-session evidence block mutation;
10. stale async results after Journey switching are discarded;
11. projected persistence preserves Imported Activity, Journey preferences,
    context stats and certified mode;
12. observation invokes neither Pi nor provider.

## E2E Decision

Required. Fixture-only validation cannot prove that desktop focus recovery remains
responsive or that the exact terminal-advanced branch is projected.

## Navigator Route

### Scenario A — Focus recovery

1. Open Journey A in Nautilus and record its visible last turn.
2. Move Nautilus to the background.
3. Continue the exact mapped Pi session in terminal with one user/assistant turn.
4. Return focus to Nautilus.
5. Confirm the window is immediately interactive.
6. Confirm the external turn appears once, in order, without a run/provider state.
7. Blur/refocus again and confirm no duplicate.

### Scenario B — Journey activation

1. Keep Nautilus active on Journey B.
2. Advance Journey A's exact Pi session in terminal.
3. Switch Nautilus to Journey A.
4. Confirm the external turn appears once after Journey A loads and Journey B is
   untouched.

### Scenario C — Relaunch

1. Close Nautilus.
2. Advance the exact Pi session.
3. Relaunch Nautilus with the Journey restored.
4. Confirm normal startup is not blocked and the turn projects asynchronously.

### Scenario D — Partial and conflict safety

1. Exercise a fixture/exact test session ending in a user message or truncated
   final JSONL line; confirm no partial assistant appears.
2. Exercise non-descendant or locally divergent evidence.
3. Confirm no visible messages are overwritten/interleaved and the compact
   external-Pi reconciliation notice appears.

## Expected Observation

Unchanged focus checks are imperceptible. Safe descendant turns appear quietly
and once. Partial turns wait. Ambiguous/divergent state becomes actionable but
never mutates the conversation.

## Pass Condition

- focus recovery remains responsive;
- startup/focus/Journey triggers all work and coalesce;
- exact descendant turns project once in Pi order;
- no Pi/provider process runs;
- no cross-Journey leakage occurs;
- conflict/partial behavior follows the safety contract.

## Fail Condition

- focus waits on file I/O;
- unchanged checks visibly disturb the UI;
- a turn duplicates, reorders or imports reasoning/tool content;
- an incomplete or non-descendant turn is projected;
- another Journey changes;
- local state is overwritten;
- inspection starts Pi/provider or scans unrelated sessions.

## Validation Evidence

Pending implementation and Navigator validation.
