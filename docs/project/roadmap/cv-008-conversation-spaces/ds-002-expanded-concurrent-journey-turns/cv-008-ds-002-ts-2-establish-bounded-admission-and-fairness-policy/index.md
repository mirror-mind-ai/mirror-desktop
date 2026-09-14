[< Parent](../index.md)

# CV-008.DS-002-TS-2 — Establish Bounded Admission and Fairness Policy

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to admit more independent work without creating an invisible scheduler,
as the Mirror Desktop execution boundary,
I want one bounded four-Journey admission policy,
so that capacity, overflow and cleanup remain deterministic.

## Outcome

The native registry admits exactly four Journey leases, rejects a fifth before process start, retains one lease per Journey through finalization and drains every production-admitted child through one shared bound. Frontend inspection accepts only governed limits 1, 2 and 4 and fails closed on malformed evidence.

## Acceptance Behavior

```text
Given four distinct Journeys own reserved, running or finalizing leases
When a fifth Journey attempts native admission
Then the reservation fails atomically before process start
And no queue or automatic retry is created
And a slot becomes eligible only after exact cleanup and fresh reinspection
```

## Scope

- Production process limit four with internal hard maximum retained.
- Shutdown control derived from the production limit rather than a duplicate capacity-two constant.
- Governed frontend inspection limits and exact entry/capacity validation.
- Immediate recoverable refusal with no waiting queue.
- One admitted lease per Journey and first-success atomic admission.
- Finalizing leases counted against admitted capacity.

## Out Of Scope

- FIFO prompt scheduling or fairness claims that require a queue.
- User-configurable or environment-controlled limits.
- Automatic scaling or capacity above four.
- Changes to native authority or persistence schemas.

## Evidence

Focused Rust tests cover production capacity, simultaneous competition, duplicate Journey refusal, finalizing occupancy, stale targets and bounded shutdown. Frontend tests reject unsupported and inconsistent occupancy projections. Natural fifth-Journey refusal remains part of aggregate Navigator Validation.
