[< DS-010](../index.md)

# DS-010.TS-2 — Atomic Mirror Mutation Gateway

**Status:** 🟢 Done
**Type:** Technical Story

---

## Technical Story

In order to preserve Mirror as canonical Journey authority,
As the native desktop boundary,
I want one model-free mutation gateway with verified registry publication,
So that the Harness never exposes partial or inferred Journey administration state.

## Outcome

A confined gateway validates exact authority, performs one canonical Mirror mutation, verifies native read-back, exports a bounded replacement registry and publishes it atomically to the Harness. Failure keeps both the prior canonical state and desktop projection recoverable.

## Acceptance Behavior

```text
Given a valid contracted mutation and expected registry version
When the gateway executes
Then Mirror commits exactly once and Harness swaps projection only after verified read-back.
```

## Scope

- Confined native command boundary.
- Atomic Mirror write and read-back verification.
- Registry export, validation and publication.
- Idempotency, rollback and sanitized receipts.
- No-provider characterization.

## Out Of Scope

- UI-specific forms or drag gestures.
- Broad database or filesystem access.
- Conversation, memory or thread mutation.

## Validation

Native integration tests prove success, stale authority, write failure, read-back contradiction, malformed export, retry and crash-boundary behavior without provider invocation.
