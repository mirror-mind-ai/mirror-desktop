[< Parent](../index.md)

# CV-004.DS-004.US-1 — Restart Conversation

**Status:** 🟡 Planned  
**Type:** User Story

## User Story

As the Navigator, I want to explicitly restart a Journey conversation, so that I receive a fresh dedicated context boundary without deleting the conversation I am leaving.

## Acceptance Behavior

```text
Given the current generation is ready
When I choose Restart Conversation and confirm
Then I see model-free replacement progress
And the current conversation remains authoritative until success
And the new generation opens empty without a generated greeting
```

## Scope

- Enabled Journey menu and restart action.
- Explicit confirmation/cancel behavior.
- Progress, failure and idempotent retry states.
- Fresh situated arrival surface after success.
- Provider-free restart proof.

## Out of Scope

- Silent/automatic restart.
- Deleting or merging conversation history.
- Restart while a turn commit is unresolved.

## Validation

Desktop cancel, success, double-click, failure and retry scenarios with provider-call counting.
