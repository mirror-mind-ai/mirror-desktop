[< RS026](index.md)

# CR188: Name the Persona at the Top of the Answer

**Status:** in progress
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-03: the agent's answer shows the persona's id at its end; it
belongs at the start.

## What Is Known

- The surface already has a place for it: the speaker row above each answer
  (`inferMessageSpeaker`, `conversationPresentation.ts`). It is filled from a signature on the
  answer's **first** line, or from a `persona_context` event (`withCertifiedPersona`).
- On the 0.2 line the Mirror skill emitted that event and signed first. On 0.3 neither happens:
  the Core's doorman tells the model `sign ◇ <persona>`, and the model signs **last**. In
  production's `mirror-desktop` session, of 810 final answers 93 sign last, 15 first, 702 not at
  all; the session carries no Mirror context event.
- So the row says "Agent", and the `◇ persona` line stays in the body, at its end.
- The Desktop already knows the persona before the model answers: `deliverMirrorContext` returns
  the session's persona after delivery, and `mirror_context::prepare_turn` drops it.

## Direction

The Desktop names the persona from what the Core delivered, not from what the model wrote: the
turn's persona travels from `prepare_turn` as the existing `persona_context` event, and the speaker
row shows it. A trailing `◇ <persona>` line is stripped from the body like a leading one. The Core
is not changed.

The Navigator joined to it the Desktop's part of CR189; the replay, redone with each context paired
to its own prompt, showed there is none (CR189, moved to RS022).

## Built (2026-11-03, `78cbe33`)

- `mirror_context::prepare_in` keeps the persona of a delivery that reached the turn (a persona id
  only); `persona_event_line` writes it as the Mirror context event `piProcessStream` already maps
  to `persona_context`, and the native start emits it before Pi starts, only when the context file
  goes to Pi.
- `conversationPresentation`: a last-line `◇ <persona-id>` names the speaker and is stripped from
  the body; a diamond inside the text, or a last line that is not a persona id, is left alone.
- Tests first (`src/tests/cr188PersonaAtTheTop.test.ts`, Rust `cr188_*`): three cases failed before
  the change; the two passing guards keep ordinary text out and pin the event line. Six mutations,
  all caught (one after tightening the source guard). Suites: TS 2,523, Rust 469 plus 10 ignored.

Not known yet: whether a live turn's persona survives a reload for an answer the model did not sign
(32 of 126 since the cutover). Signed answers are read from their own text, so they do.

Check owed: the falsifier, in development, then in production with the next release.

## Falsifier

In production, every answer in a Mirror-mode Journey shows its persona above the text, and no
`◇` line at its end.
