[< CV-008](../index.md)

# CV-008.DS-004 - Multiple Conversations per Journey

**Status:** 🟡 Planned

## Outcome

The Navigator can expand one Journey into a focused sidebar state, inspect its recent conversations, resume a specific conversation and create a new one while every session remains inside the same Journey authority.

## Why This Matters

One durable conversation preserves continuity but eventually mixes distinct lines of work. A Journey is larger than one transcript. The user needs separate conversational sessions without losing the shared territory, and must be able to move among them without confusing history with active execution authority.

Continued use has also shown that treating one conversation as an eagerly loaded, indefinitely growing UI and persistence object does not scale. [CR029 — Restore responsiveness for long conversations](../../../refinement/rs016-ongoing-product-improvements-and-adjustments/cr029-restore-responsiveness-for-long-conversations.md) diagnosed repeated full-history rendering and eager historical action materialization at 718 messages and a 5.09 MB generation projection. Multiple conversations must therefore fit an app-wide continuity model rather than merely adding another list over the existing unbounded loading behavior.

## Candidate Scope

- Add an explicit expand action that focuses one Journey and temporarily hides other Journey items.
- Show bounded recent conversations with title, recency, state and clear active selection.
- Let the Navigator return to the Journey's principal context, resume an eligible conversation or create a new conversation explicitly.
- Define stable conversation identity beneath exact Journey authority.
- Reconcile conversation identity with dedicated thread, generation, Pi session, Mirror conversation, turn journal and persisted projection contracts.
- Preserve existing single-conversation Journey data through an explicit compatibility or migration path.
- Define separately the complete durable transcript, the bounded UI working set, the active Pi model context and the Journey semantics loaded through Mirror.
- Ensure listing or resuming conversations does not require eagerly parsing, projecting or mounting every historical message and terminal-action body.
- Decide whether conversation projections require segmentation, checkpoints, indexed metadata or incremental tail loading while preserving exact evidence and restart recovery.
- Treat explicit creation of a new conversation as an intentional context boundary, not as an automatic response to size, compaction or degraded performance.

## Long-Running Conversation and Compaction Contract

An indefinitely continuing conversation is viable as a product experience only when continuity is not confused with unbounded active materialization:

```text
complete durable history     retained and recoverable
visible conversation window  bounded and incrementally materialized
active Pi context             bounded by the model and Pi compaction
Journey semantics             loaded through Mirror without replaying other transcripts
```

Pi remains the sole authority for model context and automatic compaction. Compaction summarizes older context lossily, keeps a recent tail and appends a compaction entry to the Pi session; it does not delete the complete JSONL history, shrink the Mirror Desktop projection, reduce the rendered transcript or create a new desktop conversation. Mirror Desktop must not reproduce Pi compaction or infer that visually available historical text is still present verbatim in the model's active context.

The desktop may retain complete conversation history while loading only the metadata, recent tail and explicitly requested historical regions needed for the current surface. Older messages, Steering evidence, terminal actions and system surfaces remain durable and addressable even when absent from the mounted DOM. If exact older material must influence a future model turn after compaction, its retrieval and reintroduction require an explicit governed product contract rather than an assumption that the model remembers it.

## Acceptance Direction

Expanding a Journey presents only that Journey and its bounded conversation list. Selecting an eligible conversation resumes the exact associated authority; creating a new conversation leaves prior sessions intact. Collapsing returns to ordinary Journey navigation. Restart preserves identities and selection without making inert or inconsistent history executable.

A long conversation remains complete and navigable without requiring its full transcript or collapsed action outputs to be mounted before the recent conversation surface becomes usable. Automatic Pi compaction preserves model operability without changing desktop conversation identity, silently removing visible history or being treated as a performance mechanism for the UI. Acceptance fixtures must include histories materially larger than the CR029 production case and verify that navigation cost scales with the loaded working set rather than total retained history.

## Open Questions

- Is today's main conversation a permanent principal space, the first list item or a compatibility alias?
- Does each conversation own a dedicated thread with generations, or does the existing thread become a container of conversations?
- Can multiple conversations in one Journey run concurrently, or does this story initially permit only one active run per Journey?
- How are titles, ordering, retention, archival and deletion governed?
- What durable segmentation and index own conversation-list metadata without creating a second execution authority?
- What recent-tail or historical-window unit can preserve variable-height rendering, auto-follow, disclosure, selection, copy and local-reference navigation?
- How is the distinction between complete visible history and compacted model context communicated without exposing implementation noise?
- When exact pre-compaction material is needed again, is it quoted, attached, retrieved or handed into a new conversation, and which authority records that transition?
- Which responsibilities belong to CR029's immediate render correction, this Delivery Story's multi-conversation architecture and a later storage migration?

## Boundary

This story does not flatten conversations into separate Journeys, silently reactivate old generations, delete existing history, expose conversations from another Journey, or assume same-Journey concurrent execution. It does not use Pi compaction as transcript deletion, silently create a conversation when a size threshold is crossed, promise physically unlimited storage or weaken complete-history and evidence durability. Child stories and migration decisions follow explicit refinement after this Delivery Story is pulled.
