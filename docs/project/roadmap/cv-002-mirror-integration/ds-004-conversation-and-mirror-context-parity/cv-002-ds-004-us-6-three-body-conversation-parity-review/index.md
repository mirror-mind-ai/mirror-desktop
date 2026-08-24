[< Parent](../index.md)

# CV-002.DS-004.US-6 — Three-Body Conversation Parity Review

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator accepting Conversation and Mirror Context Parity,
I want to exercise one coherent conversation across Nautilus, terminal Pi and Mirror,
so that DS-004 closes only after forward commits, external continuation and explicit reconciliation behave as one understandable experience.

## Outcome

The aggregate DS-004 review proves both semantic context parity and durable conversation reconciliation across all three bodies, including partial failure and relaunch boundaries.

## Acceptance Behavior

```text
Given one Journey with a mapped Harness conversation, Pi session and Mirror conversation
When I alternate supported work among Nautilus, terminal Pi and Mirror-only updates
Then every body either reaches the same proven checkpoint
Or Nautilus exposes the exact pending/conflicted boundary and a safe next action.
```

## Scope

- Nautilus → Pi → Mirror successful commit.
- Pi terminal → Nautilus incremental projection.
- Mirror-only → automatic detection → explicit Pi reconciliation.
- Relaunch at each boundary.
- Cancellation and partial durable failure.
- Duplicate, stale checkpoint and conflict handling.
- Existing Journey/identity/persona/mode/context/compaction parity scenarios.
- Sanitized evidence and Navigator acceptance.

## Out Of Scope

- Concurrent active runs across Journeys.
- Unattended conflict resolution.
- Byte-for-byte equality between execution logs and semantic Mirror records.
- Public/cloud synchronization.

## Validation

Execute the aggregate DS-004 test guide with one recorded identity/checkpoint timeline. Complete Debt Review only after the Navigator accepts the three-body experience and all remaining differences are classified as accepted debt or blockers.
