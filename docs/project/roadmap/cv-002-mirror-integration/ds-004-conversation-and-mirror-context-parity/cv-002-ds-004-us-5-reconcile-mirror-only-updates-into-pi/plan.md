# Plan — CV-002.DS-004.US-5

## Objective

Detect advancement of the exact mapped Mirror conversation without changing Pi, explain the bounded difference, and let the Navigator explicitly create one safe hydrated Pi generation for eligible complete Mirror-only turns. Preserve the previous identity and exact Pi branch on every unsupported, stale or failed path.

## Current Boundary

US-3 proves correlated Nautilus → Pi → Mirror commits. US-4 proves exact descendant Pi → Nautilus projection. The reconciliation ledger already models `MirrorAdvancement`, `mirror_advanced`, `both_advanced` and conflict states, but no runtime currently observes a mapped Mirror cursor or applies Mirror-only records.

Mirror message text is semantic conversation content, not a byte-identical Pi transcript. Native Mirror ids and allowlisted correlation metadata may establish provenance; matching text or timestamps never establish identity.

## Architectural Decisions

### 1. Read-only exact Mirror observation

Add a narrow read-only Mirror snapshot boundary for one explicit `journeyId`, `mirrorConversationId`, base native message id and message count. It will:

- query only the mapped conversation;
- order by Mirror's stable `(created_at, id)` sequence;
- validate that the checkpoint id still exists at the expected ordinal;
- return an unchanged fingerprint (`conversationId`, count, last id, updated time) when possible;
- return at most a bounded tail of native message id, exact role, text, timestamp and allowlisted Nautilus correlation coordinates;
- never return arbitrary message metadata, memories, operations, tools, attachments, prompts, secrets or reasoning;
- invoke neither Pi nor a provider.

The existing bootstrap importer remains responsible for explicit whole-conversation reload. Mirror-only observation gets a dedicated contract instead of rewriting local state through `reload_journey_from_mirror`.

### 2. Pure classification before UI or I/O

Create a pure Mirror-tail classifier parallel to `externalPiProjection.ts`. It validates authority, generation, Mirror cursor/count and current local checkpoints, then classifies:

- `unchanged` — exact fingerprint/cursor has not advanced;
- `waiting` — a trailing user record has no complete assistant yet;
- `eligible` — one or more non-empty, ordered user/assistant text pairs after the checkpoint;
- `duplicate` — native allowlisted correlation proves records already incorporated;
- `unsupported` — arbitrary roles, empty text, truncation marker, consolidated multi-assistant record or bounded-tail overflow;
- `conflicted` — changed conversation, missing/regressed cursor, stale authority, independent uncorrelated Pi advancement or native contradiction.

Only native ids/correlation evidence can prove duplication. Text equality is diagnostic only. Classification persists `MirrorAdvancement` ids/count/fingerprint evidence but never message content or preview snippets in the reconciliation ledger.

### 3. Quiet automatic detection, explicit mutation

Reuse the asynchronous startup/focus/Journey-activation coordinator established by US-4. Coalesce by authority and sequence observations so a stale Pi or Mirror result cannot overwrite a newer checkpoint. Focus handlers continue to schedule work and never await I/O.

Normal unchanged/waiting checks remain quiet. An actionable eligible update renders a compact notice and an inert review disclosure containing:

- Mirror source and conversation code;
- ordered role/timestamp/snippet preview;
- number of complete turns;
- the proposed generation transition;
- an explicit `Create reconciled Pi branch` action.

Unsupported/conflicted observations explain the boundary and offer no apply action. Closing the disclosure does not discard durable advancement evidence.

### 4. Supported action is hydration branch, not fabricated append

The supported mutation for an eligible tail is a new hydrated Pi generation. Nautilus will not append synthetic entries after an existing native Pi leaf or claim a Pi fast-forward that Pi did not produce.

The next transcript contains the current accepted Harness conversation followed by the eligible Mirror-only messages. Harness message ids derive deterministically from native Mirror ids. The new Pi JSONL receives deterministic imported entry ids, a new physical session file for the same Journey-owned session id, and a generation increment. `LiveConversationIdentity.origin` gains `mirror_reconciliation`.

A proven duplicate may explicitly advance only the Mirror checkpoint when native correlation already proves the Pi/Harness incorporation. Ambiguous overlap and `both_advanced` remain blocked.

### 5. Atomic backend transaction with rollback

Add one idle-only Tauri reconciliation command. Before mutation it re-reads:

- the persisted Journey conversation and full authority coordinates;
- the exact active Pi session header/path/checkpoint;
- the exact Mirror snapshot token/cursor used by the preview.

It then validates the proposed next persisted conversation, stages both the hydrated JSONL and conversation JSON, preserves the old exact Pi file and conversation payload, and activates both staged files as one rollback-capable operation. Any validation, staging, rename or persistence failure restores the previous files and identity. The frontend reloads the committed persisted conversation only after backend success.

The new reconciliation state is an explicit hydration baseline with:

- generation incremented exactly once;
- Harness checkpoint at the final accepted Mirror assistant;
- Pi checkpoint at the final imported native entry and exact new file;
- Mirror checkpoint at the observed native tail;
- cleared advancement evidence and `in_sync` classification;
- context stats cleared for the new generation;
- imported activity and certified mode preserved without re-execution.

