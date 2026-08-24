[< Parent](../index.md)

# DS-006.TS-3 — Journey Preference Persistence

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Outcome

Implement DS-006.TS-3 by persisting non-secret local Journey sidebar preferences to user app data. Define a versioned JourneyPreferencePersistence shape containing pinnedJourneyIds, activeJourneyId, recentJourneyIds and journeyListOrder. Store it in a local file such as journey-preferences.json under the same Tauri app data directory as journey-registry.json and journey-conversations. Add Tauri commands load_journey_preferences and save_journey_preferences, plus frontend storage helpers. On startup, load preferences before deriving the sidebar, merging with safe defaults and discarding invalid/missing Journey ids when the registry is available. On preference changes caused by pin/unpin, order selection, active Journey selection and recents updates from message sends, save the preferences. Preserve existing boundaries: no secrets, no provider/model credentials, no arbitrary env vars, no Mirror writes, no workspace mutation, no Pi invocation, no continuous sync. Keep the persisted file local-only and human-readable JSON. Add domain tests for preference parsing/defaulting/sanitization and app/storage tests where practical. Validate by changing pins/order/active Journey/recents, restarting the app, and confirming the sidebar restores those preferences. Run npm test, npm run build and cargo check.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Journey Preference Persistence,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.TS-3
When the Navigator exercises DS-006.TS-3
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver DS-006.TS-3 as an observable slice.
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
