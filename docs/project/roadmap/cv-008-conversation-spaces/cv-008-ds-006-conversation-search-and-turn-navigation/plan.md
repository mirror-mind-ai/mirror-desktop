# Delivery Story Plan — CV-008.DS-006

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Conversation Search and Turn Navigation

## Objective

Deliver active Conversation search and turn navigation as one Navigator-facing unit, preserving the original DS-006 distinction between bounded text search and compact turn navigation as explicit subscopes inside the plan; keep both read-only, scoped to the exact active Conversation, honest about bounded history, and non-authoritative over transcript persistence.

## Child Work Packages

- CV-008.DS-006.US1

## Scope

- Add an accessible search control to the active Conversation surface.
- Search the materialized content of the exact active Conversation.
- Show honest search state: empty query, zero results, total matches, and current match position.
- Navigate to the previous and next text match without mutating transcript content.
- Visually identify the current match and keep ordinary reading, selection, and copy behavior intact.
- Add a separate accessible turn-navigation control to the active Conversation surface.
- Present a compact ordered list of recognizable conversation turns without model-generated summaries.
- Jump the transcript viewport to the selected turn.
- Preserve predictable keyboard focus when opening, using, and closing search or turn navigation.
- Keep all behavior scoped to the exact active Conversation and honest when history is only partially materialized.

## Non-Goals

- Search across Journeys, persona destinations, or unrelated Conversations.
- Semantic search, embeddings, model-generated ranking, or model-generated turn summaries.
- Mutating transcript content, Mirror append records, Pi session evidence, or Conversation authority.
- Changing turn admission, persistence, restoration, compaction, or delivery semantics.
- Silently loading unbounded historical Segments.
- Redesigning the whole Conversation surface or absorbing adjacent CV-008 Delivery Stories such as Persona Conversation Spaces or Voice Prompt Composition.

## Acceptance Behavior

```text
Given an active Conversation with several visible turns
When the Navigator opens Conversation search, enters a term, and moves through matches
Then the search surface reports honest result state
And the transcript scrolls to the active match
And no transcript content, persistence record, or runtime authority changes.
```

```text
Given an active Conversation with recognizable user and assistant turns
When the Navigator opens turn navigation and selects a turn
Then the transcript scrolls to that turn
And the turn list remains ordered and recognizable without model-generated summaries
And normal reading, selection, copy, and keyboard behavior remain usable.
```

```text
Given a long or partially materialized Conversation
When search or turn navigation reaches the materialized boundary
Then the UI remains explicit that results are scoped to loaded content
And it does not imply complete cross-history search or silently load unbounded history.
```

## Validation Route

Automated checks should cover:

- opening, updating, and closing Conversation search;
- match counting, current match position, next/previous navigation, and zero-result state;
- match highlighting or equivalent current-match identification;
- opening and closing turn navigation;
- ordered turn labels derived from visible role/order metadata rather than model summaries;
- selecting a turn and scrolling/focusing the transcript deterministically;
- preserving exact active Conversation scope and read-only transcript behavior.

Navigator-visible validation route:

1. Open a Conversation with enough visible history to include multiple user and assistant turns.
2. Search for a term that appears more than once and confirm the count/current position are honest while next/previous moves the viewport among matches.
3. Search for a missing term and confirm the zero-result state is explicit.
4. Open turn navigation, choose a recognizable turn, and confirm the transcript jumps to that turn.
5. Confirm no message is sent, edited, appended, retried, or reclassified by either control.
6. Confirm any partially loaded-history boundary is represented honestly if encountered.

E2E is not required for the first implementation unless existing browser-level/unit tests cannot cover the observable behavior. If E2E is skipped, record the waiver with the automated test evidence and Navigator-visible manual validation route.

## Implementation Contract

- Use TDD for behavior changes.
- Keep implementation local to CV-008.DS-006 behavior and its traceable child work package.
- Treat search and turn navigation as read-only projections over materialized Conversation content.
- Do not alter Pi JSONL transcript authority, Mirror synchronization, Conversation restoration, turn admission, or persistence schemas unless a separate approved story is created.
- Do not invoke a model or invent summaries for turn labels.
- Make partial-history/materialized-content limits explicit in user-facing copy when relevant.
- Do not absorb DS-003, DS-005, cross-conversation search, or broader sidebar/navigation redesign.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
