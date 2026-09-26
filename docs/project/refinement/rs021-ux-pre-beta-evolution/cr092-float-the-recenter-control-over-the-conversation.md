[< RS021](index.md)

# CR092: Float the Recenter Control Over the Conversation

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

CR084 delivered the recenter affordance as a fourth button inside `chat-header-actions`,
permanently present and merely *emphasized* once the reader leaves the latest turn. That
decision was taken to avoid shifting its three sibling header buttons sideways whenever the
reader crossed the bottom threshold.

The cost of that compromise is now visible in daily use. The control occupies header space
at all times, including the common case where the Conversation is already at its end and the
action is meaningless. It also sits far from where the gesture actually happens: the reader
is scrolling in the transcript, near the right edge, and the recovery affordance is at the
top of the window.

## Experience Intent

The reference experience is the recenter control of a maps application. While you pan
around, the map drifts away from where you actually are; a small anchored control appears
and offers to sync the view back to the territory. It is a point of support, not an
instrument: it shows up exactly when the view has drifted, it is where your hand already is,
and it asks for nothing when the view is already correct.

The Conversation behaves the same way. The end of the Conversation is the territory. When
the surface drifts away from it, the control offers the return.

This intent carries a deliberate tolerance: the feel matters more than the precision. The
control does not need pixel-exact placement or a perfectly tuned reveal threshold. It needs
to be reliably there when the reader has drifted, comfortably reachable, and quiet when it
has nothing to offer. Reviewers should judge it as a feel, not as a measurement.

## Expected Behavior

The recenter control leaves the top action bar and becomes a floating affordance anchored to
the bottom-right corner of the Conversation surface, near the scrollbar and comfortably
clear of it.

It is visible only when the Conversation surface is not positioned at its end. Any change
that takes the surface away from the end — reader scrolling, turn navigation, search result
focus, restoring a Conversation at a non-end position, or content growth while auto-follow
is off — makes it appear. Returning to the end makes it disappear.

Appearing and disappearing is now acceptable precisely because the control no longer lives
among siblings it could displace. The visibility trade-off that produced the CR084 emphasis
compromise no longer applies, and the emphasis state can be retired — presence itself
becomes the signal, which is what the map metaphor asks for.

## Proposed Scope

- Move the control out of `chat-header-actions` and render it as an overlay positioned
  against the `.chat-stream` bottom-right corner. `.chat-stream` is already
  `position: relative`, so it can host the overlay directly.
- Offset the control so it sits comfortably clear of the scrollbar gutter under both overlay
  and always-visible scrollbars, given the existing `padding: 16px 34px 24px` of
  `.chat-stream`. A generous fixed offset is preferable to measuring the scrollbar at
  runtime.
- Give the appearance and disappearance a short transition, so the control arrives and
  leaves rather than blinking. A drifting reader should not experience it as flicker.
- Replace the CR084 `available` / `emphasized` pair with a single visibility derivation in
  `src/app/conversationAutoFollow.ts`, driven by the same `conversationAwayFromEnd` state and
  surface readiness the control already consumes.
- Confirm every route that moves the surface away from the end updates
  `conversationAwayFromEnd`. The `.chat-stream` scroll listener covers reader scrolling;
  programmatic jumps from search and turn navigation must be verified rather than assumed.
- Keep `revealConversationEnd` as the single end-reveal routine shared with surface entry,
  and keep `aria-label="Return to the latest turn"`.
- Give the floating control an appearance that reads as an overlay rather than a header
  button, with legible contrast over transcript content in both dark and light themes.
- Ensure it does not cover the last turn's content, the Composer, or any hover/copy
  affordance inside message blocks.
- Keep it reachable by keyboard, and keep it out of the tab order while hidden.

## Acceptance

- The control is absent from the top action bar.
- With the Conversation at its end, no floating control is rendered.
- Scrolling away from the end reveals it; returning to the end hides it.
- Navigating to a turn or a search result away from the end reveals it.
- Clicking it returns the surface to the latest turn and hides it.
- It does not sit on top of the scrollbar and does not interfere with dragging it.
- Its appearance and disappearance read as a calm transition rather than a flicker, including
  when the reader scrolls back and forth across the threshold.
- Contrast and focus visibility hold in dark and light themes.
- Existing auto-follow behavior during active runs is unchanged.
- Tests cover the visibility derivation, the overlay placement contract and the retirement
  of the header placement.

## Exclusions

- No change to search or turn navigation semantics.
- No change to auto-follow thresholds, including the 48px bottom tolerance. Tuning the
  reveal threshold is not part of this CR; the existing near-bottom notion is good enough for
  the intended feel.
- No new automatic scrolling: the surface still moves only on explicit invocation or the
  existing auto-follow rules.
- No unread-message counter or badge on the control.

## Dependencies

Builds directly on CR084 (`done`,
`refinement/rs021-cr084-recenter-to-end`) and supersedes its header placement and emphasis
decision. It should land on a baseline that already contains CR084.

Touches the same surface as CR081, CR082 and CR083, which remain `captured`; no ordering
dependency between them is claimed here.

## Open Decisions

- Whether the control shows an unconditional "go to end" meaning or distinguishes "new
  content arrived below" — this CR proposes the former and excludes the latter. The map
  metaphor supports that choice: a recenter control offers the return, it does not report
  what changed while you were away.
- Whether the overlay is also suppressed for `mirror_history` Conversation spaces, where the
  header control was previously disabled rather than hidden.

## Boundaries

- Priority and ordering within RS021 remain a Navigator decision; this capture claims no
  position ahead of the other captured CRs.
- Capture only. No selection, implementation, commit, push, merge, release or Beta promotion
  is authorized by this document.
