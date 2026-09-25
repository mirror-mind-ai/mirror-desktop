[< RS021](index.md)

# CR084: Recenter to Conversation End

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr084-recenter-to-end`

## Problem

The conversation surface often ends up positioned in the middle of the transcript, requiring manual scrollbar work to return to the latest turn. The top action area already contains search/navigation controls; it could also offer a map-like recenter action that returns to the conversation end.

## Expected Behavior

A top control near search returns the conversation surface to its latest/end position quickly and predictably, similar to a map recenter button.

## Proposed Scope

- Add a visible control near existing top actions that scrolls the active conversation to the bottom/latest turn.
- Decide when the control is visible or emphasized based on whether the user is away from the end.
- Preserve existing auto-follow and scroll behavior during active runs.
- Ensure keyboard accessibility and light/dark contrast.

## Acceptance

- Clicking the control returns the active conversation surface to the end.
- It works for long conversations, restored conversations and active runs.
- It does not fight intentional reading position except when explicitly invoked.

## Exclusions

- No change to search or turn navigation semantics.
- No automatic forced scrolling while the user is reading historical content.
