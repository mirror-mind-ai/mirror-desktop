[< Parent](../index.md)

# CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations

**Status:** 🟢 Done
**Type:** User Story

## User Story

As the Navigator,
I want the Journey workspace to remain my default while I can create an additional Conversation, resume an exact child and reset an active surface's agent context deliberately,
so that the root experience remains familiar, separate lines of work stay independent and technical context replacement stays honest.

## Outcome

The Journey root thread remains unchanged and outside the child catalog. `New conversation` provisions one model-free child thread and ready generation without changing the root or prior children. An empty child opens the shared Conversation-detail start surface with four English starting points that only fill its own composer. Resume validates complete child authority. `Reset agent context` preserves the selected root-or-child continuity and prior generation while activating a fresh generation only after explicit fresh-context disclosure and complete provisioning.

## Acceptance Behavior

```text
Given the Navigator clicks a Journey in ordinary mode
Then its existing root transcript and composer remain unchanged
And the root never appears as an ordinary child Conversation

Given a ready Journey
When the Navigator creates a new child Conversation
Then no model, greeting or prompt is produced
And one distinct thread and generation appear only after exact validation
And the root workspace, prior children and drafts remain unchanged

Given the new child has no first turn
When it is selected
Then a dedicated start surface and its composer appear
And no synthetic transcript message is created

Given a ready Conversation
When the Navigator chooses Reset agent context and confirms the warning
Then the prior generation remains preserved
And one fresh generation becomes active in the same Conversation without replay
And the UI does not claim prior messages remain verbatim in active Pi context

Given the root workspace or child Conversation A owns the Journey lease
When the Navigator visits the root or child Conversation B
Then the visited surface remains readable and draft-editable but cannot Send or mutate lifecycle
And events, Steering, cancellation and settlement remain owned by A
```

## Scope

- Root Journey workspace preservation outside the child catalog.
- Model-free child Conversation creation and atomic ready publication.
- Exact root-or-child selection and child resumption.
- Shared Conversation-detail start surface for an empty child.
- Confirmed, recoverable Desktop-child deletion from its row context menu.
- Per-root/Conversation draft and selected-state persistence.
- `Reset agent context` naming, disclosure and generation replacement.
- Existing Journey-level one-lease and global four-Journey admission contracts.

## Out Of Scope

- Two concurrent turns in one Journey.
- Automatic reset, prompt replay or transcript injection.
- New Conversation creation after compaction without an explicit action.
- Provider-generated title or greeting.

## Validation

Test every authority mismatch and provisioning failure, selection changes during active callbacks, duplicate create/reset confirmation, restart recovery and prior-generation preservation. Natural validation creates multiple disposable Conversations and proves one same-Journey lease with independent drafts.
