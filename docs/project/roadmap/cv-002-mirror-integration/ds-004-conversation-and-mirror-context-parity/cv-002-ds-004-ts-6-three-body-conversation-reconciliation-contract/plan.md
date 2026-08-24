# Plan — CV-002.DS-004.TS-6

## Objective

Create the versioned three-body reconciliation substrate: explicit correlated turn identity, native per-body checkpoints, deterministic commit/advancement/conflict classification, persistence schema `0.5.0`, sanitized fixtures and a normative architecture contract.

TS-6 defines and persists reconciliation semantics. Live Mirror acknowledgment, Pi file observation and reconciliation interaction remain in US-3, US-4 and US-5.

## Characterized Starting Point

- `LiveConversationIdentity` v0.1 relates Journey, Harness conversation, Pi session id, optional Mirror conversation id and generation, but has no turn identity or durable checkpoint.
- Journey persistence is schema `0.4.0`.
- Harness message ids are not correlated to Pi JSONL entry ids or Mirror message ids.
- Pi JSONL provides native entry ids and parent relationships; `piSessionId` alone does not identify a branch leaf.
- Mirror binds a runtime session to a conversation using the exact Pi session-file path. Mirror messages have stable ids and metadata.
- Mirror user logging is awaited but failures are swallowed; assistant logging is detached/background with no completion acknowledgment.
- Mirror assistant content may be consolidated or truncated and is not a byte-identical Pi record.
- Mirror bootstrap is a bounded snapshot, not a reconciliation cursor.
- Harness persistence pauses during streaming but cannot classify Harness-only, Pi-only or Mirror-only advancement.

## Authority Contract

- Pi owns execution order, branch ancestry, model context and compaction.
- Mirror owns semantic conversation records and Mirror context.
- Nautilus owns the visible projection and the mappings/checkpoints proving what each body incorporated.
- Semantic parity does not require byte-identical storage.

## Identity Contract

A correlated turn carries explicit identity:

```text
journeyId
harnessConversationId
piSessionId
generation
turnId
runId?
origin: nautilus | pi_external | mirror_external | hydration
```

Per-body evidence references native durable ids:

```text
Harness: userMessageId, assistantMessageId?
Pi: user/assistant entry ids plus branch leaf/parent evidence
Mirror: conversationId, userMessageId?, assistantMessageId?
```

Content hashes may be stored only as sanitized integrity diagnostics. They never establish identity, order or safe reconciliation.

## Durable State

Add a versioned `ConversationReconciliationState` to `JourneyConversation` containing:

- authority coordinates validated against `LiveConversationIdentity`;
- per-body checkpoints;
- correlated turn records needed for idempotent completion/retry;
- aggregate classification;
- classification timestamp and reason codes.

Per-body state:

```text
unknown | pending | committed | failed
```

Aggregate classification:

```text
uninitialized
in_sync
commit_pending
commit_failed
pi_advanced
mirror_advanced
both_advanced
conflicted
```

`both_advanced` requires causal correlation or explicit reconciliation before it can become `in_sync`. `conflicted` blocks automatic fast-forward until a Navigator action creates a proven checkpoint or generation.

## Checkpoints

- Harness: last committed turn/message ids and ordered message count.
- Pi: exact session id, generation, native entry/leaf ids, parent evidence and observed session-file identity when known.
- Mirror: exact conversation id, last native message id, ordered count and update timestamp when known.
- Checkpoints are monotonic only under the same authority coordinates.
- Restart, hydration or branch changes generation and invalidates prior Pi fast-forward assumptions.
- Missing legacy evidence becomes `uninitialized` or `unknown`, never inferred as synchronized.

## Idempotency

The contract assigns stable `turnId` and per-body idempotency keys before persistence. Re-observing a native durable id may complete the same turn but cannot create a second correlated turn. US-3 will transport this correlation through Pi/Mirror and make Mirror writes idempotent.

## External Advancement Rules

