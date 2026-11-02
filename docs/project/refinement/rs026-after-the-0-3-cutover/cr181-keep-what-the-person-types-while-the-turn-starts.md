[< RS026](index.md)

# CR181: Keep What the Person Types While the Turn Starts

**Status:** in_progress
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02. After a turn is sent the app shows Working while it waits
for the agent. If the person types in the composer then, the text is erased at the moment the chat
starts filling with what the agent is doing.

## Hypothesis (not yet reproduced)

The composer's text is replaced by the stored draft whenever the visible draft key changes: the
effect in `App.tsx` that runs on `selectedConversationSpace` calls
`setVisibleComposerDraft(composerDraftsRef.current[draftKey] ?? "")`. If the conversation space
changes when the run starts (a Desktop conversation id appears, or the space moves from the
Journey's workspace to the conversation), the key changes, the draft under the new key is empty and
the typed text is replaced by nothing. A remount of the input would have the same effect. The spec
reproduces it before any change.

## Direction

A change of key that is not a change of destination chosen by the person does not touch the
composer. The typed text stays visible and is stored under the key the conversation now has.

## Acceptance

Typing during Working and then during the agent's first output, the text stays in the composer and
is still there after the turn ends.

## Cause (found 2026-11-02)

Not the draft-key effect of the hypothesis. On send the visible composer is cleared while the stored
draft keeps the sent message, so a crash before admission does not lose it. When Pi reported
`working`, `generatePacket` called `persistOwnerComposerDraft("", true)`, which cleared the stored
draft **and the visible composer**, by then holding only what the person typed since sending.

## Delivered on `main` (`dda86f5`)

- At agent start only the stored draft changes: `draftAfterAdmission`
  (`src/domain/composerHandoff.ts`) removes it if it is still the sent message (compared trimmed, as
  the message is sent) and keeps it otherwise. The visible composer is not touched.
- The guard in `journeyRuntimeIntegration.test.ts` that asserted the old line now asserts the new
  one; its intent, the stored copy lasting until agent start, is unchanged.
- Spec first (`cr181cr183ComposerHandoff.test.ts`); mutations caught. Full suites: 2508
  TypeScript, 457 Rust.

### Navigator check in development (owed)

The composer group's check ([RS026](index.md#composer-group-check)).
