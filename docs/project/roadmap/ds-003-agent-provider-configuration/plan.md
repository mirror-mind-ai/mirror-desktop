# Delivery Story Plan — DS-003

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Agent Provider Configuration

## Objective

Implement local agent provider configuration in Nautilus Harness: define a TypeScript provider configuration model for Pi command, arguments, stdin mode and safe test mode; show the active provider settings in the app; allow current-session editing of bounded invocation settings; pass explicit configuration through the Tauri invocation bridge; and preserve guardrails against secret storage, automatic invocation, broad filesystem authority, Mission execution, file mutation or Mirror integration.

## Scope

This Delivery Story delivers:

- TypeScript provider configuration model for command, args, stdin mode and safe test mode;
- visible Settings entry in the top chat header;
- dedicated Settings dialog for Agent Provider configuration;
- editable current-session command and arguments;
- safe test mode that uses `cat` with stdin;
- explicit frontend-to-Tauri provider configuration payload;
- removal of hidden environment-only invocation defaults from the normal app path;
- validation for empty or unsafe provider command values;
- tests for provider configuration behavior.

## Non-Goals

This Delivery Story does not:

- persist provider configuration;
- store secrets;
- add non-Pi provider routing;
- invoke Pi automatically;
- grant broad filesystem authority;
- execute Missions;
- mutate files automatically;
- invoke Mirror;
- add cancellation or retry behavior.

## Acceptance Behavior

```text
Given the Harness is open
Then the right panel shows the active agent provider configuration
And the default command is Pi with safe no-session arguments

Given the Navigator edits command, args or stdin mode
When the Navigator applies provider settings
Then the next explicit live invocation uses those settings

Given the Navigator enables safe test mode
When provider settings are applied
Then the active provider becomes cat via stdin for the current app session

And configuration changes do not persist secrets, invoke Pi automatically, execute Missions, mutate files or invoke Mirror
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

- click `Settings` in the top chat header;
- inspect the Agent Provider settings window;
- confirm default command is `pi` with `--print --no-tools --no-context-files --no-session --provider openai-codex --model gpt-5.4-mini`;
- enable Safe test mode and apply settings;
- send a live invocation and confirm diagnostics show `cat` rather than `pi`;
- reset provider settings and confirm defaults return;
- confirm nothing invokes automatically while editing settings.

## Implementation Contract

- Provider configuration is current-session only.
- Do not persist settings or secrets.
- Do not use shell command strings. Pass command and args directly to Rust process invocation.
- Live invocation remains explicit through the existing button.
- Safe test mode must force `cat` plus stdin.
- Configuration must not expand filesystem authority, Mission execution or Mirror integration.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
