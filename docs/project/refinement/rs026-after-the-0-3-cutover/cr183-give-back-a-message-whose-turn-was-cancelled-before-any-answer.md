[< RS026](index.md)

# CR183: Give Back a Message Whose Turn Was Cancelled Before Any Answer

**Status:** captured
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
