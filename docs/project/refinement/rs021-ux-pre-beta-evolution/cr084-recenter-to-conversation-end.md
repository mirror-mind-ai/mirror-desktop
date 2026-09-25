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

## Decision (2026-09-25)

The control is always present and only *emphasized* once the reader has left the latest
turn, rather than appearing and disappearing. Appearing would shift the three sibling
buttons sideways every time the reader scrolls past the threshold; emphasis delivers the
map-recenter feel without the jump.

This required reactive state. `chatAutoFollowRef` is a ref, so nothing re-rendered when the
reader scrolled away from the end. The Navigator chose the reactive option over an
always-neutral button.

## Implementation Evidence (2026-09-25)

- `src/app/conversationAutoFollow.ts` gains `deriveConversationRecenterState`, a pure
  derivation returning `available` and `emphasized`. The control is available wherever the
  Conversation is readable and emphasized only while the reader is away from the end.
- `App.tsx` adds `conversationAwayFromEnd` state, set from the existing `.chat-stream`
  scroll listener next to the auto-follow ref update. React bails out when the boolean is
  unchanged, so a scroll re-renders at most once per direction change. The state resets on
  Journey change and on every explicit return to the end.
- The scroll-to-end sequence moved out of `showConversation` into `revealConversationEnd`,
  now shared by surface entry and the new control, so the two cannot drift apart.
- The button sits in `chat-header-actions` beside search and turn navigation, reusing the
  `menu-button` class, the shared stroke-icon rule and the existing accent emphasis contract
  in both dark and light themes. It carries `aria-label="Return to the latest turn"` and
  `title="Back to latest"`.
- Tests: three cases for the pure derivation, and a header surface test covering the
  control, the single end-reveal routine, the reactive wiring, ordering before the Journey
  menu and both theme contracts.

**Incidental correction.** `centralHeaderActions.test.ts` imported the stylesheet with
`?raw`, which yields an empty string under this config, so its two existing stylesheet
assertions were passing vacuously. It now reads the file like every other test in the
repository, which makes those assertions real as well.

## Validation

- `npm test`: 172 files, 1028 tests green.
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

Navigator homologation pending: scroll up in a long Conversation, confirm the control gains
emphasis, click it and confirm the transcript returns to the latest turn; confirm auto-follow
resumes for the next turn.
