[< RS026](index.md)

# CR193: A Cancel Before Pi Takes the Message Still Loses It

**Status:** done
**Line:** 0.4 · Desktop only

## Friction

Reported by the Navigator on 2026-11-04, in Nautilus for Mirror v0.4.0-alpha.1: cancelling a turn
just sent still loses the message; it does not come back to the composer.
[CR183](cr183-give-back-a-message-whose-turn-was-cancelled-before-any-answer.md) delivered that
return and was checked in production on 2026-11-03 (v0.3.0-alpha.10).

## What Is Known (production state, read only, 2026-11-04)

- Two short cancels today in `mirror-desktop`: runs `2026-11-04T14:10:51` (Mirror Desktop TS,
  cancelled after 25 s) and `2026-11-04T19:38:34` (Nautilus, cancelled after 18 s).
- **Pi never received either message.** The Journey's Pi session has no entry at those times.
- **The message reaches Pi late.** The run of `20:18:17` has its user entry in the Pi session
  at `20:18:55`: 38 s between Send and Pi taking the message. A cancel "just after sending" now
  falls inside this window as a rule, not as an edge.
- **The end of those turns did not complete.** Both journal records stay at `terminal_durable`,
  `cancelled`, `resume_projection`; a long cancel the same day (`20:18`, after Pi worked) reached
  `interrupted`. Every short cancel since 2026-10-29 shows the same stop, including the one of
  2026-11-03 20:25 that may be the CR183 check, so this alone does not separate the cases.
- Neither user message is in the stored conversation, and the composer draft store holds nothing
  for the Journey's thread.
- No App-level test covers CR183: its spec tests `draftAfterUnansweredCancel` alone.

The Navigator adds (2026-11-04): no notice appears; the composer simply stays empty.

## Cause

[CR188](cr188-name-the-persona-at-the-top-of-the-answer.md) (v0.3.0-alpha.12, after CR183 was
checked on alpha.10) writes `✦ Persona: <name>` into the answer when the native side reports the
persona. That report is emitted right after `mirror_context::prepare_turn`, **before Pi is
spawned**, so the answer already holds the marker during the whole window before Pi takes the
message. CR183 asked whether the answer's content was empty; the marker made it non-empty, so a
cancel in that window was read as answered: no return, no notice, and the persona-only answer
stayed in the transcript.

## Delivered on `main` (`{C}`)

- `hasAnswerProse` (`src/domain/composerHandoff.ts`) reads an answer without the CR188 marker, and
  `cancelledBeforeAnyAnswer` holds CR183's decision: cancelled, no work, no interrupted fragment,
  no prose. The cancelled path in `App.tsx` uses both, for the return and for dropping the empty
  answer.
- Spec first (`src/tests/cr193CancelBeforePiTakesTheMessage.test.ts`, 6 tests, failing before the
  change); 5 mutations, all caught. `tsc` clean; 2,632 tests pass. No native change, so `cargo
  test` was not rerun.

### Navigator check in development (done, 2026-11-04)

"funcionou no dev". **Shipped in [v0.4.0-alpha.2](../../../releases/v0.4.0-alpha.2.md)** (2026-11-04).

Checked in production on 2026-11-04 (v0.4.0-alpha.2): "conferi em produção".

## Left Outside This CR

Not part of its acceptance; each needs its own capture if the Navigator wants it pursued.

- The short cancels' journal records stop at `terminal_durable` / `resume_projection` instead of
  reaching `interrupted`. Not the cause of the lost message; to be read separately.
- The 20 to 40 s between Send and Pi taking the message (the Mirror context built before the
  prompt) may deserve its own CR: it is why this window is so easy to hit.

## Acceptance

Send, cancel within the first seconds, before any sign of the agent: the message is back in the
composer with the notice, in development and then in production.
