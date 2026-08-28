[< DS-007](../index.md)

# DS-007.US-3 — Conversation Attachment Provenance

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want historical user turns to show which bounded context accompanied them,
So that I can understand an answer's evidence without confusing old references with current filesystem authority.

## Outcome

A completed or interrupted user turn renders inert attachment provenance beside its message: display name, Journey-relative source identity, captured size and digest state. Reload and restart preserve that evidence, but historical entries offer no implicit resend, reopen or reread authority.

## Acceptance Behavior

```text
Given a user turn sent with bounded context
When I revisit the conversation after settlement or app restart
Then I can identify the snapshots that accompanied that turn
And those historical records cannot attach themselves to a new draft or access the current file
```

## Scope

- Extend persisted Harness conversation messages with optional versioned attachment provenance.
- Render provenance for completed, cancelled, failed and recovered turns where staging occurred.
- Preserve readable relative identity and integrity metadata without unrestricted absolute paths.
- Parse and render legacy messages without attachment fields unchanged.
- Keep provenance inert: no automatic reopen, refresh, resend or provider action.
- Distinguish Harness turn attachments from imported Mirror attachment-reference activity.

## Out Of Scope

- Persisting a general attachment library.
- Treating provenance as current file content.
- Reopening source files from historical messages.
- Upload/download or remote sharing.
- Reusing attachment sets as templates.

## Validation

Navigator sends a turn with context, observes provenance in the transcript, restarts Harness and confirms it remains; legacy conversations remain readable, imported references stay distinct and no historical control grants renewed file authority.
