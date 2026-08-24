[< Story](index.md)

# Test Guide — CV-002.DS-003.TS-1

## Automated Validation

1. Parse every line in `evidence/*.sanitized.jsonl` as JSON.
2. Assert no persisted event has a `thinking_start`, `thinking_delta`, or `thinking_end` subtype.
3. Assert the baseline evidence contains run lifecycle and assistant text events but no tool execution.
4. Assert the Mirror evidence contains tool execution start/end for `read` and `bash`, tool updates, assistant text deltas and a Mirror surface-presence flag.
5. Assert `reference-run.md` documents Pi interactive source behavior and current Nautilus mapping.
6. Assert `minimal-event-contract.md` defines run settlement, assistant separation, operation upsert by tool-call id and private-reasoning exclusion.
7. Confirm no application source or UI file is part of this story's intended change set.

## E2E Decision

required unless Navigator explicitly accepts a narrower fixture-level validation route

## Navigator Validation

Read:

```text
reference-run.md
minimal-event-contract.md
```

Expected observation: the evidence explains why the current banner produces many outputs from one Pi operation and defines a smaller projection contract that matches Pi's stateful renderer.

Pass condition: the Navigator agrees that `CV-002.DS-003.TS-2 — Ordered Runtime Projection` is the smallest next implementation slice and that context percentage/compaction remain in `DS-004`.

Fail condition: the contract still proposes a rotating event history, imports unrelated Pi features, stores private thinking payload, or cannot explain how one Pi tool execution maps to one Nautilus operation.

## Validation Evidence

- Two live Pi JSON reference runs captured and structurally sanitized.
- Pi interactive and JSON-mode source paths inspected.
- Current Nautilus bridge and runtime activity model inspected.
- Application code/UI unchanged by this story.
