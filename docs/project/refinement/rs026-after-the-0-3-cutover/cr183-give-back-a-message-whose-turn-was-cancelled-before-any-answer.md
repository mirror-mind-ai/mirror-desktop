[< RS026](index.md)

# CR183: Give Back a Message Whose Turn Was Cancelled Before Any Answer

**Status:** done
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02. Cancelling a turn before the agent starts to answer loses
the message the person had just sent.

## What Is Known

On send, `App.tsx` stages the user message in the conversation and clears the composer
(`setVisibleComposerDraft("")`) before the agent answers. A cancellation before any output removes
or abandons the staged turn, and nothing gives the text back. The exact path is located by the
spec.

## Direction

A turn cancelled before the agent produced anything gives its message back to the composer, with
its attachments when that is possible. If the person has already typed something new, the old
message is not lost and the new text is not overwritten.

## Acceptance

Send, cancel during Working: the message is back in the composer, ready to edit or send again.

## Delivered on `main` (`dda86f5`)

- In the cancelled path, a turn with no committed prose, no interrupted fragment and no work is
  *unanswered*: `draftAfterUnansweredCancel` puts the message back in the composer. An empty
  composer (or one still holding the message) gets it alone; text typed since stays, after it.
- Its attachments come back when none are pending, and the composer notice says "Message returned to
  the composer: the turn was cancelled before any answer."
- Covers a cancel before Pi reported `working` (the stored draft still held the message, the screen
  did not) and one after (both were cleared).
- The interrupted turn stays in the conversation as before: the transcript stays the authority, so
  sending the message again may show it twice there. Accepted for now.
- Spec first; mutations caught (5 across CR181 and CR183, all caught).

### Navigator check in development (done, 2026-11-02)

The composer group's check ([RS026](index.md#composer-group-check)): the Navigator confirmed all
three steps in development. Closed; it reaches production with the next alpha.

**Shipped in [v0.3.0-alpha.9](../../../releases/v0.3.0-alpha.9.md)** (2026-11-02).
