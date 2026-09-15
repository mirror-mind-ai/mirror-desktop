[< Parent](../index.md)

# CV-008.DS-004-TS-1 — Characterize Mirror Conversation and Compaction Authority

**Status:** 🟢 Done
**Type:** Technical Story

## Technical Story

In order to avoid false continuity and a Desktop reimplementation of Pi compaction,
as the conversation substrate,
I want sanitized evidence for the released Mirror conversation catalog and real Pi compaction boundaries,
so that later schemas distinguish exact Desktop authority, actionable Mirror history and agent handoff from authoritative facts.

## Outcome

A committed private-data-free characterization identifies which Journey-filtered conversation metadata and revisions the released Mirror runtime exposes, which source records retain adoptable Pi authority, how authoritative compaction entries represent summary and retained tail, and where current long-history work scales with total retained data.

## Acceptance Behavior

```text
Given disposable Mirror conversations and Pi sessions for Journey mirror-desktop validation
When bounded catalog, message, authority and compaction evidence is inspected
Then every available field and missing authority coordinate is recorded without production content
And each source classifies as exact_adoptable, working_copy_only or read_only
And compaction boundaries identify stable entries, branch ancestry and retained-tail overlap
And missing supported runtime capability blocks dependent work instead of causing direct SQLite access or a production Mirror patch
```

## Scope

- Released Mirror API/CLI and packaged-runtime capability inspection with explicit Journey filtering.
- Conversation metadata, roles, attachments, mode, persona, timestamp and revision evidence.
- Pi JSONL compaction shape, stable entry IDs, branch behavior and tail overlap.
- Structural scale probes at and above the sanitized CR029 shape.
- A characterization artifact that names supported and blocked implementation routes.

## Out Of Scope

- Production-data capture or committed real transcripts.
- Desktop schema mutation, import, migration or UI implementation.
- Direct `memory.db` reads from Desktop code.
- Changes to an installed production Mirror checkout; missing Mirror capability follows the official Mirror development and release path.

## Validation

Completed in [the structural characterization](../characterization.md). The released Mirror summary path is Journey-filtered and bounded, and existing exact lookup, manual title mutation and recall support the selected no-core-update route. It still lacks an opaque source revision and bounded message snapshot, so working-copy import remains outside this DS. Real Pi session inspection recorded compaction shape and reference resolution without retaining content, identifiers or paths; no direct SQLite or production-checkout workaround is allowed.
