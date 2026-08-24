[< Story](index.md)

# Test Guide — DS-003

## Aggregate Validation

DS-003 passes when the Harness shows and uses explicit current-session provider configuration for live local invocation.

## Automated Validation

Run from the Harness project root:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

Pass condition:

- provider configuration tests pass;
- existing conversation, protocol, packet, stream, normalizer and rendering tests pass;
- TypeScript/Vite build succeeds;
- Tauri Rust shell compiles.

## Navigator Validation

Run the app:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm run tauri -- dev
```

Validate:

- the top chat header contains `Settings`;
- clicking `Settings` opens a dedicated settings window with `Agent provider`;
- default visible command is `pi`;
- default args include `--print --no-tools --no-context-files --no-session --provider openai-codex --model gpt-5.4-mini`;
- enabling `Safe test mode (cat)` and clicking `Apply provider settings` changes the visible mode to safe test command;
- invoking live after safe test mode streams the prompt through `cat`, proving the explicit config reached Tauri;
- clicking `Reset provider` restores Pi defaults;
- editing settings alone does not invoke Pi;
- no secrets are requested or persisted.

## Fail Condition

DS-003 fails if:

- provider settings are hidden or only environment-driven;
- editing settings invokes Pi automatically;
- safe test mode does not use `cat` through stdin;
- the Tauri bridge ignores frontend configuration;
- configuration persists secrets;
- Mission execution, file mutation or Mirror integration is introduced.

## Validation Evidence

Initial local validation passed:

```text
npm test
8 test files passed, 27 tests passed

npm run build
tsc and vite build succeeded

cargo check
Tauri Rust shell compiled successfully
```
