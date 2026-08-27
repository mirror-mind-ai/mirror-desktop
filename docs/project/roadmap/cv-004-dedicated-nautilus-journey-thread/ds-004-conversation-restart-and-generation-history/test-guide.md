# Test Guide — CV-004.DS-004 Conversation Restart and Generation History

## Purpose

Prove that explicit restart creates one fresh dedicated generation without provider invocation, preserves the prior generation until atomic success, and resumes only the newest ready generation.

## Automated Coverage

### Pure restart transaction

- reserve exactly `activeGeneration + 1`;
- reject absent, inconsistent, inactive, stale or unresolved-turn authority;
- append one contiguous generation and close only the prior active generation;
- reject history rewrite, native-ID reuse, generation gaps and active-pointer regression;
- converge duplicate/retried requests on one operation;
- leave prior thread unchanged on every pre-publication failure.

### Native adapters and persistence

- characterize Pi durable-empty-session behavior;
- prove no provider request and no conversational entry;
- confine any versioned header adapter to the dedicated Pi directory;
- create/reuse exact Pi and Mirror resources for one restart operation;
- atomically replace the thread record;
- preserve generation-scoped Harness projections;
- recover from crash boundaries before and after native creation/publication.

### Desktop

- show explicit restart confirmation and consequences;
- show real model-free progress phases;
- prevent duplicate clicks;
- preserve current conversation on failure;
- open a fresh situated arrival surface after success;
- project bounded inactive-generation history;
- resume only the exact active generation after restart/reselection.

## Required Commands

```bash
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
```

Run relevant Mirror/Pi adapter tests if native integration changes.

## Navigator Validation

1. Use a Journey whose generation 1 contains at least one committed turn.
2. Open **Restart Conversation…** and inspect the confirmation copy.
3. Cancel once and confirm no state changes.
4. Confirm restart and observe model-free phases.
5. Confirm generation 1 remains visible until successful switch.
6. Confirm generation 2 opens empty with the situated arrival surface.
7. Confirm generation 1 is listed inactive with bounded metadata.
8. Return to generation 2 after switching Journeys or restarting the desktop.
9. Confirm no old message merged and no conversation picker appeared.
10. Inspect exact Pi/Mirror IDs and prove one pair exists for generation 2.
11. Exercise a controlled failure/retry and confirm generation 1 remains active until retry succeeds.

One aggregate Navigator acceptance occurs after all four child packages are implemented.

## Evidence Restrictions

Receipts may contain bounded Journey/thread/generation/operation/native IDs, names, timestamps, statuses and reason codes. They must not contain private context bodies, prompt/response text, reasoning, tools, secrets or arbitrary environment values.
