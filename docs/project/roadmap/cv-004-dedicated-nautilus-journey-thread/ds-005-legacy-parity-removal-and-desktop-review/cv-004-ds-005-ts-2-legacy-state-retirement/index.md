[< Parent](../index.md)

# CV-004.DS-005.TS-2 — Legacy State Retirement

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

Known duplicated Harness parity projections are retired idempotently with bounded receipts, while native Pi/Mirror history, Journey semantics and dedicated generations remain untouched.

## Acceptance Behavior

```text
Given a valid parity-era Harness projection
When retirement runs
Then a private-content-free receipt is durable before projection removal
And retry converges
And no legacy IDs are adopted as dedicated authority
And native Pi/Mirror data remains byte-identical
```

## Guardrail

Unknown, malformed, linked or out-of-root state fails closed and is never deleted.
