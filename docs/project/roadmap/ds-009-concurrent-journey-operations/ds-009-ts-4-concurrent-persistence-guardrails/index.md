[< Parent](../index.md)

# DS-009.TS-4 — Concurrent Persistence Guardrails

**Status:** 🟡 Planned
**Type:** Technical Story
**Order:** 5 of 7
**Concurrency:** backend registry with global limit 1

## Outcome

Settlement and persistence use captured run authority and per-Journey finalization leases, so background responses persist to the correct Journey conversation and Mirror append destination without overwrite, loss or stale selected-Journey writes. Concurrency is still not enabled until this story is complete.

## Scope

- Use run-start captured `RunAuthority` for Pi transcript inspection, Harness projection, Mirror append, outbox acknowledgement and save paths.
- Serialize saves and finalization per Journey.
- Keep Journey unavailable for a new run while finalization is pending.
- Release process capacity when the child exits even if finalization continues.
- Release the Journey lease after durable local projection and successful outbox enqueue.
- Allow a new invocation when Mirror append remains recoverably pending in the durable outbox.
- Keep the Journey blocked when outbox creation or enqueue fails.
- Reject stale settlement after generation rollover or run replacement.
- Preserve idempotent `existing` receipt behavior.
- Make finalization acknowledgement idempotent when projection and outbox are already durable.
- Reconcile running and finalizing leases after dispatcher remount or reload without duplicating listeners.
- Keep Journey blocked with a recoverable diagnostic when no durable recovery handle exists.
- On app restart, use dedicated projection and outbox persistence as authority instead of restoring dead child handles.

## Acceptance Behavior

```text
Given Journey A completes while Journey B is selected
When Harness settles Pi evidence and Mirror append preparation
Then Journey A's captured generation, Pi session and Mirror conversation receive the durable projection and outbox item
And Journey B remains unchanged
And Journey A remains blocked only if no durable outbox recovery handle exists
And repeated finalization acknowledgement is safe after projection and outbox are durable.
```

## Out Of Scope

- Enabling global limit 2.
- New Mirror append primitives.
- Imported conversation reconciliation.
- Stable promotion or release.

## Validation

Tests cover background completion, finalization after child capacity release, failed outbox enqueue preserving Journey block, durable pending outbox releasing new invocation, Mirror append retry, `existing` receipt, idempotent outbox acknowledgement, dispatcher remount/reload lease reconciliation, app restart recovery from projection/outbox state, concurrent save ordering and generation rollover rejection.
