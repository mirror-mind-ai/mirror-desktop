[< Parent](../index.md)

# CV-002.DS-004.US-5 — Reconcile Mirror-Only Updates into Pi

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As a Navigator whose mapped Mirror conversation may advance outside the active Pi branch,
I want Nautilus to detect and explain pending Mirror-only updates,
so that I can explicitly reconcile trustworthy conversation turns without silent context injection or accidental duplication.

## Outcome

Nautilus automatically detects that the mapped Mirror conversation advanced, shows a bounded inert preview and classifies the difference. Applying it is explicit and produces a supported Pi branch/hydration transition with a new persisted generation and checkpoint.

## Acceptance Behavior

```text
Given the mapped Mirror conversation contains messages after the last reconciled checkpoint
And those messages are not present in the exact Pi branch
When Nautilus refreshes reconciliation state
Then it reports pending Mirror-only updates without modifying Pi context.
```

```text
Given I review and approve an eligible Mirror-only update
When Nautilus reconciles it
Then a supported Pi session branch or hydration is created atomically
And the new live identity records its Mirror source, Pi generation and checkpoints
And later prompts use the reconciled Pi context without replaying that history in every prompt.
```

## Scope

- Automatic local detection of mapped Mirror-conversation advancement.
- Inert sanitized preview and source/provenance disclosure.
- Eligibility classification for ordered user/assistant text.
- Duplicate and conflict detection against the Pi checkpoint.
- Explicit initialize, fast-forward or branch action as supported by evidence.
- Atomic archive/new-generation behavior with rollback on failure.
- Clear handling for consolidated, truncated or otherwise non-round-trippable Mirror records.

## Out Of Scope

- Silent continuous Mirror-to-Pi synchronization.
- Automatic model invocation after detecting an update.
- Converting memories, summaries, activities or tool records into user/assistant turns.
- Claiming byte-identical parity where Mirror intentionally stores consolidated or truncated text.
- Resolving semantic conflicts by LLM judgment.

## Validation

Exercise eligible fast-forward, required branch, duplicate, truncated/consolidated record, conflict, cancellation and backend failure. Confirm detection is automatic, application is explicit, Pi remains unchanged before approval and the previous identity survives failed reconciliation.
