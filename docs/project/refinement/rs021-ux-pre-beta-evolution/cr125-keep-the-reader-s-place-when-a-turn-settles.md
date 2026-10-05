[< RS021](index.md)

# CR125: Keep the Reader's Place When a Turn Settles

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr125-conversation-scroll-anchor`

## Friction

The Navigator submits a turn and reads the agent's output as it arrives. When the turn ends, the
Conversation surface slides upward on its own, sometimes as far as earlier turns, and the output
the Navigator was reading is no longer where their eyes were.

Reported from direct production use on 2026-10-05, on `0.2.0-alpha.36`.

## What the code does at the instant a turn ends

Read-only diagnosis, 2026-10-05. The settlement instant is the moment `selectedRuntimeBusy` turns
false and `isStreaming` flips. Four things happen in the same React commit, three of which change
the height of content the reader is looking at or sitting below.

### 1. The previous turn collapses

`classifyAssistantTurnProximity` (`src/app/turnProximity.ts`) labels the latest assistant message
`latest_completed` and **every earlier one `historical`**. While the run was live, the previous
turn was the latest completed one and was rendered in full. The instant the run ends, the new turn
takes that label and the previous turn becomes `historical`.

`AgentTurn` renders `historical` differently (`src/app/AgentTurn.tsx:232-250`): its Agent Actions
and System Surfaces regions are replaced by a **closed `<details>`** whose state starts at
`useState(false)`. The entire action trail of the previous turn — every tool card, every surface —
disappears into one summary line, in one commit, directly above the turn the Navigator is reading.

This is deterministic and it is the largest height change in the transition.

### 2. The current turn's trail is re-sourced

While live, the transcript feeds the current run's `AgentTurn` the live `runtimeProjection`.
At settlement `runtimeProjectionMessageId` no longer matches, and the same part is fed
`index.terminalEvidenceByAssistantMessageId.get(messageId)?.projection` instead
(`src/app/ConversationTranscript.tsx:424-431`). The renderer is the same (`LiveRuntimeActivity`),
so this is a modest change, but the status row and the per-action labels switch from
`running` to settled forms (`src/app/LiveRuntimeActivity.tsx:71`, `:156`).

### 3. The WebView does not anchor scroll position

Mirror Desktop renders in WKWebView. **WebKit does not implement CSS scroll anchoring**, the
mechanism Chromium and Firefox use to keep the visible content still when layout above it changes.
Nothing in the codebase compensates: no `overflow-anchor`, no manual anchoring, nothing that reads
an element's position before a commit and restores it after.

So when (1) removes height above the reader, `scrollTop` stays numerically where it was and the
content under the reader's eyes moves. For a reader who had scrolled up a little inside the current
answer, the text they were reading travels upward and out of view. For a reader pinned to the
bottom, the browser clamps `scrollTop` to the new, smaller maximum, and the viewport is refilled
from above: a short final answer at the bottom and, filling the rest of the screen, the collapsed
summary of the previous turn and the turns before it. Either experience reads as "the surface
slid up, even to earlier turns".

### 4. The only scroll management is follow-the-end

`App.tsx:2363-2380` is the sole automatic scroll. It fires on `[messages, isStreaming,
runtimeProjection]` and calls `chatEnd.scrollIntoView({ block: "end" })` — `auto` while
streaming, **`smooth` once streaming ends** — but only while `chatAutoFollowRef` is true, which
`nextConversationAutoFollow` (`src/app/conversationAutoFollow.ts`) keeps true only while the
reader is within 48 px of the bottom. It is the right behaviour for a reader who is following the
end. It does nothing for a reader who is not, and it is not the cause of the upward travel: it
only ever scrolls toward the end.

## What was ruled out

- **Extent growth at the frontier.** The hypothesis that settlement delivers the stored ledger
  (thousands of messages) to a surface showing the current chapter was checked and is false:
  `finalizeCompletedTurn` publishes `settled = input.projection`, the same window the surface
  already holds (`src/app/turnFinalizationCoordinator.ts:311-336`). The ledger merge in
  `projectionForStorage` feeds the save only, never the surface.
- **Elements mounting above.** The "Load earlier chapters" control and the reload status line are
  not set on the settlement path (`setHistoricalSegmentCount` and `setJourneyReloadStatus` have no
  callers there).
- **Explicit navigation scrolls.** `scrollToMessage` (`block: "center"`) is reached only from
  search, the turn navigator and the chapter index, all user-initiated.
- **CR024's loading-surface replacement** is a different transition (a full unmount) and was fixed.

## Prior art

CR024 investigated the same instant for flicker, raised and then disproved a "runtime contraction
and smooth auto-follow" hypothesis for *that* symptom, and explicitly left auto-follow semantics
alone "unless independent evidence establishes a separate defect". This is that evidence: not
flicker but displacement, and the contraction is real and identified — it is the proximity
reclassification of the previous turn.

CR084 and CR092 built the follow-the-end and recenter behaviours. They solve the case where the
reader *wants* the end. This CR is about the reader who is somewhere else, or who is at the end
and has the floor moved under them.

## Candidate directions

Not decided. Recorded for the Navigator.

- **Anchor the reader across the settlement commit.** Before a commit that can change proximity
  or re-source the trail, record the first message element intersecting the viewport and its
  offset from the top; after layout, restore `scrollTop` so that element sits at the same offset.
  A `useLayoutEffect` on the same dependencies as the follow effect, active only while
  `chatAutoFollowRef` is false. This is manual scroll anchoring — exactly what the WebView lacks —
  and it is general: it protects the reader against every height change above them, not only
  the one found here. The follow-the-end case is unchanged.
- **Do not collapse a turn while it is on screen.** Defer `latest_completed → historical` for the
  previous turn until the reader has navigated away or opened a new turn. Smaller, and it removes
  the dominant cause, but the trail re-sourcing (2) still moves things, and any future height
  change above the reader would reintroduce the problem. Could be combined with the first.
- **Keep the newly settled turn where it was for a reader at the bottom.** When the maximum
  shrinks, anchor on the current turn's first element instead of the end, so the answer the reader
  was watching stays at the same screen position and the collapsed previous turn is what moves.
  This is the first direction applied to the follow case as well, and it is the one that answers
  the report most literally.

## What a capture would settle

A frame-rate capture on `Mirror Desktop Dev` of one tool-bearing turn settling, with the reader
(a) pinned to the bottom and (b) scrolled a screen up inside the answer, would show which of the
two experiences above the Navigator is reporting and would measure the height the previous turn
loses. Not required to start: the mechanism is established from the code, and the first direction
is correct under both experiences.

## Plan (2026-10-05)

Direction 1 chosen by the Navigator: anchor the reader across the settlement commit. Manual scroll
anchoring, supplying what WKWebView does not implement.

### Why anchoring only the reader who is *not* following is the whole fix

Checked while planning, and it narrows the work rather than leaving it partial. When the reader is
pinned to the bottom, `scrollTop` is at its maximum. If content above collapses by 500 px, the
scroller's maximum drops by 500 px and the browser clamps `scrollTop` down by the same 500 px — while
the content below the collapse also moved up by exactly 500 px. The two cancel, and the content under
the reader's eyes does not move:

```text
before   element at content y 1250, scrollTop 1200  -> 50 px below the viewport top
after    element at content y  750, scrollTop  700  -> 50 px below the viewport top
```

The defect needs `scrollTop` to be *free* to stay still while the content moves, which happens only
when the reader has scrolled away from the bottom. So the case the Navigator is protected in is the
case the clamp already handles, and the case that breaks is exactly the one this CR anchors.

A reader inside the 48 px tolerance is a rounding-level exception: the clamp under-compensates by
their distance from the bottom, and follow-the-end then takes them to the end deliberately.

### Slices

**D1 — a pure anchoring rule.** New `src/app/conversationScrollAnchor.ts`:

- `selectConversationScrollAnchor(measurements)` → the topmost message still at least partly in view
  and its offset from the viewport top, or `undefined` when nothing is measurable.
- `conversationScrollAnchorCorrection(anchor, measurements)` → how far that message has travelled
  since it was recorded, or `undefined` when the message is gone or the travel is negligible.

No DOM. The decisions are the testable part; measuring is three lines at the call site.

**D2 — record and restore in the Conversation surface.** In `App.tsx`:

- a ref holding the current anchor, recorded in the existing `onScroll` handler, which is where the
  reader states where they are;
- a `useLayoutEffect` on the same content dependencies as the follow effect that applies the
  correction **before paint**, so the displacement is never shown and then undone.

Guarded three ways: it does nothing while `chatAutoFollowRef` is true (follow-the-end owns that
reader), nothing while `isStreaming` (the live turn grows *below* the reader, so there is nothing to
correct and this keeps per-chunk measurement out of the stream), and nothing when the anchored
message is no longer present (a guess is worse than leaving the reader where they are).

`useLayoutEffect` runs before `useEffect`, so the correction lands before the follow effect, which is
already a no-op in this branch.

**D3 — pin the wiring, not only the rule.** The recurring failure in this codebase is a correct
domain rule wired wrongly, so the guard-level tests assert the call site: that the correction is
applied in a layout effect rather than an effect, that it is skipped while following and while
streaming, and that the anchor is recorded on scroll.

### Files

- `src/app/conversationScrollAnchor.ts` (new)
- `src/app/App.tsx` (anchor ref, `onScroll` recording, layout effect, `useLayoutEffect` import)
- `src/tests/conversationScrollAnchor.test.ts` (new)

### Acceptance

- A reader scrolled away from the end keeps the same content at the same screen offset across a turn
  settling, including the commit where the previous turn collapses to its summary.
- A reader at the end still follows the end, with the existing behaviour and the existing smooth
  transition.
- Nothing about *what* is rendered changes: no proximity rule, no transcript composition, no
  disclosure default.
- No measurement work is added to the streaming path.

### Validation

- `src/tests/conversationScrollAnchor.test.ts` for the rule and the wiring.
- Existing `conversationAutoFollow.test.ts` and `floatingRecenterControl.test.ts` must stay green
  unchanged — if either needs editing, the follow-the-end contract was altered and that is out of
  scope.
- Full gates: `tsc`, vitest, `cargo test`, `cargo check --locked`, `npm run build`, `roadmap:check`.

### Exclusions

- **Direction 2 is not taken.** The previous turn still collapses the instant the run ends. Anchoring
  makes the collapse harmless to the reader's position, and suppressing it would be a change to what
  the surface says rather than to where it rests.
- **Direction 3 is not needed**, for the reason established above: the bottom-pinned case is already
  stable under the clamp. Recorded so it is not re-opened without new evidence.
- **No native change**, no persistence change, no change to Journey, run or Mirror authority.
- Anchoring is deliberately not applied to the other scrollers in the app. This is the surface that
  changes height under a reader; a general utility would be speculative.

## Implementation and closure (2026-10-05)

All three slices delivered as planned, test-first.

**D1.** `src/app/conversationScrollAnchor.ts` holds both decisions and no DOM.
`selectConversationScrollAnchor` returns the topmost message whose `bottom > 0` — a message
straddling the top edge is what the reader's eyes are on, so the recorded offset is often negative.
`conversationScrollAnchorCorrection` returns `current.top - anchor.viewportOffset`, applied as
`scrollTop += correction`, and returns nothing when the message is absent or the travel is under
`ANCHOR_CORRECTION_MIN_PX = 1` — layout rounds, and a scroller fights a sub-pixel nudge.

**D2.** `App.tsx` gained `chatAnchorRef`, a `measureChatAnchors` helper that reads
`[data-conversation-message-id]` rects against the scroller's own top, a recording line in the
existing `onScroll` handler, and a `useLayoutEffect` on `[messages, isStreaming]` placed immediately
before the follow effect. Three declines, each for its own reason:

| reader | declined because |
|---|---|
| following the end | follow-the-end owns them, and the clamp already keeps them stable |
| watching a live turn | the turn grows *below* them; also keeps measuring off the streaming path |
| anchored message gone | a guess moves them somewhere they never chose; the next scroll re-records |

After a successful correction the effect returns without re-measuring: the anchor is back at the
offset it records, so it still describes the reader, and a second layout pass would be waste.

**D3.** Six guards assert the wiring, not only the rule — that the correction runs in
`useLayoutEffect` rather than `useEffect`, that both the following and the streaming readers are
declined, that the anchor is recorded inside the scroll handler, and that the correction reaches the
scroller. Eight guards cover the rule, including upward travel at the measured shape of the defect
(a 500 px collapse yielding a −500 correction) and downward travel from height added above.

**The follow-the-end contract was not touched.** `conversationAutoFollow.test.ts` and
`floatingRecenterControl.test.ts` are green with no edit, which was the planned signal that this
change stayed where it belongs.

**Gates:** `tsc` clean, **232 test files / 1,673 tests**, `cargo test` **257 passed / 3 ignored**,
`cargo check --locked`, build clean, roadmap READY.

## Closure review

**Proportionality: proportional.** One new 60-line pure module, one layout effect, one line in an
existing handler, one import. No native change, no persistence change, no renderer change, and
nothing about *what* the transcript says. The transition that caused the report — the previous turn
collapsing into its summary — still happens exactly as before; it simply no longer moves the reader.

**Debt review: follow_up.** Two items, neither selected.

**The collapse itself is unexamined as a design choice.** The instant a turn ends, the previous
turn's entire action trail becomes one line. Anchoring makes that harmless to the reader's position,
but whether a turn should lose its detail the moment it stops being the newest is a product question
this CR deliberately did not answer (direction 2, not taken).

**Anchoring is local to the Conversation.** Fourteen other scrollers exist. This is the one that
changes height under a reader, so a shared utility would have been speculative; if a second surface
needs it, the module is already pure and portable.

**No field verification.** Scroll position is not durable, so this cannot be replayed against the
store the way the settlement CRs were. It rests on 14 unit and source guards and on the mechanism
being established from the code rather than guessed. The observable event is the Navigator reading a
turn to its end from somewhere other than the bottom and staying there.

## Dependencies

Independent. Touches the transcript's rendering of proximity (CR111's run grouping is where the
proximity is read) and the auto-follow effect (CR084, CR092). Must not change what is rendered,
only where the viewport rests while it changes.
