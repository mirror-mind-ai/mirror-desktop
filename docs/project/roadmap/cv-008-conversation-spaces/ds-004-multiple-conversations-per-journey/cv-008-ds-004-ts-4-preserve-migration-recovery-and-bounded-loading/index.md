[< Parent](../index.md)

# CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to ship the new substrate without sacrificing existing continuity,
as Mirror Desktop,
I want reversible single-conversation adoption, exact lifecycle recovery and physically bounded catalog/Segment loading,
so that old and large Journeys remain complete, responsive and authority-safe across upgrade and restart.

## Outcome

Each supported existing Journey becomes one cataloged Conversation with unchanged thread, generation, Pi session, Mirror conversation, messages and receipts. Copy-verify-publish migration keeps legacy state authoritative until segmented state is complete. Interrupted creation, import, segmentation and migration recover model-free from exact durable phases.

## Acceptance Behavior

```text
Given supported existing single-conversation state
When the new catalog is initialized
Then exactly one Conversation adopts the existing thread without copying transcript bytes or invoking a model
And repeated initialization remains byte-stable

Given a lifecycle operation stops at any durable phase
When the app relaunches
Then only the exact operation resumes or rolls back
And no prompt, child, source mutation, duplicate Conversation or sibling removal occurs

Given history materially exceeds the CR029 shape
When the catalog and current Conversation open
Then work is bounded by metadata and loaded Segments rather than total retained history
And complete exact history remains recoverable on request
```

## Scope

- Compatibility for supported persisted Conversation schemas including current `0.9.0`.
- First-Conversation adoption with stable IDs.
- Copy-verify-publish segmented migration and reversible receipt.
- Recovery matrix for create, import, segment and migration phases.
- Bounded catalog, parser, projection and DOM working sets.
- Private-data-free large fixtures and structural work counters.

## Out Of Scope

- Destructive cleanup of legacy state in the initial migration.
- History truncation, evidence deletion or silent corruption repair.
- Child/process replay during recovery.
- Performance claims based only on elapsed time or Pi compaction.

## Validation

Exercise every supported schema, corruption/symlink case and injected failure frontier. Use generated histories above 1,000 messages and 10 MB terminal projection evidence to prove bounded structural work and exact on-demand recovery. Inspect source control for protected data before aggregate validation.
