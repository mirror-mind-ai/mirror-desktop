[< Parent](../index.md)

# CV-002.DS-004.US-5 — Reconcile Mirror-Only Updates into Pi

**Status:** 🟠 In Planning
**Type:** User Story

---

## User Story

As a Navigator whose mapped Mirror conversation may advance outside the active Pi branch,
I want Nautilus to detect and explain pending Mirror-only updates,
so that I can explicitly reconcile trustworthy conversation turns without silent context injection or accidental duplication.

## Outcome

Nautilus automatically detects that the mapped Mirror conversation advanced, shows a bounded inert preview and classifies the difference. Applying an eligible update is explicit and creates a supported Pi hydration branch with a new persisted generation and checkpoints. Unsupported or independently advanced histories remain blocked without changing the visible conversation or Pi.

## Acceptance Behavior

```text
Given the mapped Mirror conversation contains messages after the last reconciled checkpoint
And those messages are not present in the exact Pi branch
When Nautilus refreshes reconciliation state
Then it reports pending Mirror-only updates without modifying Pi context.
```

```text
Given I review and approve an eligible complete Mirror-only turn
When Nautilus reconciles it
Then a supported Pi hydration branch is created atomically
And the new live identity records its Mirror source, Pi generation and checkpoints
And later prompts use the reconciled Pi context without replaying that history in every prompt.
```

```text
Given Mirror records are partial, truncated, consolidated, causally ambiguous or conflict with independent Pi advancement
When Nautilus classifies the difference
Then no apply action is offered
And the previous Harness projection, Pi branch and live identity remain unchanged.
```

## Scope

- Background detection on startup, focus/visibility recovery and Journey activation.
- Exact mapped Mirror conversation and native cursor/count validation.
- Inert bounded preview with source/provenance disclosure.
- Eligibility classification for complete ordered user/assistant text turns.
- Duplicate, independent advancement and conflict detection against proven checkpoints.
- Explicit supported branch/hydration action; no silent Pi mutation.
- Atomic old-branch preservation, new-generation activation and persisted conversation update with rollback.
- Idempotent checkpoints so the same Mirror update cannot be applied twice.

## Out Of Scope

- Silent continuous Mirror-to-Pi synchronization.
- Automatic model invocation after detecting or applying an update.
- LLM-based semantic merge or text-equality identity claims.
- Converting memories, summaries, activities, tools or arbitrary Mirror roles into chat turns.
- Aggregate three-body parity review (`US-6`).
- Concurrent Journey process ownership (`DS-009`).

## Validation

Exercise unchanged, eligible, incomplete, duplicate, truncated/consolidated, independent-Pi, cursor conflict, atomic success, rollback and relaunch/idempotency routes. E2E is required for one explicit successful hydration branch and proof that Pi remains unchanged before approval.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
