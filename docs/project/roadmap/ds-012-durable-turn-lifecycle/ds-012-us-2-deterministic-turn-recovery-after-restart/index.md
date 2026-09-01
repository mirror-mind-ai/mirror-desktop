[< Parent](../index.md)

# DS-012.US-2 — Deterministic Turn Recovery After Restart

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want a restarted Harness to resume the exact durable turn state and present one safe next action,
so that frontend loss or app restart does not strand a completed result or block future conversation.

## Outcome

Cold start classifies every supported non-terminal journal frontier without a model, child fabrication or transcript reconstruction. Terminal evidence can resume local projection and outbox settlement, while genuinely interrupted execution receives an explicit durable disposition.

## Acceptance Behavior

```text
Given Pi completed after the frontend disappeared
When Harness restarts
Then the same exact turn resumes from durable terminal evidence
And projection and outbox settlement continue idempotently.
```

```text
Given a turn did not reach durable terminal adoption
When Harness restarts without a live exact child
Then the turn becomes honestly interrupted with one safe action
And no child, route, message, outcome or receipt is fabricated.
```

## Scope

- Cold-start journal scan and exact recovery classification.
- Recovery from every declared journal frontier.
- Terminal-to-projection/outbox resumption.
- Durable interrupted disposition and successor eligibility.
- Exact live-child reattachment only when native inspection agrees.
- Model-free deterministic restart harness.

## Out Of Scope

- Capacity two.
- General conversation import or Pi transcript reconstruction.
- Stable production recovery migration without a separate promotion gate.

## Validation

Automated restart-frontier tests are required. After US-1 and US-2 automated evidence passes, run one scheduled, short DEV desktop smoke covering two sequential sends, one approved restart frontier, recovery, and a successor send. Prefer journal, projection, outbox and native inspection evidence. Use screen control or screenshots only if the user-visible recovery state cannot otherwise be established, and notify the Navigator before occupying the computer.
