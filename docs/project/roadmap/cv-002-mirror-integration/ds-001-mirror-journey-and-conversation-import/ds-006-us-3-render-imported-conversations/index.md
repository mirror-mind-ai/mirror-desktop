[< CV-002.DS-001](../index.md)

# DS-006.US-3 — Render Imported Conversations

**Status:** 🟡 Planned
**Type:** User Story

---

## Outcome

Implement DS-006.US-3 by rendering imported Mirror conversation richness in the Harness UI without changing the canonical local data model. The current chat already renders normalized user/assistant messages; add a safe, readable imported activity/provenance rendering path for conversation.importedActivity.events. Prefer an inline timeline or collapsible activity blocks interleaved near related messages when related.messageId is available, with a compact fallback activity section for unlinked events. Render key event kinds distinctly: ariad_surface as preserved monospaced surface blocks or collapsible panels, metadata/llm calls as compact provenance chips/details, attachment_reference as inert reference cards, operation_event/command/tool_call/error as terminal-like but inert blocks with status/severity. Do not execute any imported tool/command, do not use dangerouslySetInnerHTML, do not render private chain-of-thought, do not add new import behavior, do not mutate Mirror/workspace, and do not invoke Pi. Keep the first slice usable rather than exhaustive: importedActivity should be visible and navigable, but deep polish can remain future refinement. Add tests for safe rendering of activity events, Ariad surface preservation as text, absence of HTML execution, and grouping with related messages where practical. Validate visually with Journeys known to contain importedActivity such as nautilus and nautilus-harness, confirming the UI shows terminal-like activity/provenance beyond normal chat messages while existing chat remains readable.

## Story Statement

As a user,
I want to Render Imported Conversations,
So that I can receive the value of this story.

## Acceptance Behavior

```text
Given the starting state needed for Render Imported Conversations
When the Navigator exercises Render Imported Conversations
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Render Imported Conversations as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not silently absorb adjacent roadmap work.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
