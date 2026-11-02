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

## Evaluation (2026-11-02)

Per keystroke the renderer does little: a ref, a copy of the small draft map, a debounced durable
write, and a render of the whole `App` only when the text goes from empty to not empty, or back
(`draftBlank`, which enables Send). Storing on blur removes all of it but the render, which Send
still needs, unless Send reads the element itself.

CR149 learned that a keystroke's delay can come from the main thread being busy with anything,
and its decisive instrument was `sample` on the running app while the Navigator typed. If the delay
comes from there, moving the draft to blur will not be felt. So the measurement comes first:

1. Production, a long conversation, no turn running: the Navigator types continuously for 30 s while
   the Driver samples the app and its WebContent process.
2. The same, during a turn.

The repair is chosen from what the samples show.

### Development evidence (2026-11-02)

Typing through a long turn in development, the Navigator felt no delay. Development's conversation
is 80 KB; production's `mirror-desktop` is 31,761 KB. The delay follows the conversation's size,
not the keystroke's own code, which is the same in both. The sampling session is shared with
[CR185](cr185-keep-the-output-surface-moving-while-the-agent-works.md).
