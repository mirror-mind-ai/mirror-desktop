[< Story](index.md)

# Test Guide — DS-002

## Aggregate Validation

DS-002 passes when Nautilus Harness treats the active Journey chat as one explicit local ephemeral conversation and supports a safe fresh-start lifecycle.

## Automated Validation

Run from the Harness project root:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

Pass condition:

- Journey conversation lifecycle tests pass;
- existing protocol, packet, stream, normalizer and rendering tests pass;
- TypeScript/Vite build succeeds;
- Tauri Rust shell compiles.

## Navigator Validation

Run the app:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm run tauri -- dev
```

Then validate:

- the chat header says there is one conversation for the active Journey;
- the session indicator starts as `Fresh conversation`;
- after sending a message, the indicator becomes `Active conversation`;
- the user message count updates;
- `Start fresh conversation` resets the conversation to the opening message;
- reset does not invoke Pi;
- reset does not persist, delete external data, mutate files, or create another conversation slot.

## Fail Condition

DS-002 fails if:

- the app implies multiple conversations per Journey;
- resetting calls Pi;
- resetting persists/deletes external data;
- message state remains ambiguous after reset;
- existing live Pi/chat behavior breaks.

## Validation Evidence

Pending implementation validation.
