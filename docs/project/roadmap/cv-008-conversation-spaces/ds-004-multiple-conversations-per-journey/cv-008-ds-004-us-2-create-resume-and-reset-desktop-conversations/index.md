[< Parent](../index.md)

# CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to create a Conversation, resume an exact existing one and reset its agent context deliberately,
so that separate lines of work remain independent while technical context replacement stays honest and recoverable.

## Outcome

`New conversation` provisions one model-free thread and ready generation without changing prior Conversations. Resume validates complete Conversation authority. `Reset agent context` preserves the same Conversation and prior generation while activating a fresh generation only after explicit fresh-context disclosure and complete provisioning.

## Acceptance Behavior

```text
Given a ready Journey
When the Navigator creates a new Conversation
Then no model, greeting or prompt is produced
And one distinct thread and generation appear only after exact validation
And prior Conversations and drafts remain unchanged

Given a ready Conversation
When the Navigator chooses Reset agent context and confirms the warning
Then the prior generation remains preserved
And one fresh generation becomes active in the same Conversation without replay
And the UI does not claim prior messages remain verbatim in active Pi context

Given Conversation A owns the Journey lease
When the Navigator visits Conversation B
Then B remains readable and draft-editable but cannot Send or mutate lifecycle
And events, Steering, cancellation and settlement remain owned by A
```

## Scope

- Model-free Conversation creation and atomic ready publication.
- Exact Conversation selection/resumption.
- Per-Conversation draft and selected-state persistence.
- `Reset agent context` naming, disclosure and generation replacement.
- Existing Journey-level one-lease and global four-Journey admission contracts.

## Out Of Scope

- Two concurrent turns in one Journey.
- Automatic reset, prompt replay or transcript injection.
- New Conversation creation after compaction without an explicit action.
- Provider-generated title or greeting.

## Validation

Test every authority mismatch and provisioning failure, selection changes during active callbacks, duplicate create/reset confirmation, restart recovery and prior-generation preservation. Natural validation creates multiple disposable Conversations and proves one same-Journey lease with independent drafts.
