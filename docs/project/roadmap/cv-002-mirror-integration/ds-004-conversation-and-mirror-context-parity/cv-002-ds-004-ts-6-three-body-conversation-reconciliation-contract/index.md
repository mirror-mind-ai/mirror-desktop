[< Parent](../index.md)

# CV-002.DS-004.TS-6 — Three-Body Conversation Reconciliation Contract

**Status:** ✅ Done
**Type:** Technical Story

---

## Technical Story

In order to preserve one coherent conversation across Nautilus, Pi and Mirror,
as the conversation persistence substrate,
I want a versioned commit, checkpoint and reconciliation contract,
so that every body can distinguish synchronized turns, pending writes, external additions and genuine conflicts without guessing from text equality.

## Outcome

The live-conversation identity relates the Harness projection, exact Pi session branch and Mirror conversation record through explicit checkpoints. Pi remains the authoritative execution transcript; Mirror remains the semantic conversation and memory record; Nautilus projects both and coordinates supported reconciliation.

## Acceptance Behavior

```text
Given a turn initiated in Nautilus
When Pi persists it and the Mirror logger records it
Then the contract can correlate each durable result to the originating run and turn
And distinguish committed, pending, failed and divergent state.
```

```text
Given new content is detected outside Nautilus
When its source and checkpoint are compared with the live identity
Then same-session Pi additions can be classified separately from Mirror-only additions
And no content is silently inserted into a Pi branch from text similarity alone.
```

## Scope

- Versioned turn identity and per-body durable checkpoints.
- Correlation across `journeyId`, `runId`, Harness conversation, Pi session/generation and Mirror conversation.
- Idempotent commit semantics and exactly-once reconciliation behavior.
- Incremental comparison after a known checkpoint.
- Classification of in-sync, pending, externally advanced, divergent and conflicted state.
- Rules for same-session Pi advancement, Mirror-only additions, import, hydration, branch and restart.
- Backward-compatible migration for existing Journey conversations.
- Sanitized diagnostics that expose identifiers and state without conversation contents or secrets.

## Out Of Scope

- Live Mirror commit acknowledgment, which belongs to US-3.
- Pi JSONL observation/materialization, which belongs to US-4.
- Mirror-only reconciliation controls or mutation, which belong to US-5.
- Concurrent active runs; process isolation remains DS-009.
- Treating the Mirror database as an executable Pi session log.
- Reconstructing tool-call ordering from consolidated Mirror assistant text.
- Silent overwrite, silent branch switching or background model invocation.

## Artifacts

- [Plan](plan.md)
- [Test guide](test-guide.md)
- [Implementation](implementation.md)
- [Validation](validation.md)
- [Debt review](review.md)
- [Done](done.md)

## Validation

Contract, migration, idempotency and conflict-classification tests, plus sanitized fixture comparisons among a Harness conversation file, exact Pi JSONL branch and Mirror conversation/checkpoint records.
