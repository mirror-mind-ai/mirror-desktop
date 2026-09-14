# CV-008.DS-004 Conversation Authority Characterization

Date: 2026-09-14
Journey: `mirror-desktop`
Runtime inspected: released production Mirror checkout and Pi 0.85.1
Data policy: structural inspection only; no titles, message bodies, source paths, session identifiers or production payloads are reproduced here.

## Result

TS-1 found a supported bounded route for Journey-filtered conversation summaries, but not the complete contract required for working-copy import and source-divergence detection. Import-dependent work is blocked pending a separately governed Mirror runtime capability. Desktop must not compensate with direct SQLite reads or an unbounded message scan.

Independent Desktop conversation, migration, sidebar and context-reset work may proceed. `Continue in this app`, import receipts and divergence claims may not become executable until the dependency is officially released and selected by the Desktop runtime channel.

## Mirror conversation surface

The released Python API provides:

- `MemoryClient.conversations.list_recent(limit, journey, persona)`, backed by a Journey predicate and SQL `LIMIT`;
- summary fields `id`, `title`, `started_at`, `persona`, `journey`, and `message_count`;
- exact conversation lookup by full ID;
- full-message retrieval ordered by `created_at, id`;
- exact validated append through the released conversation append service.

The released `conversations` CLI accepts `--journey` and `--limit`, but its ordinary listing is Markdown-oriented rather than a versioned JSON contract. The packaged Desktop may call the Python API through a bounded resource process, as it already does for provisioning, but may not import frontend SQLite bindings or query `memory.db` itself.

### Missing bounded authority

The summary contract does not expose:

- last activity time or last stable message ID;
- an opaque source revision suitable for idempotent import and later divergence checks;
- ended/open state, interface, summary, tags or structured metadata;
- a bounded message preview or cursor/range API;
- attachment-reference classification;
- Pi session coordinates sufficient to prove exact adoption.

`get_messages(conversation_id)` materializes the entire source conversation. Deriving a revision, preview or recent tail from it would make catalog/import work proportional to total retained history and therefore violates the approved boundary.

Required dependency: a released, versioned Mirror API/CLI that provides a bounded Journey-filtered catalog and bounded source snapshot/preview carrying an opaque revision. It must use the official Mirror development, tests, release notes and promotion path. Until then, all non-Desktop sources classify as `read_only`; `working_copy_only` is a product-intent classification whose transition remains blocked. No source inspected exposes complete Desktop thread, generation, activation-receipt and Pi-session authority, so none classifies as `exact_adoptable`.

## Source classification

| Source evidence | Classification | Executable consequence |
|---|---|---|
| Desktop thread + generation + activation receipt + Pi session + Mirror conversation, all exact and channel-valid | `exact_adoptable` | Existing Desktop-ready conversation may resume after native validation. |
| Journey-filtered Mirror summary without complete Desktop/Pi authority | `read_only` in the released runtime | May be listed as available only after the bounded catalog dependency exists; cannot Send or mutate. |
| Exact bounded Mirror snapshot with an opaque revision but without adoptable Pi authority | `working_copy_only` after dependency release | May enter explicit source-preserving handoff; never literal session resumption. |
| Missing Journey match, malformed metadata, stale/ambiguous source, or failed revision validation | `read_only` / needs attention | Fail closed; no destination authority is published. |

## Pi compaction shape

A structural-only scan of locally retained real Pi JSONL sessions found 276 compaction entries. All 276 carried stable `id`, `parentId`, `firstKeptEntryId`, `summary`, `timestamp`, and `tokensBefore` fields; all parent and first-kept references resolved inside their session, and every first-kept entry was a message. Optional observed fields were `usage`, `fromHook`, and `details`; observed detail keys were limited to modified/read file inventories. No values were copied.

Pi documents and persists sessions as an append-only tree. A compaction entry is a new tree entry whose parent preserves branch ancestry. `firstKeptEntryId` names the first original entry retained verbatim after the compacted prefix. Therefore a Desktop checkpoint may index:

- the compaction entry ID and parent ID;
- the first-kept entry ID;
- the active branch ancestry at observation time;
- the exact neighboring projected turn boundaries.

The summary belongs to Pi's active context authority. Desktop must not regenerate, edit or treat it as a user-facing conversation summary. The retained tail overlaps technical segments by authority reference, not by duplicating durable messages. A checkpoint is publishable only after the referenced entries resolve and no tool result, assistant turn, Steering evidence or terminal evidence is split from its owning turn.

## Current scale boundary

The generated CR029 fixture contains 500 turns and at least 10,000,000 projected action characters without private data. Current persistence still stores one Journey thread manifest plus generation projections, and opening a Journey reads and parses the active generation projection before transcript rendering. Catalog cardinality is currently one thread per Journey; there is no bounded per-Journey conversation index or current-segment-first loader.

CR029 bounds DOM disclosure and memoized transcript projection, but does not bound file parsing, reconciliation input, generation projection loading or initial transcript model construction by a current Segment. TS-2 and TS-4 must introduce metadata-only catalog reads and staged migration before multiple Conversations can claim bounded startup.

## Implementation gates

1. Proceed with model-free Desktop Conversation identity, migration, catalog metadata, resizable focused sidebar and reset-label semantics using generated fixtures.
2. Keep selection inert until exact authority validation succeeds.
3. Do not implement executable working-copy import, source preview, source revision receipts or divergence detection against the current released Mirror API.
4. Govern and release the missing Mirror capability separately; then characterize its exact versioned response before unblocking US-3.
5. Build Pi segment indexing as a bounded native JSONL structural scan; Pi remains the sole compaction and model-context authority.
