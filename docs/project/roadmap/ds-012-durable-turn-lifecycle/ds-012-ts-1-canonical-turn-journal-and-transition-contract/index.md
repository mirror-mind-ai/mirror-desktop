[< Parent](../index.md)

# DS-012.TS-1 — Canonical Turn Journal and Transition Contract

**Status:** 🟢 Done
**Type:** Technical Story

---

## Technical Story

In order to give each dedicated turn one durable biography,
as the Harness lifecycle boundary,
I want a bounded exact-authority journal and validated transition contract,
so that every later execution, projection, delivery and recovery decision starts from one canonical record.

## Outcome

Harness can durably create, inspect and advance one versioned turn record per exact `RunAuthority` under per-Journey serialization. The journal initially runs in shadow comparison at capacity one and does not yet control user-visible admission or settlement.

## Acceptance Behavior

```text
Given an exact Journey turn authority
When the same valid transition is applied repeatedly with the same receipt
Then one durable journal state exists
And duplicate delivery or divergent mutation does not occur.
```

```text
Given a transition has stale Journey, run, generation, expected phase or receipt authority
When it reaches the journal boundary
Then the complete transition rejects without mutation
And sibling Journey records remain byte-identical.
```

## Scope

- Versioned durable record and channel-specific native storage.
- Orthogonal phase, outcome, cancellation, delivery and recovery fields.
- Exact idempotency receipts and optimistic expected-phase validation.
- Per-Journey serialization and bounded active/terminal retention.
- Shadow comparison against current lifecycle evidence at capacity one.
- Pure model tests and native atomicity/fault tests.

## Out Of Scope

- Controlling admission, terminal output, projection, outbox or restart recovery.
- Capacity two.
- Mirror runtime changes.

## Validation

Automated only. Desktop E2E is not required because this story changes a native/domain contract with no independent user-visible behavior. Validate through deterministic transition matrices, storage fault injection, restart reads, shadow-divergence fixtures, full suites and build checks at story completion.
