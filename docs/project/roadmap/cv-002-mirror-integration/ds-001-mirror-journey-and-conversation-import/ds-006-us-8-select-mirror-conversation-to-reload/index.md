[< CV-002.DS-001](../index.md)

# DS-006.US-8 — Select Mirror Conversation to Reload

**Status:** ✅ Done
**Type:** User Story

---

## Outcome

Implement DS-006.US-8 by changing Reload from Mirror from a direct latest-conversation import into a two-step explicit selection flow. Add backend support to list Mirror conversations for a given Journey from the Mirror DB read-only, returning title, conversation id/code, last updated timestamp and message count, ordered by last updated descending. Add backend support to materialize a specific selected Mirror conversation id into the active Journey canonical local conversation file using the existing persistedJourneyConversation/importedActivity shape and existing backup-before-overwrite path. Update the export/import script or add focused functions/commands so selected-conversation materialization reuses current transformation logic but does not rewrite the registry and does not import all Journeys. Replace the header Reload from Mirror action with opening a modal/screen for the selected Journey. The modal must show loading/error/empty states, list candidate conversations with title, code/id, last update and message count, allow cancel without changing local state, and allow selecting/confirming one conversation to load. On confirm, show busy/wait cursor, close or update the modal, materialize only that selected conversation, reload the visible chat, and show success/failure feedback. Preserve boundaries: explicit only, Mirror read-only, no Pi invocation, no continuous sync, one local canonical conversation per Journey, no secrets/env/provider config persisted. Add tests for Mirror conversation listing/selection transformation, selected materialization, and UI helper behavior where practical. Validate with npm test, npm run build, cd src-tauri && cargo check, plus a Navigator route using a Journey with multiple Mirror conversations: cancel has no effect, selecting a non-latest conversation loads that selected conversation and creates a backup.

## Story Statement

As a user,
I want to Select Mirror Conversation to Reload,
So that I can receive the value of this story.

## Acceptance Behavior

```text
Given the starting state needed for Select Mirror Conversation to Reload
When the Navigator exercises Select Mirror Conversation to Reload
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Select Mirror Conversation to Reload as an observable slice.
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
