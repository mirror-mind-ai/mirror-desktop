[< CV-008](../index.md)

# CV-008.DS-004 - Multiple Conversations per Journey

**Status:** 🟡 Planned

## Outcome

The Navigator can expand one Journey into a focused sidebar state, inspect its recent conversations, resume a specific conversation and create a new one while every session remains inside the same Journey authority.

## Why This Matters

One durable conversation preserves continuity but eventually mixes distinct lines of work. A Journey is larger than one transcript. The user needs separate conversational sessions without losing the shared territory, and must be able to move among them without confusing history with active execution authority.

## Candidate Scope

- Add an explicit expand action that focuses one Journey and temporarily hides other Journey items.
- Show bounded recent conversations with title, recency, state and clear active selection.
- Let the Navigator return to the Journey's principal context, resume an eligible conversation or create a new conversation explicitly.
- Define stable conversation identity beneath exact Journey authority.
- Reconcile conversation identity with dedicated thread, generation, Pi session, Mirror conversation, turn journal and persisted projection contracts.
- Preserve existing single-conversation Journey data through an explicit compatibility or migration path.

## Acceptance Direction

Expanding a Journey presents only that Journey and its recent conversations. Selecting an eligible conversation resumes the exact associated authority; creating a new conversation leaves prior sessions intact. Collapsing returns to ordinary Journey navigation. Restart preserves identities and selection without making inert or inconsistent history executable.

## Open Questions

- Is today's main conversation a permanent principal space, the first list item or a compatibility alias?
- Does each conversation own a dedicated thread with generations, or does the existing thread become a container of conversations?
- Can multiple conversations in one Journey run concurrently, or does this story initially permit only one active run per Journey?
- How are titles, ordering, retention, archival and deletion governed?
- How do Mirror conversations and context compaction map to the desktop conversation list?

## Boundary

This story does not flatten conversations into separate Journeys, silently reactivate old generations, delete existing history, expose conversations from another Journey, or assume same-Journey concurrent execution. Child stories and migration decisions follow explicit refinement after this Delivery Story is pulled.
