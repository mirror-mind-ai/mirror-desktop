[< RS026](index.md)

# CR193: A Cancel Before Pi Takes the Message Still Loses It

**Status:** captured
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

## Open

The exact path is not yet proven. Candidates, to be decided by a spec that drives a live run
cancelled before `agent_start`: the CR183 branch not reached for a cancel in that window, or
reached and its result overwritten afterwards. The 20 to 40 s before Pi takes a message is its own
question (the Mirror context built before the prompt) and may deserve its own CR.

## Acceptance

Send, cancel within the first seconds, before any sign of the agent: the message is back in the
composer with the notice, in development and then in production.
