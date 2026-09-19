[< CV-008](../index.md)

# CV-008.DS-006: Conversation Search and Turn Navigation

**Status:** ✅ Done

## Outcome

The Navigator can search for text inside the visible Conversation and move directly among matching passages, or open a compact turn navigator and jump to a specific user-agent exchange without manually scrolling through the full transcript.

## Why This Matters

Long Conversations preserve valuable context but become difficult to revisit. Search answers “where did we mention this?”, while turn navigation answers “where did this exchange happen?”. Together they make durable Conversation history usable as an active working surface rather than a transcript that can only be traversed linearly.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-008.DS-006-US-1 | Search Within the Active Conversation | User Story | A magnifying-glass control opens bounded text search for the active Conversation, reports matches and moves through them without changing Conversation authority. | ✅ Done |
| CV-008.DS-006-US-2 | Navigate Conversation Turns | User Story | A separate control opens a compact turn navigator that identifies ordered exchanges and moves the transcript to the selected turn. | ✅ Done |

## Acceptance Direction

From an open Conversation, the Navigator can activate search, enter a term, see the number and current position of matches and move forward or backward through results. A separate turn-navigation control opens a compact window or popover with recognizable ordered turns; choosing one scrolls the Conversation to that exchange and restores keyboard focus predictably. Both tools remain scoped to the exact active Conversation, handle long and partially materialized history honestly and preserve normal reading, selection and copy behavior.

## Open Questions

- Does search cover only materialized transcript content or request bounded historical Segments as the Navigator advances?
- Which message content is searchable: visible prose only, or also code blocks, reasoning summaries, tool output and attachment provenance?
- How are case sensitivity, diacritics, whole words, zero results and wrapped matches represented?
- What concise label identifies a turn in the navigator without model-generated summarization?
- Is the turn surface a popover, dialog or persistent side panel, and how does it behave on narrow windows?
- How do search highlighting and turn selection interact with transcript virtualization, lazy history and automatic follow behavior?

## Boundary

This story does not search across Journeys or Conversations, mutate transcript content, invoke a model, create semantic search, invent turn summaries, change Conversation authority or load unbounded history silently. Search and navigation are read-only projections over the exact active Conversation. Child work is refined before implementation.

## Done Condition

The Delivery Story is done when the Navigator can use distinct accessible controls to find text and jump among turns in the active Conversation, including long bounded histories, with deterministic keyboard behavior, honest result state and no change to persistence, runtime authority or transcript content.
