[< Roadmap](../index.md)

# DS-002 - Local Session Lifecycle

**Status:** 🟡 Planned

## Outcome

Navigator can start, clear and manage the single in-memory chat session for the active Journey, with explicit lifecycle state and no hidden Pi continuity.

## Why This Matters

The Harness has a clear chat control and Pi uses no-session by default, but the session model is still implicit. The product direction is one conversation per Journey, not multiple arbitrary chats. A usable agent cockpit needs to show the active Journey conversation as a first-class application concept before adding provider settings, run cancellation or persistent history.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-002.US-1 | Visible Journey Conversation State | User Story | Navigator can see that the active Journey has one local ephemeral conversation and whether it has active messages | 🟡 Planned |
| DS-002.US-2 | Start Fresh Journey Conversation | User Story | Navigator can intentionally reset the active Journey conversation to a fresh state without restarting the app | 🟡 Planned |
| DS-002.TS-1 | Journey Conversation State Model | Technical Story | Harness models conversation id, active journey id, created time, message count, dirty state and reset behavior in TypeScript | 🟡 Planned |
| DS-002.TS-2 | Session Boundary Guardrails | Technical Story | Clearing or starting a Journey conversation never persists, deletes external data, invokes Pi or mutates files | 🟡 Planned |

## Done Condition

DS-002 is done when the Harness treats the active Journey chat as one explicit local conversation, presents that state clearly, and supports starting fresh safely.

## Boundary

This delivery does not create multiple conversations per Journey, persist conversation history, resume previous sessions, configure Pi providers, cancel running Pi processes, attach workspace context, mutate files or integrate Nautilus Method semantics.
