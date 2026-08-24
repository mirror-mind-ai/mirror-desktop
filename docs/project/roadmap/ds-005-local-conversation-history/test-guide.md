[< Story](index.md)

# Test Guide — DS-005

## Aggregate Validation

DS-005 passes when the single conversation for the active Journey is saved locally and restored across app restarts.

## Automated Validation

Run from the Harness project root:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

Pass condition:

- persisted conversation payload tests pass;
- existing run control, provider, conversation, protocol, packet, stream, normalizer and rendering tests pass;
- TypeScript/Vite build succeeds;
- Tauri Rust shell compiles.

## Navigator Validation

Run the app:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm run tauri -- dev
```

Validate persistence:

- send a message in the active Journey conversation;
- close the app window;
- reopen the app;
- confirm the message is restored;
- confirm the App card shows `Conversation: local`.

Validate restart persistence:

- open the Journey menu;
- click `Restart Conversation`;
- confirm the chat returns to the opening message;
- close and reopen the app;
- confirm the previous message does not return.

## Fail Condition

DS-005 fails if:

- conversation state disappears after app restart;
- Restart Conversation does not persist the fresh state;
- multiple conversations per Journey are introduced;
- persistence writes to workspace/project files instead of app data;
- persistence stores provider secrets;
- restore invokes Pi, executes Missions, mutates files or invokes Mirror.

## Validation Evidence

Initial local validation passed:

```text
npm test
10 test files passed, 33 tests passed

npm run build
tsc and vite build succeeded

cargo check
Tauri Rust shell compiled successfully
```
