[< RS021](index.md)

# CR092: Float the Recenter Control Over the Conversation

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr092-floating-recenter-control`

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

## Decisions (2026-09-27)

**Unconditional "go to end".** No new-content indicator, no badge, no count. A recenter control
offers the return; it does not report what changed while you were away. Reporting is a different
product with a different surface.

**The `mirror_history` exclusion stays.** Reading the code turned this from a preference into a
structural fact: `.chat-stream` carries `hidden` in that space, so the container that hosts the
overlay does not render at all. The exclusion remains in the derivation anyway, so the intent is
explicit rather than an accident of an ancestor being hidden. Extending the affordance to the
Mirror history surface would be a different capability on a different surface, and would need its
own verification.

## Planning Finding: the overlay cannot live inside the scroller

The capture assumed `.chat-stream` could host the overlay directly because it is already
`position: relative`. That is wrong, and it is the one thing that shapes the delivery.

`.chat-stream` is the scrolling container. An absolutely positioned child of a scrolling box is
positioned against that box's padding box and **scrolls with the content**, so the control would
drift up and out of view exactly when the reader scrolls away from the end — the moment it is
supposed to appear.

The overlay therefore needs a positioned ancestor that is not the scroller. `.chat-shell` is a
grid whose middle row is the stream, so wrapping the stream in a `.chat-stream-viewport` gives
the overlay a stable anchor without disturbing the grid's row structure. The viewport carries the
same `hidden` condition as the stream, so it never occupies a row when the conversation surface
is not showing.

## Verified: programmatic jumps already update the state

The capture required this be verified rather than assumed. It is covered: search and turn
navigation scroll by `scrollIntoView` on the message element inside `.chat-stream`
(`ConversationTranscript.tsx`), which fires the same `onScroll` handler that feeds
`conversationAwayFromEnd`. No additional wiring is needed, and no new source of truth is
introduced.

## Implementation Evidence (2026-09-27)

**Visibility.** `deriveConversationRecenterState` returns `{ visible }` instead of
`{ available, emphasized }`. One boolean, fed by the `conversationAwayFromEnd` state that already
existed. The emphasis contract is gone from the derivation, from `App.tsx` and from both theme
blocks in the stylesheet.

**Placement.** A new `.chat-stream-viewport` wraps the scroller and hosts the control as its
sibling. The viewport is `position: relative` with `min-height: 0`, and carries the same `hidden`
condition as the surface, now extracted as `conversationSurfaceHidden` so the two cannot drift.
The control is `position: absolute` at `bottom: 20px; right: 26px` — a generous fixed offset that
clears a visible macOS scrollbar without measuring anything at runtime, which a test pins by
asserting no scrollbar arithmetic exists in the source.

**Transition.** The control stays mounted and toggles a `visible` class, so leaving gets a
transition too; conditional rendering would have made the exit a blink. `opacity` and a 6px
`translateY` over 140ms, with `pointer-events` and the tab order following visibility —
`aria-hidden` plus `tabIndex={-1}` while it has nothing to offer. `prefers-reduced-motion` drops
the motion and keeps the presence, since presence is the signal.

**Action.** `onClick` calls `revealConversationEnd()` directly rather than `showConversation()`.
The control only exists inside the surface it would otherwise re-select, so the narrower call is
the correct one, and the single end-reveal routine stays shared with surface entry.

### An exclusion that resolved itself

The capture worried about the control covering the last turn's content. The visibility rule
removes the concern: the control is present only while the reader is away from the end, so what
sits beneath it is mid-transcript rather than the latest turn, and at the end — where the overlap
would have mattered — it is not there at all.

## Validation

- `npm test`: 179 files, 1121 tests green (178 / 1112 before this CR).
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

New coverage: a dedicated `floatingRecenterControl.test.ts` with seven cases pinning the
structural constraint (the control is a sibling of the scroller, never a descendant), the fixed
scrollbar offset, the viewport hiding with the surface, the transition and its reduced-motion
fallback, the tab-order and pointer behavior, the narrowed click action, and the light-theme
overlay contract. The derivation tests were rewritten for `{ visible }`, including a case
asserting `emphasized` and `available` are gone rather than merely unused. The header test now
pins the control's *absence* from `chat-header-actions`.

## Dev Homologation (2026-09-27)

Run by the Navigator on the Dev channel, built from this branch, on Journey `sandbox-pet-store`.

Validated: the control appears at the bottom-right once the reader leaves the end and leaves on
return; crossing the threshold repeatedly reads as arriving and leaving rather than flickering;
turn navigation and search jumps reveal it, confirming the programmatic-jump path; the light
themes read it as an overlay; a scrollbar drag beside it is not intercepted; it is absent from the
tab order at the end and reachable with visible focus when present, with `Enter` returning to the
end; and it does not appear on a `mirror_history` Conversation however far it is scrolled.

The Navigator accepted the feel, which is the criterion this CR asked to be judged on.

## Closure

**Proportionality review: proportional.** One derivation reduced from two booleans to one, one
wrapper element, one stylesheet block, and the removal of a contract that no longer had a reason
to exist. No durable state, no schema, no Rust, no Mirror interaction, and no new dependency. The
change removes more concept than it adds: CR084's emphasis state existed only to substitute for a
presence the header could not offer.

**Debt review: `follow_up`.** Two items, both about coverage rather than design.

The acceptance line "existing auto-follow behavior during active runs is unchanged" was not
exercised. The homologation script did not include an active run, and the Navigator's acceptance
covers what was scripted. Reading supports it — `nextConversationAutoFollow` and the
`content_updated` effect were untouched, and the derived behavior is coherent: while auto-follow
holds the stream at the end the control stays absent, and scrolling up during a run turns
auto-follow off and brings it in, which is what a reader would want. But that is reasoning, not
observation. Ordinary use exercises it immediately, and the failure mode would be visible rather
than silent.

Long conversations were not genuinely tested. The longest active Dev generation carries 30
messages; the 390-message Conversations exist only as Mirror history, which is precisely the
surface where the control does not appear. Nothing in the implementation scales with transcript
length — the control is positioned against the viewport, not the content — so the risk is low, but
it is unobserved.

Commit, merge, publication and release remain separate Navigator decisions.

## Boundaries

- Priority and ordering within RS021 remain a Navigator decision.
- No commit, push, merge, release or Beta promotion is authorized by this document.
