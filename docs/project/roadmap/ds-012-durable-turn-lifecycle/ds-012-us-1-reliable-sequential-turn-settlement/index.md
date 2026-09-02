[< Parent](../index.md)

# DS-012.US-1 — Reliable Sequential Turn Settlement

**Status:** 🟢 Done
**Type:** User Story

---

## User Story

As the Navigator,
I want to send successive messages in one Journey without restarting or repairing the app,
so that ordinary conversation is reliable before concurrency returns.

## Outcome

Admission, local conversation projection, Mirror outbox enqueue and successor-send eligibility become journal-owned at capacity one. A settled turn cannot leave or resurrect a stale route or lease that blocks the next exact run.

## Acceptance Behavior

```text
Given one Journey turn completes and reaches its durable successor-eligible checkpoint
When I send another message immediately
Then the new exact run is admitted
And the prior route, lease and frontend snapshot cannot block or mutate it.
```

```text
Given projection or outbox enqueue fails recoverably
When terminal evidence is already durable
Then the app exposes one bounded recovery action
And the draft or completed result is not silently lost.
```

## Scope

- Journal-owned serial admission.
- Idempotent local projection checkpoints.
- Exact bounded outbox enqueue checkpoint.
- Successor eligibility derived from journal state.
- Visible bounded failure and draft/result preservation.
- Deterministic repeated-turn and fault-seed tests.

## Out Of Scope

- Cold-start recovery across every frontier.
- Removing all compatibility inference.
- Capacity two.

## Validation

Automated repeated-turn and persistence fault tests are required. This story does not consume a separate desktop E2E session. Its visible behavior is batched with US-2 in the single planned serial-and-recovery DEV smoke after both stories are complete.
