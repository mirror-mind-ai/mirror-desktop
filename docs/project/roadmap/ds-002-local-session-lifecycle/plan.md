# Delivery Story Plan — DS-002

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Local Session Lifecycle

## Objective

Implement the local Journey conversation lifecycle in Nautilus Harness: model one ephemeral conversation per active Journey, show visible conversation state in the desktop UI, let the Navigator start a fresh conversation for the active Journey safely, and preserve guardrails that resetting the Journey conversation does not persist, delete external data, invoke Pi, mutate files, create multiple conversations per Journey, or integrate Nautilus Method semantics.

## Scope

This Delivery Story delivers:

- a TypeScript `JourneyConversation` state model;
- one in-memory conversation for the active Journey;
- visible conversation state in the chat header;
- a fresh/active conversation status indicator;
- a safe `Start fresh conversation` action;
- tests for conversation creation, summarization and reset behavior.

## Non-Goals

This Delivery Story does not:

- create multiple conversations per Journey;
- persist or reopen conversation history;
- configure Pi providers;
- cancel running Pi processes;
- attach workspace context;
- invoke Pi while resetting;
- delete external data;
- mutate files from the app;
- integrate Nautilus Method semantics.

## Acceptance Behavior

```text
Given the Harness is open on a Journey
When the chat is fresh
Then the header shows this Journey has a fresh local conversation

Given the Navigator sends messages
When the conversation has user messages
Then the header shows an active conversation and message count

Given the Navigator clicks Start fresh conversation
Then the active Journey conversation resets to the opening state
And the reset does not invoke Pi, persist, delete external data, mutate files, or create multiple conversations for the Journey
```

## Validation Route

Run from `harness/`:

```bash
npm test
npm run build
cd src-tauri && cargo check
```

Navigator validation:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm run tauri -- dev
```

Then:

- confirm the chat header shows one conversation for the active Journey;
- send one message;
- confirm the status changes from fresh to active and message count updates;
- click `Start fresh conversation`;
- confirm the chat returns to the opening state and no Pi call is made.

## Implementation Contract

- Keep state in memory only.
- Do not introduce persistence or history.
- Do not create multiple conversation slots per Journey.
- Do not change Pi invocation semantics.
- Do not integrate Nautilus Method semantics.
- Do not mutate external files from the app.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
