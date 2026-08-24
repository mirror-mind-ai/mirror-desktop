[< Parent](../index.md)

# CV-002.DS-004.US-3 — Observable Three-Body Turn Commit

**Status:** ✅ Done
**Type:** User Story

---

## User Story

As a Navigator working in Nautilus,
I want each completed turn to reach Pi and Mirror with an observable durable outcome,
so that I know whether the conversation is fully synchronized and can recover a partial commit instead of assuming parity.

## Outcome

A Nautilus turn carries one explicit correlation identity through Harness, Pi and Mirror. Normal success remains quiet. A partial durable commit survives relaunch, is visible near the composer and can be retried idempotently without invoking the model again.

## Acceptance Behavior

```text
Given I send a command in Nautilus
When the Pi run and all durable writes succeed
Then the Harness projection, exact Pi branch and mapped Mirror conversation contain one correlated user/assistant turn
And the successful synchronization adds no permanent chat noise.
```

```text
Given Pi commits but one or both Mirror messages remain pending or fail
When the run settles or Nautilus relaunches
Then Nautilus exposes the incomplete durable state and a bounded Retry action
And retry writes only missing Mirror records with the same idempotency keys
And never reruns Pi or the provider.
```

## Scope

- Allowlisted ephemeral turn/run authority from Nautilus into the Pi process.
- Native Pi entry evidence and structured Mirror commit events in Pi JSON mode.
- Deterministic idempotent Mirror user/assistant message persistence with correlation metadata.
- Initial Mirror conversation discovery bound atomically to the live identity and TS-6 authority.
- Persisted pending/committed/failed transitions at safe commit boundaries.
- Relaunch status recovery for unresolved turns only.
- Bounded retry of missing Mirror records without model invocation.
- Compact actionable UI only while attention is required.
- Success, cancellation, provider error and logging failure semantics.

## Out Of Scope

- Importing external terminal Pi turns into Nautilus, owned by US-4.
- Detecting or applying unrelated Mirror-only updates, owned by US-5.
- Permanent success badges on messages or the composer.
- Rerunning Pi to repair Mirror persistence.
- Private reasoning or reasoning-summary persistence.
- Concurrent Journey runs, owned by DS-009.

## Artifacts

- [Plan](plan.md)
- [Test guide](test-guide.md)
- [Implementation](implementation.md)

## Validation

Exercise a successful correlated turn, injected Mirror user/assistant failures, idempotent retry, cancellation, provider error and relaunch. Verify exactly one native record per body, no model invocation during repair and no persistent UI noise after synchronization.
