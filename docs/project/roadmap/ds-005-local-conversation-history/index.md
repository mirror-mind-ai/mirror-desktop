[< Roadmap](../index.md)

# DS-005 - Persisted Journey Conversation

**Status:** 🟡 Planned

## Outcome

Harness preserves and restores the single local conversation for each Journey across app restarts.

## Why This Matters

The Harness now treats the active Journey chat as one explicit local conversation. But the conversation still disappears when the app closes. For the cockpit to be usable in daily work, each Journey should reopen with its last conversation intact.

This is not a history browser and not multiple chat threads. It is continuity for the one living conversation attached to a Journey.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-005.US-1 | Restore Journey Conversation | User Story | Navigator reopens the app and sees the last local conversation for the active Journey restored | 🟡 Planned |
| DS-005.US-2 | Persist Restarted Conversation | User Story | Restart Conversation clears the persisted conversation for that Journey and starts fresh | 🟡 Planned |
| DS-005.TS-1 | Journey Conversation Persistence Model | Technical Story | Harness defines the persisted shape for one conversation per Journey with versioned local data | 🟡 Planned |
| DS-005.TS-2 | Tauri Local Storage Bridge | Technical Story | Harness saves and loads Journey conversation data through a bounded local app-data file | 🟡 Planned |
| DS-005.TS-3 | Persistence Guardrails | Technical Story | Persistence remains local, explicit and non-secret, with no Mirror sync, Mission execution or file mutation outside app data | 🟡 Planned |

## Done Condition

DS-005 is done when the active Journey conversation survives app restart, Restart Conversation resets that persisted Journey conversation, and the storage boundary remains local and non-secret.

## Boundary

This delivery persists the single Journey conversation locally. It does not create multiple conversations per Journey, sync remotely, invoke Mirror, persist provider secrets, execute Missions, mutate workspace files, or implement a conversation history browser.
