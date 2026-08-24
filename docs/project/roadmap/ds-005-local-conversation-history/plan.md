# Delivery Story Plan — DS-005

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Persisted Journey Conversation

## Objective

Implement persisted Journey conversation continuity in Nautilus Harness: define a versioned local persistence model for one conversation per Journey, add a bounded Tauri app-data storage bridge to save and load the active Journey conversation, restore the last local conversation on app startup, persist Restart Conversation as a fresh empty conversation for that Journey, and preserve guardrails against multiple conversations per Journey, remote sync, Mirror invocation, provider secret persistence, Mission execution, workspace file mutation, or a conversation history browser.

## Scope

This Delivery Story delivers:

- versioned persisted conversation payload;
- local app-data storage bridge in Tauri;
- frontend save/load bridge;
- automatic restoration of the active Journey conversation on app startup;
- automatic persistence of the active Journey conversation after local state changes;
- persistence of Restart Conversation as the fresh state for that Journey;
- visible App card indication that the conversation is local/restored;
- tests for persistence payload validation.

## Non-Goals

This Delivery Story does not:

- create multiple conversations per Journey;
- implement a conversation history browser;
- sync remotely;
- invoke Mirror;
- persist provider secrets;
- execute Missions;
- mutate workspace files;
- add multi-user collaboration.

## Acceptance Behavior

```text
Given the Harness has an active Journey conversation
When the Navigator closes and reopens the app
Then the last local conversation for that Journey is restored

Given the Navigator chooses Restart Conversation
When the conversation resets
Then the fresh conversation is persisted for that Journey
And reopening the app shows the restarted fresh state

And persistence remains local app-data only, with no Mirror sync, no secrets, no Mission execution and no workspace file mutation
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

- send a message in the active Journey conversation;
- close the app window;
- reopen with `npm run tauri -- dev`;
- confirm the message is restored;
- use the Journey menu and choose `Restart Conversation`;
- close and reopen again;
- confirm the fresh opening conversation is restored rather than the previous messages.

## Implementation Contract

- Store only the active Journey conversation payload.
- Use app-data storage, not project/workspace files.
- Keep one persisted conversation per Journey.
- Do not store provider secrets.
- Do not invoke Pi during restore or persistence.
- Do not sync with Mirror or remote storage.
- Do not execute Missions or mutate workspace files.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
