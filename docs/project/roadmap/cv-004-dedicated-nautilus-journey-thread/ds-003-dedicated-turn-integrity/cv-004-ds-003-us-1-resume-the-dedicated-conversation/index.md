[< Parent](../index.md)

# CV-004.DS-003.US-1 — Resume the Dedicated Conversation

**Status:** ✅ Done
**Type:** User Story

## User Story

As the Navigator, I want returning to a Journey to restore its dedicated conversation directly, so that I resume the same Nautilus continuity without choosing or importing another conversation.

## Acceptance Behavior

```text
Given a ready active generation has complete native Pi turns
When I restart the desktop or return to the Journey
Then complete turns from that exact Pi session appear once in native order
And no conversation picker or external activity import is required
```

## Scope

- Exact active-session inspection on selection, restart and focus recovery.
- Complete-turn-only restoration and duplicate suppression.
- Loading/checking feedback that does not block projection browsing.
- External Pi and Mirror activity remains outside the transcript.

## Out of Scope

- Restarting into generation 2; DS-004.
- Legacy UI removal; DS-005.

## Validation

Desktop restart and Journey-switch validation with exact native session evidence and no duplicate transcript projection.