- A same-generation Pi leaf descended from the stored leaf is `pi_advanced`; US-4 later decides which entries become visible messages.
- Native Mirror messages after the exact Mirror checkpoint are `mirror_advanced`; US-5 later classifies eligibility and requires explicit application.
- Independent advances without correlation are `both_advanced` or `conflicted`, never an automatic merge.
- Deletion, rewritten ancestry, conversation change, generation mismatch or cursor disappearance is a conflict.

## Implementation Sequence

### A. Characterization fixtures

1. Derive synthetic fixtures for Harness `0.4.0`, a Pi user/assistant branch, Mirror runtime-session/message records, consolidated/truncated Mirror text, restart and hydration.
2. Keep only sanitized synthetic content.
3. Document native ids and ordering guarantees.

### B. TypeScript domain contract

1. Add `src/domain/conversationReconciliation.ts`.
2. Define body checkpoints, correlated turns, commit states, classifications and reason codes.
3. Add constructors for fresh, legacy, Mirror-import and generation-reset states.
4. Add pure transitions for beginning a turn, observing each body, recording failure, classifying external advancement and resetting authority.
5. Enforce authority-coordinate, native-id and monotonicity invariants.

### C. Persistence migration

1. Add optional reconciliation state to `JourneyConversation`.
2. Advance persistence to `0.5.0`.
3. Parse the new state strictly.
4. Migrate `0.1.0` through `0.4.0` without claiming parity:
   - ordinary conversations become `uninitialized`;
   - Mirror imports preserve source id with unproven checkpoints;
   - existing context, mode, activity and live identity survive.
5. Reject malformed, cross-Journey, cross-session, stale-generation and impossible committed state.

### D. Architecture contract

1. Add `docs/architecture/three-body-conversation-reconciliation.md`.
2. Update `docs/architecture/pi-local-process-boundary.md`.
3. Specify the future US-3 transport as explicit, ephemeral, non-secret Nautilus correlation metadata, not arbitrary persisted environment.
4. Record US-4 auto-projection and US-5 auto-detect/explicit-apply boundaries without implementing them.

### E. TDD and evidence

1. Build all transitions from failing tests.
2. Add `src/tests/conversationReconciliation.test.ts`.
3. Extend `persistedJourneyConversation.test.ts` for `0.5.0` and migrations.
4. Run full frontend tests/build and Rust regression checks.
5. Use fixture-level Navigator validation because TS-6 intentionally has no UI behavior; the later user stories own E2E experience.

## Expected Files

```text
src/domain/conversationReconciliation.ts
src/domain/journeyConversation.ts
src/domain/persistedJourneyConversation.ts
src/tests/conversationReconciliation.test.ts
src/tests/persistedJourneyConversation.test.ts
src/tests/fixtures/reconciliation/*
docs/architecture/three-body-conversation-reconciliation.md
docs/architecture/pi-local-process-boundary.md
```

No UI, watcher, Mirror logger mutation or reconciliation command belongs to TS-6.

## Risks and Controls

| Risk | Control |
|------|---------|
| Duplicating Pi semantics | Retain native Pi ids/ancestry; do not reproduce execution or compaction |
| Text mistaken for identity | Native ids and explicit correlation only |
| Legacy falsely marked synchronized | Migration defaults to uninitialized/unknown |
| Stale cursors after generation change | Validate checkpoints against session id and generation |
| Scope absorbs US-3/4/5 | No production I/O, watcher, acknowledgment or UI in TS-6 |
| Correlation leaks secrets | Only named non-secret ids; no content or arbitrary env in persisted state |

## Acceptance Checkpoint

TS-6 passes when synthetic observations classify deterministically without text matching; persistence `0.5.0` round-trips the contract; legacy files migrate without false synchronization; stale and cross-body evidence is rejected; restart/hydration resets authority correctly; and the architecture document gives US-3, US-4 and US-5 one unambiguous substrate.

## Approval Gate

Implementation remains blocked until Navigator approval of this plan.
