# Delivery Story Plan — DS-004

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Agent Run Control

## Objective

Implement agent run control in Nautilus Harness: introduce an explicit live run state model, show whether the local Pi invocation is idle/running/completed/failed/cancelled, allow the Navigator to cancel the active local Pi process, allow retry of the last agent request after failure or cancellation, prevent concurrent live runs, and preserve guardrails that cancellation/retry do not delete chat, persist state, execute Missions, mutate files, invoke Mirror, or create background agents.

## Scope

This Delivery Story delivers:

- TypeScript `AgentRunState` model;
- visible run status in the right panel;
- `Cancel run` control for active live Pi invocation;
- `Retry last` control after failure or cancellation;
- Tauri `cancel_pi_invocation` command;
- process state tracking that prevents overlapping local Pi invocations;
- stream mapping for cancellation events;
- tests for run state transitions and cancellation event mapping.

## Non-Goals

This Delivery Story does not:

- persist run state;
- persist conversation history;
- add background agents;
- retry automatically;
- cancel mock streams;
- execute Missions;
- mutate files;
- invoke Mirror;
- add workspace context attachment.

## Acceptance Behavior

```text
Given the Harness is idle
When the Navigator invokes live Pi
Then the App panel shows the run as running
And concurrent live invocations are disabled

Given a live Pi invocation is running
When the Navigator clicks Cancel run
Then the active local process is cancelled
And the chat remains visible
And the run state becomes cancelled

Given the last run failed or was cancelled
When the Navigator clicks Retry last
Then Harness starts a new run with the last user request
And no external files are deleted, persisted or mutated
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

- invoke live Pi and confirm the App card shows `Run: running`;
- confirm `Invoke live Pi` is disabled while running;
- cancel a long or safe-test run and confirm status becomes cancelled;
- confirm chat is not deleted;
- confirm `Retry last` becomes available after cancellation or failure;
- retry and confirm a new run starts with the last request.

For a controllable long process, temporarily set provider command/args to a slow shell-free command if available on the machine, or validate cancellation with live Pi on a longer prompt.

## Implementation Contract

- Do not run process commands through a shell.
- Cancel only the currently tracked local Pi process.
- Prevent concurrent local Pi invocations.
- Retry only after failure or cancellation.
- Do not persist run state.
- Do not delete chat on cancel.
- Do not execute Missions, mutate files or invoke Mirror.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
