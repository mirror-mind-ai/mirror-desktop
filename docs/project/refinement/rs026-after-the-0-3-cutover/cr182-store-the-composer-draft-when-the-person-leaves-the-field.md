[< RS026](index.md)

# CR182: Store the Composer Draft When the Person Leaves the Field

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02: typing in the chat composer does not feel good. The
Navigator asks to evaluate removing the code that runs on each keystroke and storing the draft when
the person leaves the field.

## What Runs on a Keystroke Today

Since CR149 the textarea is uncontrolled: the browser paints each character without React. Each
`onChange` still calls `setJourneyComposerDraft(…, "input")`, which:

- rebuilds the draft map (`updateComposerDraft`) and schedules its coalesced durable write;
- sets `draftBlank`, which renders `App` when the text goes from empty to not empty, or back;
- resolves the selected conversation entry to compute the draft key.

On blur the drafts are flushed.

## Direction (to measure first)

1. Measure a keystroke in the production build on a long conversation (a trace while typing), to
   know whether the cost is this code, the blank flip's render of `App`, or something else on the
   main thread, as CR149 learned three hypotheses can be wrong.
2. Then: no per-keystroke work besides the browser's. The draft is stored on blur, on send, on a
   change of destination and when the window closes. The send button reads emptiness from the
   element itself.

The trade: a draft typed and never left survives a crash only up to the last blur.

## Acceptance

Typing in a long conversation shows no delay the Navigator can feel, and a draft still survives
switching Journeys, conversations and restarting the app.
