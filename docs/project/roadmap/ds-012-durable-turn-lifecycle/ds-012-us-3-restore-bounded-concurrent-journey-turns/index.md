[< Parent](../index.md)

# DS-012.US-3 — Restore Bounded Concurrent Journey Turns

**Status:** 🟢 Done
**Type:** User Story

---

## User Story

As the Navigator,
I want two different Journeys to operate concurrently through the same durable coordinator,
so that parallel work returns without sacrificing the reliable sequential lifecycle.

## Outcome

The single internal capacity constant returns from one to exactly two. Two Journey-owned journals drive independent execution, cancellation, terminal adoption, projection, outbox settlement and restart recovery while preserving every DS-009 authority boundary.

## Acceptance Behavior

```text
Given the serial coordinator and recovery path are proven at capacity one
When capacity returns to two
Then Journey A and Journey B can execute and settle independently
And each still permits only one reserved, running or unsettled exact turn.
```

```text
Given A cancels, fails, restarts or receives a late event while B runs or settles
When both use the same coordinator contract
Then B's journal, child, projection, outbox and provider lifetime remain unchanged.
```

## Scope

- Restore production-profile capacity constant to exactly two after gates pass.
- Deterministic two-Journey interleavings through journal-owned lifecycle.
- Exact targeted cancellation and terminal races.
- Sibling-safe projection, outbox and restart recovery.
- Bounded two-child shutdown and model-free cold start.
- Capacity-only rollback to one without reverting coordinator contracts.

## Out Of Scope

- Capacity greater than two.
- Arbitrary environment overrides.
- Remote or multi-user coordination.
- New sidebar or navigation features.

## Delivery Documents

- [Implementation plan](plan.md)
- [Test guide](test-guide.md)
- [Validation](validation.md)

## Validation

All automated DS-009 isolation and new journal interleaving checks are required. Run one final scheduled DEV desktop smoke only after they pass. Batch two-Journey start, navigation, independent completion and exact ownership inspection into the shortest useful session. Exercise desktop cancellation only if automated evidence cannot prove that boundary. Notify the Navigator of expected duration and screen use; prefer durable state and logs over screenshots. Stable promotion remains separate.