Repeated approval with the same snapshot is rejected as stale/idempotent and cannot create another generation.

## Implementation Sequence

### A. Observation and classification — TDD

1. Add fixtures for unchanged, one/multiple complete turns, partial tail, correlated duplicate, unsupported role, empty/truncated/consolidated content, missing cursor, count regression, wrong conversation and independent Pi advancement.
2. Implement pure contracts/materialization in `src/domain/mirrorOnlyReconciliation.ts` and extend bounded reconciliation reason codes/helpers where needed.
3. Add a dedicated read-only Python Mirror snapshot command and structured tests.
4. Add the asynchronous Tauri inspection command using `spawn_blocking`, exact allowlists and bounded output.

### B. Background coordinator and review UI

1. Add typed frontend adapters for inspection and reconciliation.
2. Sequence/coalesce Pi and Mirror checks for only the active Journey.
3. Persist advancement classification without preview content.
4. Add a compact notice and inert disclosure; render snippets as plain React text with no HTML injection.
5. Keep all apply controls disabled during a run, reload, stale authority or unsupported state.

### C. Atomic explicit hydration branch

1. Add pure construction of the next generation, deterministic Harness/Pi ids and hydration baseline.
2. Implement the idle-only backend transaction with exact authority revalidation and rollback.
3. Reload the backend-committed conversation into React after success.
4. Restore local context inspection for `mirror_reconciliation` generations without starting Pi/provider.
5. Reject repeated/stale approvals and preserve the previous state after induced backend failure.

### D. Documentation and evidence

1. Update the reconciliation and Pi-process boundaries with the implemented Mirror observation/branch contract.
2. Record automated and sanitized E2E evidence in the story package.
3. Leave aggregate alternating three-body validation to US-6.

## Likely Files

```text
scripts/inspect_mirror_conversation.py
scripts/tests/test_inspect_mirror_conversation.py
src/domain/mirrorOnlyReconciliation.ts
src/domain/conversationReconciliation.ts
src/domain/journeyConversation.ts
src/domain/persistedJourneyConversation.ts
src/app/mirrorReconciliationStorage.ts
src/app/MirrorReconciliationNotice.tsx
src/app/App.tsx
src/agent/piProcessStream.ts
src-tauri/src/main.rs
src/tests/mirrorOnlyReconciliation.test.ts
src/tests/mirrorReconciliationNotice.test.tsx
docs/architecture/three-body-conversation-reconciliation.md
docs/architecture/pi-local-process-boundary.md
```

File names may consolidate during implementation, but authority and channel separation must remain.

## Acceptance Behavior

```text
Given an in-sync mapped Harness/Pi/Mirror authority
And the exact Mirror conversation gains one complete user/assistant pair while Pi is unchanged
When Nautilus starts, regains focus or activates that Journey
Then it quietly records `mirror_advanced` and shows one review notice
And the Pi file and live identity remain unchanged.
```

```text
Given the eligible preview is still current
When the Navigator chooses Create reconciled Pi branch
Then one new generation is atomically persisted
And its Pi transcript contains the previously accepted conversation plus the Mirror-only pair
And all three checkpoints form an explicit in-sync hydration baseline
And relaunch or repeated checks do not apply the pair again.
```

```text
Given the Mirror tail is partial, truncated, consolidated, unsupported, stale or overlaps independent Pi advancement without causal proof
When Nautilus checks or the Navigator attempts application
Then no Pi/provider execution occurs
And no visible message, old Pi file or live identity is overwritten
And the boundary identifies why explicit reconciliation is unavailable.
```

## Validation Route

E2E is required.

1. Establish a dedicated synchronized Journey and record Harness, exact Pi and Mirror checkpoints plus the Pi file digest.
2. Add one complete user/assistant pair directly to the mapped Mirror conversation without touching Pi.
3. Return focus or activate the Journey.
4. Confirm a bounded Mirror notice/preview appears and the Pi digest, generation and visible messages remain unchanged.
5. Approve `Create reconciled Pi branch`.
6. Confirm generation increments once, old Pi file is preserved, new JSONL contains the accepted transcript, checkpoints become `in_sync`, and no provider run appears.
7. Refocus and relaunch; confirm no duplicate or second generation.
8. Use controlled fixtures/failure injection for partial, truncated/consolidated, independent-Pi conflict and rollback paths.

## Required Checks

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
python3 -m unittest scripts.tests.test_inspect_mirror_conversation
```

Use `uv run` for commands executed inside the Mirror Python project.

## Non-Goals

- US-6 aggregate parity review.
- Silent or polling synchronization.
- Semantic merge by model judgment.
- Appending fabricated ancestry to an active Pi branch.
- Automatic provider invocation or follow-up generation.
- Reconciliation of memories, summaries, activity, tools or arbitrary roles.
- DS-009 concurrent process registry work.

## Stop Conditions

- The Mirror store cannot expose a stable native cursor/order without changing Mirror core semantics.
- The supported Pi JSONL/session boundary cannot activate and roll back a hydrated generation safely.
- A requested merge would rely on text equality or LLM judgment.
- Scope expands into aggregate US-6, concurrency, polling or Mirror memory synchronization.
- Required checks fail without a narrow story-local fix.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until Navigator approval.
