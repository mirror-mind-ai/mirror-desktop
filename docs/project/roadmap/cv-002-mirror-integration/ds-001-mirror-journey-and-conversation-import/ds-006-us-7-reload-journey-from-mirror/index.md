[< CV-002.DS-001](../index.md)

# DS-006.US-7 — Reload Journey from Mirror

**Status:** ✅ Done
**Type:** User Story

---

## Outcome

Implement DS-006.US-7 by adding an explicit header-menu action to reload only the active Journey conversation from Mirror into the canonical local Harness conversation file. Reuse the existing read-only Mirror import/materialization logic where possible, but narrow it by journey id. Add a Tauri command such as reload_journey_from_mirror(journeyId) that runs a controlled local importer path or internal Rust/Python bridge to read Mirror DB read-only, select the newest non-empty conversation for that Journey, materialize it using the existing persistedJourneyConversation shape including importedActivity, backup the existing local journey-conversations/<journey-id>.json before overwrite, and return a small result summary. Add a frontend storage/helper function and a header menu item, e.g. Reload from Mirror, alongside Restart Conversation. When the user triggers it, show loading/success/error feedback, close the menu, do not invoke Pi, and after success reload the active conversation into the chat. The action must be explicit, affect only selectedJourney, never import all Journeys, never mutate Mirror/Journey/workspace files, never create multiple local conversations per Journey, and never persist secrets/env/provider config. Add tests for the importer/reload transformation and app-visible behavior where practical; validate by changing a Mirror terminal conversation, clicking Reload from Mirror for that Journey, confirming only that Journey file updates and a backup is created, then running npm test, npm run build and cargo check.

## Story Statement

As a user,
I want to Reload Journey from Mirror,
So that I can receive the value of this story.

## Acceptance Behavior

```text
Given the starting state needed for Reload Journey from Mirror
When the Navigator exercises Reload Journey from Mirror
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Reload Journey from Mirror as an observable slice.
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
